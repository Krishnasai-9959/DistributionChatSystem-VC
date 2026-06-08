package controllers

import (
	"backEnd/database"
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func GenerateSocketToken(c *gin.Context) {

	userID := c.GetString("user_id")

	tokenBytes := make([]byte, 32)

	_, err := rand.Read(tokenBytes)

	if err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate socket token",
		})

		return
	}

	socketToken := hex.EncodeToString(
		tokenBytes,
	)

	err = database.RedisClient.Set(
		database.Ctx,
		"socket:"+socketToken,
		userID,
		5*time.Minute,
	).Err()

	if err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to store socket token",
		})

		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": socketToken,
	})
}