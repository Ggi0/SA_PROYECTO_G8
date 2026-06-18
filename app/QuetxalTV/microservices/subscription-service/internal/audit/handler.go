package audit

import (
	"context"
	"strings"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pb "subscription-service/proto/subscription"
)

// Handler adapta el Service de auditoría a los contratos gRPC del servicio.
type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// GetAuditLogs implementa la consulta paginada del log transaccional.
func (h *Handler) GetAuditLogs(ctx context.Context, req *pb.GetAuditLogsRequest) (*pb.GetAuditLogsResponse, error) {
	filter := filterFromProto(req.GetTableName(), req.GetOperation(), req.GetFrom(), req.GetTo(), int(req.GetPage()), int(req.GetPageSize()))

	rows, total, err := h.svc.GetAuditLogs(filter)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error consultando auditoría: %v", err)
	}

	entries := make([]*pb.AuditLogEntry, 0, len(rows))
	for _, r := range rows {
		entries = append(entries, &pb.AuditLogEntry{
			Id:        r.ID,
			TableName: r.TableName,
			Operation: r.Operation,
			ChangedBy: r.ChangedBy,
			ChangedAt: r.ChangedAt,
			OldData:   r.OldData,
			NewData:   r.NewData,
		})
	}

	return &pb.GetAuditLogsResponse{
		Entries:  entries,
		Total:    int32(total),
		Page:     int32(filter.Page),
		PageSize: int32(filter.PageSize),
	}, nil
}

// ExportAuditLog genera el reporte descargable (CSV o PDF) del log de auditoría.
func (h *Handler) ExportAuditLog(ctx context.Context, req *pb.ExportAuditLogRequest) (*pb.ExportAuditLogResponse, error) {
	filter := filterFromProto(req.GetTableName(), req.GetOperation(), req.GetFrom(), req.GetTo(), 1, 10000)

	switch strings.ToLower(strings.TrimSpace(req.GetFormat())) {
	case "csv":
		data, err := h.svc.ExportAuditCSV(filter)
		if err != nil {
			return nil, status.Errorf(codes.Internal, "error generando CSV: %v", err)
		}
		return &pb.ExportAuditLogResponse{
			Content:     data,
			ContentType: "text/csv; charset=utf-8",
			Filename:    "subscription_audit_log.csv",
		}, nil

	case "pdf":
		data, err := h.svc.ExportAuditPDF(filter)
		if err != nil {
			return nil, status.Errorf(codes.Internal, "error generando PDF: %v", err)
		}
		return &pb.ExportAuditLogResponse{
			Content:     data,
			ContentType: "application/pdf",
			Filename:    "subscription_audit_log.pdf",
		}, nil

	default:
		return nil, status.Error(codes.InvalidArgument, `format requerido: "csv" o "pdf"`)
	}
}

func filterFromProto(table, operation, from, to string, page, pageSize int) AuditLogFilter {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	return AuditLogFilter{
		TableName: table,
		Operation: strings.ToUpper(strings.TrimSpace(operation)),
		From:      from,
		To:        to,
		Page:      page,
		PageSize:  pageSize,
	}
}
