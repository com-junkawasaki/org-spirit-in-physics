package handlers

import (
	"context"
)

// IsAuthenticated checks if the request is authenticated
// This is a placeholder - implement based on your auth middleware
func IsAuthenticated(ctx context.Context) bool {
	// Check if user_id exists in context (set by auth middleware)
	_, ok := ctx.Value("user_id").(string)
	return ok
}
