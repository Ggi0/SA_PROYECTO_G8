package payments

import (
	"context"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	pb "subscription-service/proto/subscription"
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

func TestGetPaymentHistoryHandlerMapsPayments(t *testing.T) {
	repo := &fakePaymentRepo{}
	handler := NewHandler(NewService(repo))

	resp, err := handler.GetPaymentHistory(context.Background(), &pb.GetPaymentHistoryRequest{UserId: "user-1", Limit: 10, Offset: 2})
	if err != nil {
		t.Fatalf("GetPaymentHistory returned error: %v", err)
	}
	if resp.Total != 1 || len(resp.Payments) != 1 || resp.Payments[0].Id != "payment-1" {
		t.Fatalf("unexpected response: %#v", resp)
	}
	if repo.limit != 10 || repo.offset != 2 {
		t.Fatalf("pagination not delegated: limit=%d offset=%d", repo.limit, repo.offset)
	}
}

func TestGetPaymentHistoryHandlerRejectsMissingUser(t *testing.T) {
	handler := NewHandler(NewService(&fakePaymentRepo{}))
	_, err := handler.GetPaymentHistory(context.Background(), &pb.GetPaymentHistoryRequest{})
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("expected InvalidArgument, got %v", err)
	}
}
