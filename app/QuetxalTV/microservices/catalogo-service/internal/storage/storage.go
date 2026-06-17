package storage

import (
	"context"
	"encoding/base64"
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
	"google.golang.org/api/iamcredentials/v1"
	"google.golang.org/api/option"
)

// Uploader sube un archivo y devuelve su URL (upload directo desde backend).
type Uploader interface {
	Upload(ctx context.Context, name string, r io.Reader, contentType string) (string, error)
}

// URLSigner genera URLs firmadas V4 para que el cliente suba/descargue directamente desde GCS.
type URLSigner interface {
	UploadURL(ctx context.Context, objectName, contentType string) (string, error)
	DownloadURL(ctx context.Context, objectName string) (string, error)
}

// ---------------------------------------------------------------------------
// Constructores — detectan el entorno automáticamente
// ---------------------------------------------------------------------------

// New devuelve el Uploader apropiado:
//   - GCS si GCS_BUCKET_NAME está configurado
//   - Local si no (desarrollo sin GCS)
func New() Uploader {
	bucket := os.Getenv("GCS_BUCKET_NAME")
	creds := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
	if bucket != "" && creds != "" {
		return &GCSUploader{bucket: bucket, credsFile: creds}
	}
	if bucket != "" {
		// GKE Workload Identity — usa ADC
		return &GCSUploader{bucket: bucket}
	}
	dir := os.Getenv("LOCAL_UPLOAD_DIR")
	if dir == "" {
		dir = "./uploads"
	}
	baseURL := localBaseURL()
	os.MkdirAll(dir, 0755)
	return &LocalUploader{dir: dir, baseURL: baseURL}
}

// NewSigner devuelve el URLSigner apropiado:
//   - GCSSigner con creds file (local con JSON key)
//   - GCSSigner con IAM signing (GKE Workload Identity — requiere GCS_SERVICE_ACCOUNT_EMAIL)
//   - LocalSigner (desarrollo sin GCS)
func NewSigner() URLSigner {
	bucket := os.Getenv("GCS_BUCKET_NAME")
	credsFile := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
	saEmail := os.Getenv("GCS_SERVICE_ACCOUNT_EMAIL")
	if bucket != "" && (credsFile != "" || saEmail != "") {
		return &GCSSigner{bucket: bucket, credsFile: credsFile, saEmail: saEmail}
	}
	return &LocalSigner{baseURL: localBaseURL()}
}

func localBaseURL() string {
	if v := os.Getenv("LOCAL_UPLOAD_BASE_URL"); v != "" {
		return v
	}
	return "http://localhost:8082/uploads"
}

// ---------------------------------------------------------------------------
// GCS — upload directo desde backend
// ---------------------------------------------------------------------------

type GCSUploader struct {
	bucket    string
	credsFile string // vacío = ADC (Workload Identity en GKE)
}

func (g *GCSUploader) newClient(ctx context.Context) (*storage.Client, error) {
	if g.credsFile != "" {
		return storage.NewClient(ctx, option.WithCredentialsFile(g.credsFile))
	}
	return storage.NewClient(ctx) // ADC
}

