package audit

import (
	"bytes"
	"encoding/csv"
	"fmt"

	"github.com/jung-kurt/gofpdf"
)

// Service contiene la lógica de negocio de auditoría: consulta paginada y
// generación de reportes descargables en CSV y PDF.
type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// GetAuditLogs retorna las entradas de auditoría aplicando el filtro recibido.
func (s *Service) GetAuditLogs(f AuditLogFilter) ([]AuditLogRow, int, error) {
	return s.repo.GetAuditLogs(f)
}

// ExportAuditCSV genera un archivo CSV con los registros de auditoría que
// cumplen el filtro (sin paginar).
func (s *Service) ExportAuditCSV(f AuditLogFilter) ([]byte, error) {
	f.Page = 1
	f.PageSize = 10000
	rows, _, err := s.repo.GetAuditLogs(f)
	if err != nil {
		return nil, fmt.Errorf("ExportAuditCSV: %w", err)
	}

	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	_ = w.Write([]string{"ID", "Tabla", "Operacion", "Realizado por", "Fecha/Hora", "Datos anteriores", "Datos nuevos"})
	for _, r := range rows {
		_ = w.Write([]string{
			fmt.Sprintf("%d", r.ID),
			r.TableName,
			r.Operation,
			r.ChangedBy,
			r.ChangedAt,
			r.OldData,
			r.NewData,
		})
	}
	w.Flush()
	if err := w.Error(); err != nil {
		return nil, fmt.Errorf("ExportAuditCSV write: %w", err)
	}
	return buf.Bytes(), nil
}

// ExportAuditPDF genera un PDF tabular con los registros de auditoría que
// cumplen el filtro (sin paginar).
func (s *Service) ExportAuditPDF(f AuditLogFilter) ([]byte, error) {
	f.Page = 1
	f.PageSize = 10000
	rows, _, err := s.repo.GetAuditLogs(f)
	if err != nil {
		return nil, fmt.Errorf("ExportAuditPDF: %w", err)
	}

	pdf := gofpdf.New("L", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 14)
	pdf.CellFormat(0, 10, "QuetxalTV - Log de Auditoria de Suscripciones", "", 1, "C", false, 0, "")
	pdf.Ln(4)

	headers := []string{"ID", "Tabla", "Operacion", "Realizado por", "Fecha/Hora", "Datos anteriores", "Datos nuevos"}
	widths := []float64{12, 30, 22, 35, 42, 62, 62}

	pdf.SetFont("Arial", "B", 8)
	pdf.SetFillColor(30, 80, 160)
	pdf.SetTextColor(255, 255, 255)
	for i, h := range headers {
		pdf.CellFormat(widths[i], 7, h, "1", 0, "C", true, 0, "")
	}
	pdf.Ln(-1)

	pdf.SetFont("Arial", "", 7)
	pdf.SetTextColor(0, 0, 0)
	fillRow := false
	for _, r := range rows {
		if fillRow {
			pdf.SetFillColor(235, 241, 255)
		} else {
			pdf.SetFillColor(255, 255, 255)
		}
		vals := []string{
			fmt.Sprintf("%d", r.ID),
			r.TableName,
			r.Operation,
			r.ChangedBy,
			r.ChangedAt,
			truncateStr(r.OldData, 55),
			truncateStr(r.NewData, 55),
		}
		for i, v := range vals {
			pdf.CellFormat(widths[i], 6, v, "1", 0, "L", true, 0, "")
		}
		pdf.Ln(-1)
		fillRow = !fillRow
	}

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("ExportAuditPDF output: %w", err)
	}
	return buf.Bytes(), nil
}

func truncateStr(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
