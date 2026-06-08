package plans

import "context"

type Service interface {
	GetAllPlans(ctx context.Context) ([]Plan, error)
	GetPlanByID(ctx context.Context, id string) (*Plan, error)
}

type planService struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &planService{repo: repo}
}

func (s *planService) GetAllPlans(ctx context.Context) ([]Plan, error) {
	return s.repo.FindAll(ctx)
}

func (s *planService) GetPlanByID(ctx context.Context, id string) (*Plan, error) {
	return s.repo.FindByID(ctx, id)
}
