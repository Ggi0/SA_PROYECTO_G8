package audit

import (
	"database/sql"
	"fmt"
)

// Repository expone las consultas de solo lectura sobre la tabla audit_log.
type Repository interface {
	GetAuditLogs(f AuditLogFilter) ([]AuditLogRow, int, error)
}

type postgresRepository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &postgresRepository{db: db}
}

// GetAuditLogs devuelve las entradas de audit_log aplicando filtros opcionales
// (tabla, operación, rango de fechas) y paginación. Retorna también el total
// de filas que cumplen el filtro (sin paginar) para construir la respuesta.
func (r *postgresRepository) GetAuditLogs(f AuditLogFilter) ([]AuditLogRow, int, error) {
	where := "WHERE 1=1"
	args := []any{}
	i := 1

	if f.TableName != "" {
		where += fmt.Sprintf(" AND table_name = $%d", i)
		args = append(args, f.TableName)
		i++
	}
	if f.Operation != "" {
		where += fmt.Sprintf(" AND operation = $%d", i)
		args = append(args, f.Operation)
		i++
	}
	if f.From != "" {
		where += fmt.Sprintf(" AND changed_at >= $%d", i)
		args = append(args, f.From)
		i++
	}
	if f.To != "" {
		where += fmt.Sprintf(" AND changed_at <= $%d", i)
		args = append(args, f.To)
		i++
	}

	var total int
	if err := r.db.QueryRow(
		fmt.Sprintf("SELECT COUNT(*) FROM audit_log %s", where), args...,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count audit_log: %w", err)
	}

	if f.Page < 1 {
		f.Page = 1
	}
	if f.PageSize < 1 || f.PageSize > 10000 {
		f.PageSize = 20
	}
	offset := (f.Page - 1) * f.PageSize
	args = append(args, f.PageSize, offset)

	query := fmt.Sprintf(`
		SELECT log_id, table_name, operation, changed_by, changed_at::TEXT,
		       COALESCE(old_data::TEXT, ''), COALESCE(new_data::TEXT, '')
		FROM audit_log
		%s
		ORDER BY changed_at DESC, log_id DESC
		LIMIT $%d OFFSET $%d`, where, i, i+1)

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("query audit_log: %w", err)
	}
	defer rows.Close()

	result := make([]AuditLogRow, 0)
	for rows.Next() {
		var row AuditLogRow
		if err := rows.Scan(
			&row.ID, &row.TableName, &row.Operation, &row.ChangedBy,
			&row.ChangedAt, &row.OldData, &row.NewData,
		); err != nil {
			return nil, 0, fmt.Errorf("scan audit_log: %w", err)
		}
		result = append(result, row)
	}
	return result, total, rows.Err()
}
