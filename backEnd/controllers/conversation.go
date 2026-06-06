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
			{
				"sender_id": userID,
			},
			{
				"receiver_id": userID,
			},
		},
	}

	cursor, err := messageCollection.Find(
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

	conversationMap :=
		make(map[string]models.Conversation)

	for _, msg := range messages {

		partnerID := msg.SenderID

		if msg.SenderID == userID {

			partnerID = msg.ReceiverID
		}

		existingConversation,
			exists :=
			conversationMap[partnerID]

		if exists &&
			!msg.CreatedAt.After(
				existingConversation.LastMessageTime,
			) {

			continue
		}

		username := "Unknown User"

		objectID, err :=
			primitive.ObjectIDFromHex(
				partnerID,
			)

		if err == nil {

			var user models.User

			err = userCollection.FindOne(
				ctx,
				bson.M{
					"_id": objectID,
				},
			).Decode(&user)

			if err == nil {

				username =
					user.Username
			}
		}

		conversationMap[partnerID] =
			models.Conversation{

				UserID: partnerID,

				Username: username,

				LastMessage:
					msg.Content,

				LastMessageTime:
					msg.CreatedAt,

				UnreadCount: 0,
			}
	}

	var conversations []models.Conversation

	for _, conversation :=
		range conversationMap {

		conversations =
			append(
				conversations,
				conversation,
			)
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"conversations": conversations,
		},
	)
}