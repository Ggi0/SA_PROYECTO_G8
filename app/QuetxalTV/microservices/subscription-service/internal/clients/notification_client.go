package clients

import (
	"context"
	"fmt"
	"os"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	notifpb "subscription-service/proto/notification"
)

type ReceiptData struct {
	UserID        string
	UserEmail     string
	PlanName      string
	Amount        float64
	Currency      string
	TransactionID string
}

type NotificationClient interface {
	SendPurchaseReceipt(ctx context.Context, data ReceiptData) error
}

type notificationGRPCClient struct {
	client notifpb.NotificationServiceClient
}

type noopNotificationClient struct{}

func NewNotificationClient() (NotificationClient, error) {
	host := os.Getenv("NOTIFICATION_SERVICE_HOST")
	if host == "" {
		host = "notification-service:50056"
	}

	conn, err := grpc.Dial(host, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, fmt.Errorf("connect notification service: %w", err)
	}
	return &notificationGRPCClient{client: notifpb.NewNotificationServiceClient(conn)}, nil
}

func NewNoopNotificationClient() NotificationClient {
	return noopNotificationClient{}
}

func (c *notificationGRPCClient) SendPurchaseReceipt(ctx context.Context, data ReceiptData) error {
	_, err := c.client.SendPurchaseReceipt(ctx, &notifpb.SendPurchaseReceiptRequest{
		UserId:        data.UserID,
		UserEmail:     data.UserEmail,
		PlanName:      data.PlanName,
		Amount:        data.Amount,
		Currency:      data.Currency,
		TransactionId: data.TransactionID,
	})
	return err
}

func (noopNotificationClient) SendPurchaseReceipt(context.Context, ReceiptData) error {
	return nil
}
