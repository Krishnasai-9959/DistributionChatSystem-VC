package controllers

import (
	"backEnd/database"
	"backEnd/models"
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
)

func GetConversations(c *gin.Context) {

	userID := c.GetString("user_id")

	collection := database.DB.Collection("messages")

	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer cancel()

	filter := bson.M{
		"$or": []bson.M{
			{"sender_id": userID},
			{"receiver_id": userID},
		},
	}

	cursor, err := collection.Find(
		ctx,
		filter,
	)

	if err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch conversations",
		})

		return
	}

	defer cursor.Close(ctx)

	var messages []models.Message

	if err := cursor.All(
		ctx,
		&messages,
	); err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to decode messages",
		})

		return
	}

	conversationMap := make(map[string]models.Conversation)

	for _, msg := range messages {

		partnerID := msg.SenderID

		if msg.SenderID == userID {
			partnerID = msg.ReceiverID
		}

		existing, found := conversationMap[partnerID]

		if !found || msg.CreatedAt.After(existing.LastMessageTime) {

			conversationMap[partnerID] = models.Conversation{
				UserID:          partnerID,
				LastMessage:     msg.Content,
				LastMessageTime: msg.CreatedAt,
				UnreadCount:     0,
			}
		}
	}

	var conversations []models.Conversation

	for _, conv := range conversationMap {
		conversations = append(
			conversations,
			conv,
		)
	}

	c.JSON(http.StatusOK, gin.H{
		"conversations": conversations,
	})
}