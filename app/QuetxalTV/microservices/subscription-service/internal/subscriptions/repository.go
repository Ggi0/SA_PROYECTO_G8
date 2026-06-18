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
		SELECT s.subscription_id::TEXT,
		       s.user_id::TEXT,
		       s.plan_id::TEXT,
		       p.name,
		       p.price_usd,
		       s.status,
		       s.current_period_start::TEXT,
		       s.current_period_end::TEXT,
		       GREATEST(0, EXTRACT(DAY FROM (s.current_period_end - NOW()))::INT),
		       p.max_profiles::INT,
		       p.max_streams::INT,
		       p.video_quality
		FROM subscriptions s
		INNER JOIN plans p ON s.plan_id = p.plan_id
		WHERE s.user_id = $1 AND s.status = 'ACTIVE' AND s.current_period_end > NOW()
		ORDER BY s.current_period_end DESC
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
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	// Registra al usuario responsable para la auditoría transaccional por triggers.
	if err := setChangedBy(ctx, tx, userID); err != nil {
		return nil, err
	}

	var result ProcessResult
	err = tx.QueryRowContext(ctx, `
		SELECT p_subscription_id::TEXT, p_payment_id::TEXT, p_result_status, p_error_message
		FROM fn_process_subscription($1, $2::INT, $3, $4, $5)
	`, userID, planID, currency, exchangeRate, paymentMethod).Scan(
		&result.SubscriptionID, &result.PaymentID, &result.Status, &result.ErrorMessage,
	)
	if err != nil {
		return nil, fmt.Errorf("process subscription: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}
	return &result, nil
}

func (r *postgresRepository) CancelByUserID(ctx context.Context, userID, reason string) error {
	if reason == "" {
		reason = "Cancelled by user"
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	// Registra al usuario responsable para la auditoría transaccional por triggers.
	if err := setChangedBy(ctx, tx, userID); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `CALL sp_cancel_subscription($1)`, userID); err != nil {
		return fmt.Errorf("cancel subscription: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}
	_ = reason
	return nil
}

// setChangedBy fija la variable de sesión app.changed_by dentro de la
// transacción activa. El trigger fn_subscription_audit la lee para registrar
// el usuario responsable. is_local=true la limita a la transacción actual.
func setChangedBy(ctx context.Context, tx *sql.Tx, changedBy string) error {
	if changedBy == "" {
		changedBy = "system"
	}
	if _, err := tx.ExecContext(ctx, `SELECT set_config('app.changed_by', $1, true)`, changedBy); err != nil {
		return fmt.Errorf("set changed_by: %w", err)
	}
	return nil
}
