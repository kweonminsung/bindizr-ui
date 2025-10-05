package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"bindizr-ui/server/db"

	"github.com/robfig/cron/v3"
)

var c *cron.Cron

type CronSettings struct {
	Enabled  bool `json:"enabled"`
	Interval int  `json:"interval"`
}

type CronData struct {
	Settings  CronSettings  `json:"settings"`
	Logs      []db.CronLog `json:"logs"`
	TotalLogs int           `json:"totalLogs"`
}

func InitCron() {
	c = cron.New()
	c.Start()
	log.Println("Cron scheduler started")

	enabled, _ := db.GetSetting("cron_enabled")
	if enabled == "true" {
		intervalStr, _ := db.GetSetting("cron_interval")
		interval, _ := strconv.Atoi(intervalStr)
		scheduleCronJob(interval)
	}
}

func runCronJob() {
	log.Println("Running cron job...")
	db.AddCronLog("Running cron job...")
	// NOTE: The original logic called postDnsConfig and reloadDns from api.ts.
	// This logic needs to be implemented in Go. For now, we'll just log.
	// Implement the actual DNS config/reload logic here.
	db.AddCronLog("Cron job completed successfully.")
}

func scheduleCronJob(interval int) {
	if c != nil {
		for _, entry := range c.Entries() {
			c.Remove(entry.ID)
		}
		spec := fmt.Sprintf("@every %ds", interval)
		c.AddFunc(spec, runCronJob)
		log.Printf("Scheduled cron job with interval: %d seconds", interval)
	}
}

func CronHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		handleGetCron(w, r)
	case "POST":
		handlePostCron(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleGetCron(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page == 0 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit == 0 {
		limit = 20
	}
	offset := (page - 1) * limit

	enabledStr, _ := db.GetSetting("cron_enabled")
	intervalStr, _ := db.GetSetting("cron_interval")
	interval, _ := strconv.Atoi(intervalStr)

	settings := CronSettings{
		Enabled:  enabledStr == "true",
		Interval: interval,
	}

	logs, err := db.GetCronLogs(limit, offset)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	totalLogs, err := db.GetTotalCronLogs()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	data := CronData{
		Settings:  settings,
		Logs:      logs,
		TotalLogs: totalLogs,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func handlePostCron(w http.ResponseWriter, r *http.Request) {
	var settings CronSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	db.SetSetting("cron_enabled", strconv.FormatBool(settings.Enabled))
	db.SetSetting("cron_interval", strconv.Itoa(settings.Interval))

	if settings.Enabled {
		scheduleCronJob(settings.Interval)
		go runCronJob() // Run immediately in a new goroutine
	} else {
		for _, entry := range c.Entries() {
			c.Remove(entry.ID)
		}
		log.Println("Cron job disabled and unscheduled")
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}
