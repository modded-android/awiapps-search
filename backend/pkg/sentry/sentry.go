package sentry

import (
	"context"
	"log"
	"time"

	"github.com/awfixer/search/backend/internal/config"
	"github.com/getsentry/sentry-go"
)

// Initialize sets up Sentry with the provided configuration
func Initialize(cfg *config.Config) error {
	if cfg.SentryDSN == "" {
		log.Println("Warning: Sentry DSN not configured. Error monitoring disabled.")
		return nil
	}
	
	err := sentry.Init(sentry.ClientOptions{
		Dsn:              cfg.SentryDSN,
		Environment:      cfg.SentryEnvironment,
		Release:          cfg.SentryRelease,
		Debug:            cfg.Debug,
		TracesSampleRate: 1.0,
		BeforeSend: func(event *sentry.Event, hint *sentry.EventHint) *sentry.Event {
			// Filter out sensitive information
			if event.Request != nil {
				// Remove sensitive headers
				for key := range event.Request.Headers {
					if key == "Authorization" || key == "X-API-Key" {
						delete(event.Request.Headers, key)
					}
				}
			}
			return event
		},
	})
	
	if err != nil {
		return err
	}
	
	log.Printf("Sentry initialized successfully for environment: %s", cfg.SentryEnvironment)
	return nil
}

// CaptureError captures an error with additional context
func CaptureError(err error, tags map[string]string, extra map[string]interface{}) {
	sentry.WithScope(func(scope *sentry.Scope) {
		// Add tags
		for key, value := range tags {
			scope.SetTag(key, value)
		}
		
		// Add extra context
		for key, value := range extra {
			scope.SetExtra(key, value)
		}
		
		sentry.CaptureException(err)
	})
}

// CaptureMessage captures a message with severity level
func CaptureMessage(message string, level sentry.Level, tags map[string]string) {
	sentry.WithScope(func(scope *sentry.Scope) {
		scope.SetLevel(level)
		
		for key, value := range tags {
			scope.SetTag(key, value)
		}
		
		sentry.CaptureMessage(message)
	})
}

// StartTransaction starts a new performance transaction
func StartTransaction(name, op string) *sentry.Span {
	ctx := sentry.SetHubOnContext(context.Background(), sentry.CurrentHub().Clone())
	return sentry.StartTransaction(ctx, name, sentry.WithOpName(op))
}

// Flush waits for all events to be sent to Sentry
func Flush(timeout time.Duration) bool {
	return sentry.Flush(timeout)
}