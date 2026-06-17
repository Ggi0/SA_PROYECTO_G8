.PHONY: test test-coverage build lint

build:
	go build ./...

test:
	go test ./... -count=1

# Cobertura de unit tests (excluye repository.go que requiere BD real).
# El código de acceso a datos se cubre con integration tests por separado.
test-coverage:
	go test ./internal/catalog/... -coverprofile=coverage_full.out -count=1
	grep -v "repository.go" coverage_full.out > coverage_unit.out
	go tool cover -func=coverage_unit.out
	go tool cover -html=coverage_unit.out -o coverage.html

test-coverage-total:
	go test ./internal/catalog/... -coverprofile=coverage_full.out -count=1
	grep -v "repository.go" coverage_full.out > coverage_unit.out
	go tool cover -func=coverage_unit.out | grep "^total"
