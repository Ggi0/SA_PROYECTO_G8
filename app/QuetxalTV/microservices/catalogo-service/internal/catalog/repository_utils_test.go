package catalog

import (
	"testing"
)

func TestNullableStr_Empty(t *testing.T) {
	result := nullableStr("")
	if result != nil {
		t.Fatalf("expected nil for empty string, got %v", result)
	}
}

func TestNullableStr_NonEmpty(t *testing.T) {
	result := nullableStr("hello")
	s, ok := result.(string)
	if !ok {
		t.Fatal("expected string type")
	}
	if s != "hello" {
		t.Fatalf("expected 'hello', got %q", s)
	}
}

func TestNullableInt_Zero(t *testing.T) {
	result := nullableInt(0)
	if result != nil {
		t.Fatalf("expected nil for zero int, got %v", result)
	}
}

func TestNullableInt_NonZero(t *testing.T) {
	result := nullableInt(42)
	v, ok := result.(int)
	if !ok {
		t.Fatal("expected int type")
	}
	if v != 42 {
		t.Fatalf("expected 42, got %d", v)
	}
}

func TestNewRepository_NotNil(t *testing.T) {
	repo := NewRepository(nil)
	if repo == nil {
		t.Fatal("NewRepository devolvió nil")
	}
}
