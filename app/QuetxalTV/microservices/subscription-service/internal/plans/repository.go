package plans

import (
	"context"
	"database/sql"
	"fmt"
)

type Plan struct {
	ID           string
	Name         string
	Description  string
	PriceUSD     float64
	MaxProfiles  int32
	MaxStreams   int32
	VideoQuality string
	IsActive     bool
}

type Repository interface {
	FindAll(ctx context.Context) ([]Plan, error)
	FindByID(ctx context.Context, id string) (*Plan, error)
}

type postgresRepository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &postgresRepository{db: db}
}

func (r *postgresRepository) FindAll(ctx context.Context) ([]Plan, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id::TEXT, name, COALESCE(description, ''), price_usd,
		       max_profiles, max_streams, video_quality, is_active
		FROM v_plans_overview
	`)
	if err != nil {
		return nil, fmt.Errorf("find all plans: %w", err)
	}
	defer rows.Close()

	plans := make([]Plan, 0)
	for rows.Next() {
		var p Plan
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.PriceUSD, &p.MaxProfiles, &p.MaxStreams, &p.VideoQuality, &p.IsActive); err != nil {
			return nil, fmt.Errorf("scan plan: %w", err)
		}
		plans = append(plans, p)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate plans: %w", err)
	}
	return plans, nil
}

func (r *postgresRepository) FindByID(ctx context.Context, id string) (*Plan, error) {
	var p Plan
	err := r.db.QueryRowContext(ctx, `
		SELECT id::TEXT, name, COALESCE(description, ''), price_usd,
		       max_profiles, max_streams, video_quality, is_active
		FROM plans
		WHERE id = $1 AND is_active = true
	`, id).Scan(&p.ID, &p.Name, &p.Description, &p.PriceUSD, &p.MaxProfiles, &p.MaxStreams, &p.VideoQuality, &p.IsActive)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("plan %s not found", id)
	}
	if err != nil {
		return nil, fmt.Errorf("find plan by id: %w", err)
	}
	return &p, nil
}
