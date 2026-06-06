package subscriptions

import (
	"context"
	"database/sql"
	"fmt"
)

type Subscription struct {
	ID                 string
	UserID             string
	PlanID             string
	PlanName           string
	PlanPriceUSD       float64
	Status             string
	StartDate          string
	RenewalDate        string
	DaysRemaining      int32
	MaxProfiles        int32
	MaxStreams         int32
	VideoQuality       string
	CancellationReason string
}

type ProcessResult struct {
	SubscriptionID string
	PaymentID      string
	Status         string
	ErrorMessage   string
}

type Repository interface {
	FindActiveByUserID(ctx context.Context, userID string) (*Subscription, error)
	ProcessSubscription(ctx context.Context, userID, planID, currency string, exchangeRate float64, paymentMethod string) (*ProcessResult, error)
	CancelByUserID(ctx context.Context, userID, reason string) error
}

type postgresRepository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &postgresRepository{db: db}
}

func (r *postgresRepository) FindActiveByUserID(ctx context.Context, userID string) (*Subscription, error) {
	var s Subscription
	err := r.db.QueryRowContext(ctx, `
		SELECT subscription_id::TEXT, user_id::TEXT, plan_id::TEXT, plan_name,
		       price_usd, status, start_date::TEXT, renewal_date::TEXT,
		       days_remaining, max_profiles, max_streams, video_quality
		FROM v_user_subscriptions
		WHERE user_id = $1 AND status = 'active' AND renewal_date > NOW()
		ORDER BY renewal_date DESC
		LIMIT 1
	`, userID).Scan(
		&s.ID, &s.UserID, &s.PlanID, &s.PlanName,
		&s.PlanPriceUSD, &s.Status, &s.StartDate, &s.RenewalDate,
		&s.DaysRemaining, &s.MaxProfiles, &s.MaxStreams, &s.VideoQuality,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("find active subscription: %w", err)
	}
	return &s, nil
}

func (r *postgresRepository) ProcessSubscription(ctx context.Context, userID, planID, currency string, exchangeRate float64, paymentMethod string) (*ProcessResult, error) {
	var result ProcessResult
	err := r.db.QueryRowContext(ctx, `
		SELECT p_subscription_id::TEXT, p_payment_id::TEXT, p_result_status, p_error_message
		FROM fn_process_subscription($1, $2, $3, $4, $5)
	`, userID, planID, currency, exchangeRate, paymentMethod).Scan(
		&result.SubscriptionID, &result.PaymentID, &result.Status, &result.ErrorMessage,
	)
	if err != nil {
		return nil, fmt.Errorf("process subscription: %w", err)
	}
	return &result, nil
}

func (r *postgresRepository) CancelByUserID(ctx context.Context, userID, reason string) error {
	if reason == "" {
		reason = "Cancelled by user"
	}

	result, err := r.db.ExecContext(ctx, `
		UPDATE subscriptions
		SET status = 'cancelled', cancelled_at = NOW(), cancellation_reason = $2, updated_at = NOW()
		WHERE user_id = $1 AND status = 'active'
	`, userID, reason)
	if err != nil {
		return fmt.Errorf("cancel subscription: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("cancel subscription rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("active subscription not found")
	}
	return nil
}
