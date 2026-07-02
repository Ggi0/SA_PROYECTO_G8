package audit

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/quetxaltv/catalog-service/internal/catalog"
)

type Handler struct {
	svc *catalog.Service
}

func NewHandler(svc *catalog.Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/audit/logs", h.handleGetLogs)
	mux.HandleFunc("/audit/export", h.handleExport)
}

// handleGetLogs devuelve los registros de auditoría en formato JSON.
// GET /audit/logs?table=content&operation=UPDATE&from=2026-01-01&to=2026-12-31&page=1&page_size=20
func (h *Handler) handleGetLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	filter := parseFilter(r)
	rows, total, err := h.svc.GetAuditLogs(filter)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"data":      rows,
		"total":     total,
		"page":      filter.Page,
		"page_size": filter.PageSize,
	})
}

// handleExport genera y descarga el reporte en CSV o PDF.
// GET /audit/export?format=csv|pdf&table=&operation=&from=&to=
func (h *Handler) handleExport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	filter := parseFilter(r)
	format := r.URL.Query().Get("format")

	switch format {
	case "csv":
		data, err := h.svc.ExportAuditCSV(filter)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		w.Header().Set("Content-Disposition", "attachment; filename=audit_log.csv")
		_, _ = w.Write(data)

	case "pdf":
		data, err := h.svc.ExportAuditPDF(filter)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/pdf")
		w.Header().Set("Content-Disposition", "attachment; filename=audit_log.pdf")
		_, _ = w.Write(data)

	default:
		http.Error(w, `format requerido: "csv" o "pdf"`, http.StatusBadRequest)
	}
}

func parseFilter(r *http.Request) catalog.AuditLogFilter {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	pageSize, _ := strconv.Atoi(q.Get("page_size"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	return catalog.AuditLogFilter{
		TableName: q.Get("table"),
		Operation: q.Get("operation"),
		From:      q.Get("from"),
		To:        q.Get("to"),
		Page:      page,
		PageSize:  pageSize,
	}
}
