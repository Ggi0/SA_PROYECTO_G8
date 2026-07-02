package audit

// AuditLogRow representa una fila de la tabla audit_log.
type AuditLogRow struct {
	ID        int64
	TableName string
	Operation string
	ChangedBy string
	ChangedAt string
	OldData   string
	NewData   string
}

// AuditLogFilter agrupa los parámetros de filtrado y paginación para las
// consultas de auditoría.
type AuditLogFilter struct {
	TableName string
	Operation string
	From      string // ISO 8601, ej. "2026-01-01T00:00:00Z"
	To        string
	Page      int
	PageSize  int
}
