package auth

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/clerkinc/clerk-sdk-go/clerk"
)

// ClerkAuth handles Clerk authentication
type ClerkAuth struct {
	client clerk.Client
}

// NewClerkAuth creates a new ClerkAuth instance
func NewClerkAuth(apiKey string) (*ClerkAuth, error) {
	client, err := clerk.NewClient(apiKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create Clerk client: %w", err)
	}

	return &ClerkAuth{
		client: client,
	}, nil
}

// Middleware returns an HTTP middleware that validates Clerk tokens
func (a *ClerkAuth) Middleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract token from Authorization header
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "Missing authorization header", http.StatusUnauthorized)
				return
			}

			// Remove "Bearer " prefix if present
			token := strings.TrimPrefix(authHeader, "Bearer ")

			// Verify token with Clerk
			sessionClaims, err := a.client.VerifyToken(token)
			if err != nil {
				http.Error(w, fmt.Sprintf("Invalid token: %v", err), http.StatusUnauthorized)
				return
			}

			// Add user information to request context
			ctx := context.WithValue(r.Context(), "user_id", sessionClaims.Subject)
			ctx = context.WithValue(ctx, "session_id", sessionClaims.SessionID)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetUserID extracts user ID from context
func GetUserID(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value("user_id").(string)
	return userID, ok
}

// IsAuthenticated checks if the request is authenticated
func IsAuthenticated(ctx context.Context) bool {
	_, ok := GetUserID(ctx)
	return ok
}
