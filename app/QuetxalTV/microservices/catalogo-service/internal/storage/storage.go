package storage

import (
	"context"
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

// Uploader sube un archivo y devuelve su URL pública.
type Uploader interface {
	Upload(ctx context.Context, name string, r io.Reader, contentType string) (string, error)
}

// New devuelve un GCSUploader si hay credenciales configuradas, o un LocalUploader si no.
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

// ---------------------------------------------------------------------------
// GCS
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

	obj := client.Bucket(g.bucket).Object(name)
	wc := obj.NewWriter(ctx)
	wc.ContentType = contentType
	wc.CacheControl = "public, max-age=86400"

	if _, err = io.Copy(wc, r); err != nil {
		wc.Close()
		return "", fmt.Errorf("gcs write: %w", err)
	}
	if err = wc.Close(); err != nil {
		return "", fmt.Errorf("gcs close: %w", err)
	}

	// Hacer el objeto público
	if err = obj.ACL().Set(ctx, storage.AllUsers, storage.RoleReader); err != nil {
		return "", fmt.Errorf("gcs acl: %w", err)
	}

	return fmt.Sprintf("https://storage.googleapis.com/%s/%s", g.bucket, name), nil
}

// ---------------------------------------------------------------------------
// Local (desarrollo sin GCS)
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

// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------

// RegisterRoutes registra POST /admin/upload y GET /uploads/* en mux.
func RegisterRoutes(mux *http.ServeMux, up Uploader) {
	// Servir archivos locales (solo útil en modo local)
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads"))))

	mux.HandleFunc("/admin/upload", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Límite: 500 MB para videos, 10 MB para posters
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
		ct := detectContentType(header, file)

		url, err := up.Upload(r.Context(), objectName, file, ct)
		if err != nil {
			http.Error(w, "upload failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"url":%q}`, url)
	})
}

func buildObjectName(h *multipart.FileHeader) string {
	ext := filepath.Ext(h.Filename)
	assetType := "misc"
	switch strings.ToLower(ext) {
	case ".jpg", ".jpeg", ".png", ".webp":
		assetType = "posters"
	case ".mp4", ".mkv", ".mov", ".avi":
		assetType = "videos"
	}
	ts := time.Now().UnixMilli()
	base := strings.TrimSuffix(filepath.Base(h.Filename), ext)
	base = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			return r
		}
		return '-'
	}, base)
	return fmt.Sprintf("%s/%d-%s%s", assetType, ts, base, ext)
}

func detectContentType(h *multipart.FileHeader, _ multipart.File) string {
	if ct := h.Header.Get("Content-Type"); ct != "" && ct != "application/octet-stream" {
		return ct
	}
	ext := strings.ToLower(filepath.Ext(h.Filename))
	if ct := mime.TypeByExtension(ext); ct != "" {
		return ct
	}
	return "application/octet-stream"
}
