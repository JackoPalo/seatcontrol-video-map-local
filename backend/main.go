// SeatControl video-map showcase API.
//
// Serves the mock catalogue of vehicle-recorded videos so the frontend can plot
// "videos uploaded per day" on a map. Data is embedded at build time from
// data/videos.json; there is no database yet — this is a Future Feature demo.
package main

import (
	_ "embed"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"
)

//go:embed data/videos.json
var videosJSON []byte

// Video is one clip captured by an on-vehicle device while parked with enough
// ambient light. Mirrors the payload the Android app reports over WebSocket
// (id / lat / lng / time) plus catalogue fields for the showcase.
type Video struct {
	ID          int     `json:"id"`
	DeviceID    string  `json:"deviceId"`
	City        string  `json:"city"`
	Address     string  `json:"address"`
	Lat         float64 `json:"lat"`
	Lng         float64 `json:"lng"`
	RecordedAt  string  `json:"recordedAt"`
	Date        string  `json:"date"`
	DurationSec int     `json:"durationSec"`
	LightLux    int     `json:"lightLux"`
	URL         string  `json:"url"`
	Thumbnail   string  `json:"thumbnail"`
}

// DayCount is the per-day rollup used to render the sidebar / timeline.
type DayCount struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

var videos []Video

func main() {
	if err := json.Unmarshal(videosJSON, &videos); err != nil {
		log.Fatalf("parsing embedded videos.json: %v", err)
	}
	sort.Slice(videos, func(i, j int) bool { return videos[i].RecordedAt < videos[j].RecordedAt })

	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", handleHealth)
	mux.HandleFunc("/api/videos", handleVideos)
	mux.HandleFunc("/api/summary", handleSummary)

	addr := ":" + envOr("PORT", "8080")
	log.Printf("seatcontrol-video-map api listening on %s (%d videos)", addr, len(videos))
	if err := http.ListenAndServe(addr, withCORS(withLogging(mux))); err != nil {
		log.Fatal(err)
	}
}

func handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "videos": len(videos)})
}

// handleVideos returns the catalogue, optionally narrowed by ?date=YYYY-MM-DD
// or an explicit ?from / ?to range (inclusive, on the calendar date).
func handleVideos(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	date := q.Get("date")
	from := q.Get("from")
	to := q.Get("to")

	out := make([]Video, 0, len(videos))
	for _, v := range videos {
		if date != "" && v.Date != date {
			continue
		}
		if from != "" && v.Date < from {
			continue
		}
		if to != "" && v.Date > to {
			continue
		}
		out = append(out, v)
	}
	writeJSON(w, http.StatusOK, out)
}

// handleSummary returns every active day with its video count, oldest first.
func handleSummary(w http.ResponseWriter, _ *http.Request) {
	counts := map[string]int{}
	for _, v := range videos {
		counts[v.Date]++
	}
	days := make([]DayCount, 0, len(counts))
	for d, c := range counts {
		days = append(days, DayCount{Date: d, Count: c})
	}
	sort.Slice(days, func(i, j int) bool { return days[i].Date < days[j].Date })
	writeJSON(w, http.StatusOK, days)
}

// --- helpers ---

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s%s %s", r.Method, r.URL.Path, querySuffix(r), time.Since(start))
	})
}

func querySuffix(r *http.Request) string {
	if r.URL.RawQuery == "" {
		return ""
	}
	return "?" + r.URL.RawQuery
}

func envOr(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}
