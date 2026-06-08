package payments

import "context"

type Service interface {
	GetPaymentHistory(ctx context.Context, userID string, limit, offset int) ([]Payment, int, error)
}

type paymentService struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &paymentService{repo: repo}
}

func (s *paymentService) GetPaymentHistory(ctx context.Context, userID string, limit, offset int) ([]Payment, int, error) {
	return s.repo.FindByUserID(ctx, userID, limit, offset)
}
