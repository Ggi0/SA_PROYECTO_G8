package clients

import (
	"context"
	"fmt"
	"os"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	fxpb "subscription-service/proto/fx"
)

type FXClient interface {
	GetExchangeRate(ctx context.Context, from, to string) (float64, error)
}

type fxGRPCClient struct {
	client fxpb.FXServiceClient
}

type fallbackFXClient struct{}

func NewFXClient() (FXClient, error) {
	host := os.Getenv("FX_SERVICE_HOST")
	if host == "" {
		host = "fx-service:50055"
	}

	conn, err := grpc.Dial(host, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, fmt.Errorf("connect FX service: %w", err)
	}
	return &fxGRPCClient{client: fxpb.NewFXServiceClient(conn)}, nil
}

func NewFallbackFXClient() FXClient {
	return fallbackFXClient{}
}

func (c *fxGRPCClient) GetExchangeRate(ctx context.Context, from, to string) (float64, error) {
	if from == to || to == "" {
		return 1, nil
	}

	resp, err := c.client.GetExchangeRate(ctx, &fxpb.GetExchangeRateRequest{FromCurrency: from, ToCurrency: to})
	if err != nil {
		return 1, fmt.Errorf("get exchange rate: %w", err)
	}
	if resp.GetRate() <= 0 {
		return 1, fmt.Errorf("invalid exchange rate")
	}
	return resp.GetRate(), nil
}

func (fallbackFXClient) GetExchangeRate(_ context.Context, from, to string) (float64, error) {
	return 1, nil
}
