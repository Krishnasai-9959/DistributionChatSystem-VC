package controllers

import (
	"fmt"
	"net/http"
	"os"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ZEGOCLOUD/zego_server_assistant/token/go/src/token04"
)

func GenerateZegoToken(c *gin.Context) {
	appIDStr := os.Getenv("ZEGO_APP_ID")
	serverSecret := os.Getenv("ZEGO_SERVER_SECRET")

	if appIDStr == "" || serverSecret == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ZegoCloud configuration is missing on server"})
		return
	}

	appIDParsed, err := strconv.ParseUint(appIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid ZEGO_APP_ID config"})
		return
	}
	appID := uint32(appIDParsed)

	// Get the user ID from the JWT token (set by AuthMiddleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	userIdStr := fmt.Sprintf("%v", userID)

	// Token configuration
	// Token expires in 24 hours (86400 seconds)
	var effectiveTimeInSeconds int64 = 86400
	var payload = ""

	token, err := token04.GenerateToken04(appID, userIdStr, serverSecret, effectiveTimeInSeconds, payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
	})
}
