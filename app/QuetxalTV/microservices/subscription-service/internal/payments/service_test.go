package payments

import (
	"context"
	"testing"
)

type fakePaymentRepo struct {
	limit  int
	offset int
}

func (r *fakePaymentRepo) FindByUserID(_ context.Context, _ string, limit, offset int) ([]Payment, int, error) {
	r.limit = limit
	r.offset = offset
	return []Payment{{ID: "payment-1", PlanName: "Basic"}}, 1, nil
}

func TestGetPaymentHistoryDelegatesPagination(t *testing.T) {
	repo := &fakePaymentRepo{}
	service := NewService(repo)

	items, total, err := service.GetPaymentHistory(context.Background(), "user-1", 20, 5)
	if err != nil {
		t.Fatalf("GetPaymentHistory returned error: %v", err)
	}
	if total != 1 || len(items) != 1 || items[0].ID != "payment-1" {
		t.Fatalf("unexpected history: total=%d items=%#v", total, items)
	}
	if repo.limit != 20 || repo.offset != 5 {
		t.Fatalf("pagination not delegated: limit=%d offset=%d", repo.limit, repo.offset)
	}
}
