package storage

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"cloud.google.com/go/storage"
	"google.golang.org/api/option"
)

// Uploader sube un archivo y devuelve su URL (usado para upload directo desde el backend).
type Uploader interface {
	Upload(ctx context.Context, name string, r io.Reader, contentType string) (string, error)
}

// URLSigner genera URLs firmadas V4 para que el cliente suba/descargue directamente desde GCS.
type URLSigner interface {
	UploadURL(ctx context.Context, objectName, contentType string) (string, error)
	DownloadURL(ctx context.Context, objectName string) (string, error)
}

// New devuelve el Uploader apropiado según las variables de entorno.
func New() Uploader {
	bucket := os.Getenv("GCS_BUCKET_NAME")
	creds := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
	if bucket != "" && creds != "" {
		return &GCSUploader{bucket: bucket, credsFile: creds}
	}
	dir := os.Getenv("LOCAL_UPLOAD_DIR")
	if dir == "" {
		dir = "./uploads"
	}
	baseURL := os.Getenv("LOCAL_UPLOAD_BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8082/uploads"
	}
	os.MkdirAll(dir, 0755)
	return &LocalUploader{dir: dir, baseURL: baseURL}
}

// NewSigner devuelve el URLSigner apropiado según las variables de entorno.
func NewSigner() URLSigner {
	bucket := os.Getenv("GCS_BUCKET_NAME")
	creds := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
	if bucket != "" && creds != "" {
		return &GCSSigner{bucket: bucket, credsFile: creds}
	}
	baseURL := os.Getenv("LOCAL_UPLOAD_BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8082/uploads"
	}
	return &LocalSigner{baseURL: baseURL}
}

// ---------------------------------------------------------------------------
// GCS — upload directo desde backend
// ---------------------------------------------------------------------------

type GCSUploader struct {
	bucket    string
	credsFile string
}

func (g *GCSUploader) Upload(ctx context.Context, name string, r io.Reader, contentType string) (string, error) {
	client, err := storage.NewClient(ctx, option.WithCredentialsFile(g.credsFile))
	if err != nil {
		return "", fmt.Errorf("gcs client: %w", err)
	}
	defer client.Close()

	wc := client.Bucket(g.bucket).Object(name).NewWriter(ctx)
	wc.ContentType = contentType
	wc.CacheControl = "public, max-age=86400"
	if _, err = io.Copy(wc, r); err != nil {
		wc.Close()
		return "", fmt.Errorf("gcs write: %w", err)
	}
	if err = wc.Close(); err != nil {
		return "", fmt.Errorf("gcs close: %w", err)
	}
	return fmt.Sprintf("https://storage.googleapis.com/%s/%s", g.bucket, name), nil
}

// ---------------------------------------------------------------------------
// GCS — signed URLs V4 (el cliente sube/descarga directamente)
// ---------------------------------------------------------------------------

type GCSSigner struct {
	bucket    string
	credsFile string
}

// UploadURL genera una signed URL PUT válida por 15 minutos para subir desde el frontend.
func (g *GCSSigner) UploadURL(ctx context.Context, objectName, contentType string) (string, error) {
	client, err := storage.NewClient(ctx, option.WithCredentialsFile(g.credsFile))
	if err != nil {
		return "", fmt.Errorf("gcs client: %w", err)
	}
	defer client.Close()

	url, err := client.Bucket(g.bucket).SignedURL(objectName, &storage.SignedURLOptions{
		Method:      "PUT",
		ContentType: contentType,
		Expires:     time.Now().Add(15 * time.Minute),
		Scheme:      storage.SigningSchemeV4,
	})
	if err != nil {
		return "", fmt.Errorf("gcs sign upload url: %w", err)
	}
	return url, nil
}

// DownloadURL genera una signed URL GET válida por 1 hora para reproducir desde el frontend.
func (g *GCSSigner) DownloadURL(ctx context.Context, objectName string) (string, error) {
	client, err := storage.NewClient(ctx, option.WithCredentialsFile(g.credsFile))
	if err != nil {
		return "", fmt.Errorf("gcs client: %w", err)
	}
	defer client.Close()

	url, err := client.Bucket(g.bucket).SignedURL(objectName, &storage.SignedURLOptions{
		Method:  "GET",
		Expires: time.Now().Add(1 * time.Hour),
		Scheme:  storage.SigningSchemeV4,
	})
	if err != nil {
		return "", fmt.Errorf("gcs sign download url: %w", err)
	}
	return url, nil
}

// ---------------------------------------------------------------------------
// Local — fallback para desarrollo sin GCS
// ---------------------------------------------------------------------------

type LocalUploader struct {
	dir     string
	baseURL string
}

