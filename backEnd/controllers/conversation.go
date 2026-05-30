package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetConversations(c *gin.Context) {

	userID := c.GetString("user_id")

	c.JSON(http.StatusOK, gin.H{
		"user_id": userID,
		"message": "Conversation API working",
	})
}