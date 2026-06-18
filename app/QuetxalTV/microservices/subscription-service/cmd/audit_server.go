package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
)

type AuditLog struct {
	LogID          int64           `json:"log_id"`
	UserID         *string         `json:"user_id"`
	SubscriptionID *string         `json:"subscription_id"`
	EventType      string          `json:"event_type"`
	OldData        json.RawMessage `json:"old_data"`
	NewData        json.RawMessage `json:"new_data"`
	CreatedAt      string          `json:"created_at"`
}

type AuditResponse struct {
	Data  []AuditLog `json:"data"`
	Total int        `json:"total"`
}

func startAuditServer(db *sql.DB) {
	port := os.Getenv("AUDIT_HTTP_PORT")
	if port == "" {
		port = "8083"
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/audit/logs", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Parámetros de paginación
		limitStr := r.URL.Query().Get("limit")
		offsetStr := r.URL.Query().Get("offset")
		limit := 100
		offset := 0

		if limitStr != "" {
			if v, err := strconv.Atoi(limitStr); err == nil && v > 0 {
				limit = v
			}
		}
		if offsetStr != "" {
			if v, err := strconv.Atoi(offsetStr); err == nil && v >= 0 {
				offset = v
			}
		}

		// Contar total
		var total int
		err := db.QueryRowContext(r.Context(),
			`SELECT COUNT(*) FROM subscription.audit_log`,
		).Scan(&total)
		if err != nil {
			http.Error(w, `{"error":"db error"}`, http.StatusInternalServerError)
			return
		}

		// Obtener logs
		rows, err := db.QueryContext(r.Context(), `
			SELECT
				log_id,
				user_id::text,
				subscription_id::text,
				event_type,
				old_data,
				new_data,
				created_at::text
			FROM subscription.audit_log
			ORDER BY created_at DESC
			LIMIT $1 OFFSET $2
		`, limit, offset)
		if err != nil {
			http.Error(w, `{"error":"query error"}`, http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		logs := []AuditLog{}
		for rows.Next() {
			var al AuditLog
			var oldData, newData []byte
			err := rows.Scan(
				&al.LogID,
				&al.UserID,
				&al.SubscriptionID,
				&al.EventType,
				&oldData,
				&newData,
				&al.CreatedAt,
			)
			if err != nil {
				continue
			}
			if oldData != nil {
				al.OldData = json.RawMessage(oldData)
			}
			if newData != nil {
				al.NewData = json.RawMessage(newData)
			}
			logs = append(logs, al)
		}

		resp := AuditResponse{Data: logs, Total: total}
		json.NewEncoder(w).Encode(resp)
	})

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	log.Printf("Audit HTTP server listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Printf("Audit HTTP server error: %v", err)
	}
}
