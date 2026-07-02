package audit

import (
	"context"
	"errors"
	"testing"

	pb "subscription-service/proto/subscription"
)

var errMock = errors.New("mock error")

type mockRepo struct {
	rows  []AuditLogRow
	total int
	err   error
	last  AuditLogFilter
}

func (m *mockRepo) GetAuditLogs(f AuditLogFilter) ([]AuditLogRow, int, error) {
	m.last = f
	if m.err != nil {
		return nil, 0, m.err
	}
	return m.rows, m.total, nil
}

func sampleRows() []AuditLogRow {
	return []AuditLogRow{
		{ID: 2, TableName: "subscriptions", Operation: "UPDATE", ChangedBy: "user-1", ChangedAt: "2026-06-17T10:00:00Z", OldData: `{"status":"ACTIVE"}`, NewData: `{"status":"CANCELLED"}`},
		{ID: 1, TableName: "payments", Operation: "INSERT", ChangedBy: "user-1", ChangedAt: "2026-06-17T09:00:00Z", OldData: "", NewData: `{"amount_usd":13.99}`},
	}
}

func TestGetAuditLogs_Success(t *testing.T) {
	repo := &mockRepo{rows: sampleRows(), total: 2}
	rows, total, err := NewService(repo).GetAuditLogs(AuditLogFilter{Page: 1, PageSize: 20})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if total != 2 || len(rows) != 2 {
		t.Fatalf("expected 2 rows/total, got %d rows total %d", len(rows), total)
	}
}

func TestGetAuditLogs_Error(t *testing.T) {
	repo := &mockRepo{err: errMock}
	if _, _, err := NewService(repo).GetAuditLogs(AuditLogFilter{}); err == nil {
		t.Fatal("expected error")
	}
}

func TestExportAuditCSV(t *testing.T) {
	repo := &mockRepo{rows: sampleRows(), total: 2}
	data, err := NewService(repo).ExportAuditCSV(AuditLogFilter{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(data) == 0 {
		t.Fatal("expected non-empty CSV")
	}
}

func TestExportAuditPDF(t *testing.T) {
	repo := &mockRepo{rows: sampleRows(), total: 2}
	data, err := NewService(repo).ExportAuditPDF(AuditLogFilter{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(data) < 4 || string(data[:4]) != "%PDF" {
		t.Fatalf("expected PDF magic header, got %q", string(data[:min(4, len(data))]))
	}
}

func TestHandlerGetAuditLogs(t *testing.T) {
	repo := &mockRepo{rows: sampleRows(), total: 2}
	h := NewHandler(NewService(repo))
	resp, err := h.GetAuditLogs(context.Background(), &pb.GetAuditLogsRequest{
		TableName: "subscriptions", Operation: "update", Page: 1, PageSize: 20,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Entries) != 2 || resp.Total != 2 {
		t.Fatalf("unexpected response: %+v", resp)
	}
	// La operación debe normalizarse a mayúsculas para el filtro.
	if repo.last.Operation != "UPDATE" {
		t.Fatalf("expected operation UPDATE, got %q", repo.last.Operation)
	}
}

func TestHandlerExportAuditLog(t *testing.T) {
	h := NewHandler(NewService(&mockRepo{rows: sampleRows(), total: 2}))

	csvResp, err := h.ExportAuditLog(context.Background(), &pb.ExportAuditLogRequest{Format: "CSV"})
	if err != nil {
		t.Fatalf("csv export error: %v", err)
	}
	if csvResp.Filename != "subscription_audit_log.csv" {
		t.Fatalf("unexpected csv filename: %s", csvResp.Filename)
	}

	pdfResp, err := h.ExportAuditLog(context.Background(), &pb.ExportAuditLogRequest{Format: "pdf"})
	if err != nil {
		t.Fatalf("pdf export error: %v", err)
	}
	if pdfResp.ContentType != "application/pdf" {
		t.Fatalf("unexpected pdf content type: %s", pdfResp.ContentType)
	}

	if _, err := h.ExportAuditLog(context.Background(), &pb.ExportAuditLogRequest{Format: "xml"}); err == nil {
		t.Fatal("expected error for unsupported format")
	}
}
