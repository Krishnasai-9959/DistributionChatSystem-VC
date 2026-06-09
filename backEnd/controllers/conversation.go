package controllers

import (
	"backEnd/database"
	"backEnd/models"
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func GetConversations(c *gin.Context) {
	userID := c.GetString("user_id")

	messageCollection := database.DB.Collection("messages")
	userCollection := database.DB.Collection("users")

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

	// Sort messages by created_at descending so we see latest messages first
	findOptions := options.Find()
	findOptions.SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := messageCollection.Find(
		ctx,
		filter,
		findOptions,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch conversations",
		})
		return
	}
	defer cursor.Close(ctx)

	var messages []models.Message
	if err := cursor.All(ctx, &messages); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to decode messages",
		})
		return
	}

	// Group latest message per unique partner ID
	latestMessages := make(map[string]models.Message)
	var partnerIDs []string

	for _, msg := range messages {
		partnerID := msg.SenderID
		if msg.SenderID == userID {
			partnerID = msg.ReceiverID
		}

		if _, exists := latestMessages[partnerID]; !exists {
			latestMessages[partnerID] = msg
			partnerIDs = append(partnerIDs, partnerID)
		}
	}

	// Fetch all unique partner user profiles in a single query to avoid N+1 queries
	userMap := make(map[string]models.User)
	if len(partnerIDs) > 0 {
		var objectIDs []primitive.ObjectID
		for _, pid := range partnerIDs {
			if oID, err := primitive.ObjectIDFromHex(pid); err == nil {
				objectIDs = append(objectIDs, oID)
			}
		}

		if len(objectIDs) > 0 {
			userCursor, err := userCollection.Find(ctx, bson.M{"_id": bson.M{"$in": objectIDs}})
			if err == nil {
				defer userCursor.Close(ctx)
				var users []models.User
				if err = userCursor.All(ctx, &users); err == nil {
					for _, u := range users {
						userMap[u.ID.Hex()] = u
					}
				}
			}
		}
	}

	// Build the conversation structs in original order
	conversations := []models.Conversation{}
	for _, pid := range partnerIDs {
		msg := latestMessages[pid]
		user, exists := userMap[pid]
		username := "Unknown User"
		profilePic := ""
		bio := ""
		if exists {
			username = user.Username
			profilePic = user.ProfilePic
			bio = user.Bio
		}

		conversations = append(conversations, models.Conversation{
			UserID:          pid,
			Username:        username,
			LastMessage:     msg.Content,
			LastMessageTime: msg.CreatedAt,
			UnreadCount:     0,
			ProfilePic:      profilePic,
			Bio:             bio,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"conversations": conversations,
	})
}