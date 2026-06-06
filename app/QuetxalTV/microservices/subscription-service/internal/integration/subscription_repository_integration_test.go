package integration

import (
	"context"
	"os"
	"testing"

	"subscription-service/internal/database"
	"subscription-service/internal/payments"
	"subscription-service/internal/plans"
	"subscription-service/internal/subscriptions"
)

func TestSubscriptionRepositoriesAgainstPostgres(t *testing.T) {
	if os.Getenv("SUBSCRIPTION_DB_INTEGRATION") != "1" {
		t.Skip("set SUBSCRIPTION_DB_INTEGRATION=1 to run PostgreSQL integration test")
	}

	db, err := database.NewPostgresDB()
	if err != nil {
		t.Fatalf("NewPostgresDB returned error: %v", err)
	}
	defer db.Close()

	ctx := context.Background()
	planRepo := plans.NewRepository(db)
	subRepo := subscriptions.NewRepository(db)
	paymentRepo := payments.NewRepository(db)

	plansList, err := planRepo.FindAll(ctx)
	if err != nil {
		t.Fatalf("FindAll returned error: %v", err)
	}
	if len(plansList) < 3 {
		t.Fatalf("expected seeded plans, got %d", len(plansList))
	}

	userID := "22222222-2222-2222-2222-222222222222"
	result, err := subRepo.ProcessSubscription(ctx, userID, plansList[0].ID, "GTQ", 7.8, "card")
	if err != nil {
		t.Fatalf("ProcessSubscription returned error: %v", err)
	}
	if result.Status != "SUCCESS" || result.SubscriptionID == "" || result.PaymentID == "" {
		t.Fatalf("unexpected process result: %#v", result)
	}

	active, err := subRepo.FindActiveByUserID(ctx, userID)
	if err != nil {
		t.Fatalf("FindActiveByUserID returned error: %v", err)
	}
	if active == nil || active.Status != "ACTIVE" {
		t.Fatalf("expected active subscription, got %#v", active)
	}

	history, total, err := paymentRepo.FindByUserID(ctx, userID, 10, 0)
	if err != nil {
		t.Fatalf("FindByUserID returned error: %v", err)
	}
	if total < 1 || len(history) < 1 {
		t.Fatalf("expected payment history, total=%d items=%d", total, len(history))
	}

	if err := subRepo.CancelByUserID(ctx, userID, "integration test"); err != nil {
		t.Fatalf("CancelByUserID returned error: %v", err)
	}

	active, err = subRepo.FindActiveByUserID(ctx, userID)
	if err != nil {
		t.Fatalf("FindActiveByUserID after cancel returned error: %v", err)
	}
	if active != nil {
		t.Fatalf("expected no active subscription after cancel, got %#v", active)
	}
}
