package subscriptions

import (
	"context"
	"errors"
	"fmt"

	"subscription-service/internal/clients"
	"subscription-service/internal/plans"
)

type Service interface {
	Subscribe(ctx context.Context, userID, planID, currency, paymentMethod string) (*ProcessResult, error)
	Cancel(ctx context.Context, userID, reason string) error
	GetUserSubscription(ctx context.Context, userID string) (*Subscription, bool, error)
}

type subscriptionService struct {
	repo        Repository
	plansRepo   plans.Repository
	fxClient    clients.FXClient
	notifClient clients.NotificationClient
}

func NewService(repo Repository, plansRepo plans.Repository, fxClient clients.FXClient, notifClient clients.NotificationClient) Service {
	if fxClient == nil {
		fxClient = clients.NewFallbackFXClient()
	}
	if notifClient == nil {
		notifClient = clients.NewNoopNotificationClient()
	}
	return &subscriptionService{repo: repo, plansRepo: plansRepo, fxClient: fxClient, notifClient: notifClient}
}

func (s *subscriptionService) Subscribe(ctx context.Context, userID, planID, currency, paymentMethod string) (*ProcessResult, error) {
	if currency == "" {
		currency = "USD"
	}
	if paymentMethod == "" {
		paymentMethod = "unknown"
	}

	plan, err := s.plansRepo.FindByID(ctx, planID)
	if err != nil {
		return nil, fmt.Errorf("invalid plan: %w", err)
	}

	exchangeRate, err := s.fxClient.GetExchangeRate(ctx, "USD", currency)
	if err != nil {
		exchangeRate = 1
		currency = "USD"
	}

	result, err := s.repo.ProcessSubscription(ctx, userID, planID, currency, exchangeRate, paymentMethod)
	if err != nil {
		return nil, err
	}
	if result.Status != "SUCCESS" {
		if result.ErrorMessage != "" {
			return nil, errors.New(result.ErrorMessage)
		}
		return nil, errors.New("subscription processing failed")
	}

	go func() {
		_ = s.notifClient.SendPurchaseReceipt(context.Background(), clients.ReceiptData{
			UserID:        userID,
			PlanName:      plan.Name,
			Amount:        plan.PriceUSD * exchangeRate,
			Currency:      currency,
			TransactionID: result.PaymentID,
		})
	}()

	return result, nil
}

func (s *subscriptionService) Cancel(ctx context.Context, userID, reason string) error {
	return s.repo.CancelByUserID(ctx, userID, reason)
}

func (s *subscriptionService) GetUserSubscription(ctx context.Context, userID string) (*Subscription, bool, error) {
	sub, err := s.repo.FindActiveByUserID(ctx, userID)
	if err != nil {
		return nil, false, err
	}
	if sub == nil {
		return nil, false, nil
	}
	return sub, true, nil
}
