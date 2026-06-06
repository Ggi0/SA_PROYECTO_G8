package payments

import (
	"context"
	"database/sql"
	"fmt"
)

type Payment struct {
	ID             string
	SubscriptionID string
	PlanName       string
	AmountUSD      float64
	AmountLocal    float64
	Currency       string
	ExchangeRate   float64
	Status         string
	PaymentMethod  string
	TransactionRef string
	CreatedAt      string
}

type Repository interface {
	FindByUserID(ctx context.Context, userID string, limit, offset int) ([]Payment, int, error)
}

type postgresRepository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &postgresRepository{db: db}
}

func (r *postgresRepository) FindByUserID(ctx context.Context, userID string, limit, offset int) ([]Payment, int, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	var total int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM payments WHERE user_id = $1`, userID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count payments: %w", err)
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT pay.id::TEXT, pay.subscription_id::TEXT, pl.name,
		       pay.amount_usd, pay.amount_local, pay.currency, pay.exchange_rate,
		       pay.status, COALESCE(pay.payment_method, ''), pay.transaction_ref,
		       pay.created_at::TEXT
		FROM payments pay
		INNER JOIN plans pl ON pay.plan_id = pl.id
		WHERE pay.user_id = $1
		ORDER BY pay.created_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("query payments: %w", err)
	}
	defer rows.Close()

	items := make([]Payment, 0)
	for rows.Next() {
		var p Payment
		if err := rows.Scan(&p.ID, &p.SubscriptionID, &p.PlanName, &p.AmountUSD, &p.AmountLocal, &p.Currency, &p.ExchangeRate, &p.Status, &p.PaymentMethod, &p.TransactionRef, &p.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan payment: %w", err)
		}
		items = append(items, p)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate payments: %w", err)
	}
	return items, total, nil
}