func (l *LocalUploader) Upload(_ context.Context, name string, r io.Reader, _ string) (string, error) {
	dst := filepath.Join(l.dir, name)
	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return "", err
	}
	f, err := os.Create(dst)
	if err != nil {
		return "", err
	}
	defer f.Close()
	if _, err = io.Copy(f, r); err != nil {
		return "", err
	}
	return l.baseURL + "/" + name, nil
}

type LocalSigner struct {
	baseURL string
}

func (l *LocalSigner) UploadURL(_ context.Context, objectName, _ string) (string, error) {
	return l.baseURL + "/" + objectName, nil
}

func (l *LocalSigner) DownloadURL(_ context.Context, objectName string) (string, error) {
	return l.baseURL + "/" + objectName, nil
}

// ---------------------------------------------------------------------------
// HTTP handlers
// ---------------------------------------------------------------------------

// RegisterRoutes registra todos los endpoints HTTP de storage en el mux.
func RegisterRoutes(mux *http.ServeMux, up Uploader, signer URLSigner) {
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads"))))
	mux.HandleFunc("/admin/upload", makeDirectUploadHandler(up))
	mux.HandleFunc("/admin/upload-url", makeSignedUploadURLHandler(signer))
	mux.HandleFunc("/admin/download-url", makeSignedDownloadURLHandler(signer))
}

// POST /admin/upload — upload directo desde backend (fallback / posters pequeños)
func makeDirectUploadHandler(up Uploader) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, 500<<20)
		if err := r.ParseMultipartForm(32 << 20); err != nil {
			http.Error(w, "request too large: "+err.Error(), http.StatusRequestEntityTooLarge)
			return
		}
		file, header, err := r.FormFile("file")
		if err != nil {
			http.Error(w, "campo 'file' requerido", http.StatusBadRequest)
			return
		}
		defer file.Close()

		objectName := buildObjectName(header)
		ct := detectContentType(header)
		url, err := up.Upload(r.Context(), objectName, file, ct)
		if err != nil {
			http.Error(w, "upload failed: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"url":%q,"object_name":%q}`, url, objectName)
	}
}

// POST /admin/upload-url — el backend genera una signed URL y el frontend sube directo a GCS
// Body: { "filename": "video.mp4", "content_type": "video/mp4" }
// Response: { "upload_url": "https://...", "object_name": "videos/..." }
func makeSignedUploadURLHandler(signer URLSigner) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var body struct {
			Filename    string `json:"filename"`
			ContentType string `json:"content_type"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Filename == "" {
			http.Error(w, `body requerido: {"filename":"video.mp4","content_type":"video/mp4"}`, http.StatusBadRequest)
			return
		}

		ext := filepath.Ext(body.Filename)
		ct := body.ContentType
		if ct == "" {
			if ct = mime.TypeByExtension(ext); ct == "" {
				ct = "application/octet-stream"
			}
		}
		objectName := fmt.Sprintf("%s/%d-%s%s",
			classifyAsset(ext),
			time.Now().UnixMilli(),
			sanitizeName(strings.TrimSuffix(filepath.Base(body.Filename), ext)),
			ext,
		)

		uploadURL, err := signer.UploadURL(r.Context(), objectName, ct)
		if err != nil {
			http.Error(w, "error generando URL: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{
			"upload_url":  uploadURL,
			"object_name": objectName,
		})
	}
}

// GET /admin/download-url?object=videos/1234-nombre.mp4
// Response: { "download_url": "https://...", "object_name": "videos/..." }
func makeSignedDownloadURLHandler(signer URLSigner) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		objectName := r.URL.Query().Get("object")
		if objectName == "" {
			http.Error(w, "query param 'object' requerido", http.StatusBadRequest)
			return
		}
		downloadURL, err := signer.DownloadURL(r.Context(), objectName)
		if err != nil {
			http.Error(w, "error generando URL: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{
			"download_url": downloadURL,
			"object_name":  objectName,
		})
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func buildObjectName(h *multipart.FileHeader) string {
	ext := filepath.Ext(h.Filename)
	base := sanitizeName(strings.TrimSuffix(filepath.Base(h.Filename), ext))
	return fmt.Sprintf("%s/%d-%s%s", classifyAsset(ext), time.Now().UnixMilli(), base, ext)
}

func classifyAsset(ext string) string {
	switch strings.ToLower(ext) {
	case ".jpg", ".jpeg", ".png", ".webp":
		return "posters"
	case ".mp4", ".mkv", ".mov", ".avi":
		return "videos"
	default:
		return "misc"
	}
}

func sanitizeName(s string) string {
	return strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			return r
		}
		return '-'
	}, s)
}

func detectContentType(h *multipart.FileHeader) string {
	if ct := h.Header.Get("Content-Type"); ct != "" && ct != "application/octet-stream" {
		return ct
	}
	if ct := mime.TypeByExtension(strings.ToLower(filepath.Ext(h.Filename))); ct != "" {
		return ct
	}
	return "application/octet-stream"
}
