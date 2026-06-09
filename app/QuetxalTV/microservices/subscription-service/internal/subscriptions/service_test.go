package subscriptions

import (
	"context"
	"errors"
	"testing"
	"time"

	"subscription-service/internal/clients"
	"subscription-service/internal/plans"
)

type fakeSubscriptionRepo struct {
	result       *ProcessResult
	processError error
	cancelError  error
	active       *Subscription
	lastCurrency string
	lastRate     float64
}

func (r *fakeSubscriptionRepo) FindActiveByUserID(context.Context, string) (*Subscription, error) {
	return r.active, nil
}

func (r *fakeSubscriptionRepo) ProcessSubscription(_ context.Context, _, _, currency string, exchangeRate float64, _ string) (*ProcessResult, error) {
	r.lastCurrency = currency
	r.lastRate = exchangeRate
	if r.processError != nil {
		return nil, r.processError
	}
	return r.result, nil
}

func (r *fakeSubscriptionRepo) CancelByUserID(context.Context, string, string) error {
	return r.cancelError
}

type fakePlansRepo struct {
	plan *plans.Plan
	err  error
}

func (r fakePlansRepo) FindAll(context.Context) ([]plans.Plan, error) {
	if r.plan == nil {
		return nil, nil
	}
	return []plans.Plan{*r.plan}, nil
}

func (r fakePlansRepo) FindByID(context.Context, string) (*plans.Plan, error) {
	if r.err != nil {
		return nil, r.err
	}
	return r.plan, nil
}

type fakeFXClient struct {
	rate float64
	err  error
}

func (c fakeFXClient) GetExchangeRate(context.Context, string, string) (float64, error) {
	return c.rate, c.err
}

type fakeNotificationClient struct {
	called chan clients.ReceiptData
}

func (c fakeNotificationClient) SendPurchaseReceipt(_ context.Context, data clients.ReceiptData) error {
	c.called <- data
	return nil
}

func TestSubscribeProcessesPaymentWithFXRate(t *testing.T) {
	notifications := make(chan clients.ReceiptData, 1)
	repo := &fakeSubscriptionRepo{result: &ProcessResult{SubscriptionID: "sub-1", PaymentID: "pay-1", Status: "SUCCESS"}}
	service := NewService(
		repo,
		fakePlansRepo{plan: &plans.Plan{ID: "plan-1", Name: "Premium", PriceUSD: 15.99}},
		fakeFXClient{rate: 7.8},
		fakeNotificationClient{called: notifications},
	)

	result, err := service.Subscribe(context.Background(), "user-1", "plan-1", "GTQ", "credit_card")
	if err != nil {
		t.Fatalf("Subscribe returned error: %v", err)
	}
	if result.SubscriptionID != "sub-1" || result.PaymentID != "pay-1" {
		t.Fatalf("unexpected result: %#v", result)
	}
	if repo.lastCurrency != "GTQ" || repo.lastRate != 7.8 {
		t.Fatalf("unexpected FX data: currency=%s rate=%f", repo.lastCurrency, repo.lastRate)
	}

	select {
	case receipt := <-notifications:
		if receipt.UserID != "user-1" || receipt.PlanName != "Premium" || receipt.TransactionID != "pay-1" {
			t.Fatalf("unexpected receipt: %#v", receipt)
		}
	case <-time.After(time.Second):
		t.Fatal("expected async notification")
	}
}

func TestSubscribeFallsBackToUSDWhenFXFails(t *testing.T) {
	repo := &fakeSubscriptionRepo{result: &ProcessResult{SubscriptionID: "sub-1", PaymentID: "pay-1", Status: "SUCCESS"}}
	service := NewService(
		repo,
		fakePlansRepo{plan: &plans.Plan{ID: "plan-1", Name: "Basic", PriceUSD: 5.99}},
		fakeFXClient{err: errors.New("fx unavailable")},
		clients.NewNoopNotificationClient(),
	)

	_, err := service.Subscribe(context.Background(), "user-1", "plan-1", "GTQ", "paypal")
	if err != nil {
		t.Fatalf("Subscribe returned error: %v", err)
	}
	if repo.lastCurrency != "USD" || repo.lastRate != 1 {
		t.Fatalf("expected USD fallback, got currency=%s rate=%f", repo.lastCurrency, repo.lastRate)
	}
}

func TestSubscribeRejectsInvalidPlan(t *testing.T) {
	service := NewService(
		&fakeSubscriptionRepo{},
		fakePlansRepo{err: errors.New("not found")},
		fakeFXClient{rate: 1},
		clients.NewNoopNotificationClient(),
	)

	_, err := service.Subscribe(context.Background(), "user-1", "missing", "USD", "paypal")
	if err == nil {
		t.Fatal("expected invalid plan error")
	}
}

func TestGetUserSubscriptionReturnsPresenceFlag(t *testing.T) {
	repo := &fakeSubscriptionRepo{active: &Subscription{ID: "sub-1", UserID: "user-1", Status: "active"}}
	service := NewService(repo, fakePlansRepo{}, fakeFXClient{rate: 1}, clients.NewNoopNotificationClient())

	sub, hasActive, err := service.GetUserSubscription(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("GetUserSubscription returned error: %v", err)
	}
	if !hasActive || sub.ID != "sub-1" {
		t.Fatalf("unexpected subscription response: hasActive=%v sub=%#v", hasActive, sub)
	}
}