func (g *GCSUploader) Upload(ctx context.Context, name string, r io.Reader, contentType string) (string, error) {
	client, err := g.newClient(ctx)
	if err != nil {
		return "", fmt.Errorf("gcs client: %w", err)
	}
	defer client.Close()

	wc := client.Bucket(g.bucket).Object(name).NewWriter(ctx)
	wc.ContentType = contentType
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
// GCS — signed URLs V4
// Soporta dos modos:
//   1. credsFile != "" → firma con la llave del service account JSON (local/dev)
//   2. credsFile == "" → firma via IAM credentials API (GKE Workload Identity)
// ---------------------------------------------------------------------------

type GCSSigner struct {
	bucket    string
	credsFile string // vacío en GKE con Workload Identity
	saEmail   string // necesario para IAM signing (GCS_SERVICE_ACCOUNT_EMAIL)
}

func (g *GCSSigner) newClient(ctx context.Context) (*storage.Client, error) {
	if g.credsFile != "" {
		return storage.NewClient(ctx, option.WithCredentialsFile(g.credsFile))
	}
	return storage.NewClient(ctx) // ADC
}

func (g *GCSSigner) buildOpts(ctx context.Context, method, contentType string, expiry time.Duration) *storage.SignedURLOptions {
	opts := &storage.SignedURLOptions{
		Method:  method,
		Expires: time.Now().Add(expiry),
		Scheme:  storage.SigningSchemeV4,
	}
	if contentType != "" {
		opts.ContentType = contentType
	}
	// Workload Identity: firma via IAM en lugar de llave privada local
	if g.credsFile == "" && g.saEmail != "" {
		saEmail := g.saEmail
		opts.GoogleAccessID = saEmail
		opts.SignBytes = func(b []byte) ([]byte, error) {
			return iamSignBytes(ctx, saEmail, b)
		}
	}
	return opts
}

// UploadURL genera una signed URL PUT válida 15 minutos para subir directamente desde el frontend.
func (g *GCSSigner) UploadURL(ctx context.Context, objectName, contentType string) (string, error) {
	client, err := g.newClient(ctx)
	if err != nil {
		return "", fmt.Errorf("gcs client: %w", err)
	}
	defer client.Close()

	url, err := client.Bucket(g.bucket).SignedURL(objectName, g.buildOpts(ctx, "PUT", contentType, 15*time.Minute))
	if err != nil {
		return "", fmt.Errorf("gcs sign upload url: %w", err)
	}
	return url, nil
}

// DownloadURL genera una signed URL GET válida 1 hora para reproducir desde el frontend.
func (g *GCSSigner) DownloadURL(ctx context.Context, objectName string) (string, error) {
	client, err := g.newClient(ctx)
	if err != nil {
		return "", fmt.Errorf("gcs client: %w", err)
	}
	defer client.Close()

	url, err := client.Bucket(g.bucket).SignedURL(objectName, g.buildOpts(ctx, "GET", "", 1*time.Hour))
	if err != nil {
		return "", fmt.Errorf("gcs sign download url: %w", err)
	}
	return url, nil
}

// iamSignBytes llama a la IAM Credentials API para firmar bytes usando el service account.
// Funciona con GKE Workload Identity sin necesitar una llave JSON.
func iamSignBytes(ctx context.Context, saEmail string, payload []byte) ([]byte, error) {
	svc, err := iamcredentials.NewService(ctx)
	if err != nil {
		return nil, fmt.Errorf("iam credentials service: %w", err)
	}
	resp, err := svc.Projects.ServiceAccounts.SignBlob(
		"projects/-/serviceAccounts/"+saEmail,
		&iamcredentials.SignBlobRequest{
			Payload: base64.StdEncoding.EncodeToString(payload),
		},
	).Context(ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("iam sign blob: %w", err)
	}
	return base64.StdEncoding.DecodeString(resp.SignedBlob)
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

type LocalSigner struct{ baseURL string }

func (l *LocalSigner) UploadURL(_ context.Context, objectName, _ string) (string, error) {
	return l.baseURL + "/" + objectName, nil
}
func (l *LocalSigner) DownloadURL(_ context.Context, objectName string) (string, error) {
	return l.baseURL + "/" + objectName, nil
}

// ---------------------------------------------------------------------------
// HTTP handlers
// ---------------------------------------------------------------------------

// RegisterRoutes registra los 4 endpoints HTTP de storage en el mux.
func RegisterRoutes(mux *http.ServeMux, up Uploader, signer URLSigner) {
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads"))))
	mux.HandleFunc("/admin/upload", makeDirectUploadHandler(up))
	mux.HandleFunc("/admin/upload-url", makeSignedUploadURLHandler(signer))
	mux.HandleFunc("/admin/download-url", makeSignedDownloadURLHandler(signer))
}

// POST /admin/upload — upload directo desde backend (para posters pequeños o fallback)
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

// POST /admin/upload-url
// Body:     { "filename": "video.mp4", "content_type": "video/mp4" }
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
		_ = json.NewEncoder(w).Encode(map[string]string{"upload_url": uploadURL, "object_name": objectName})
	}
}

// GET /admin/download-url?object=videos/1234-pelicula.mp4
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
		_ = json.NewEncoder(w).Encode(map[string]string{"download_url": downloadURL, "object_name": objectName})
	}
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

func buildObjectName(h *multipart.FileHeader) string {
	ext := filepath.Ext(h.Filename)
	return fmt.Sprintf("%s/%d-%s%s", classifyAsset(ext), time.Now().UnixMilli(),
		sanitizeName(strings.TrimSuffix(filepath.Base(h.Filename), ext)), ext)
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
