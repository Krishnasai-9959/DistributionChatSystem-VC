package middleware

import (
	"backEnd/utils"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func AuthMiddleware() gin.HandlerFunc {

	return func(c *gin.Context) {

		// Get Authorization header
		authHeader := c.GetHeader("Authorization")

		if authHeader == "" {

			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authorization header missing",
			})

			c.Abort()
			return
		}

		// Split Bearer token
		tokenParts := strings.Split(authHeader, " ")

		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {

			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid authorization header format",
			})

			c.Abort()
			return
		}

		tokenString := tokenParts[1]

		// Validate token
		token, err := utils.ValidateAccessToken(tokenString)

		if err != nil || !token.Valid {

			fmt.Println("Token Validation Error:", err)

			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid or expired token",
			})

			c.Abort()
			return
		}

		// Extract claims
		claims, ok := token.Claims.(jwt.MapClaims)

		if !ok {

			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid token claims",
			})

			c.Abort()
			return
		}

		// SAFELY extract user_id
		userID := fmt.Sprintf("%v", claims["user_id"])

		fmt.Println("Middleware UserID:", userID)

		// Store in context
		c.Set("user_id", userID)

		// Continue request
		c.Next()
	}
}