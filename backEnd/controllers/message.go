package controllers

import (
	"backEnd/database"
	"backEnd/models"
	"backEnd/utils"
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/bson/primitive"
)
func GetChatHistory(c *gin.Context) {
	// GET AUTHORIZATION HEADER

	authHeader := c.GetHeader("Authorization")

	if authHeader == "" {

		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authorization header missing",
		})

		return
	}

	// EXTRACT TOKEN
	tokenParts := strings.Split(authHeader, " ")

	if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {

		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid authorization format",
		})

		return
	}

	tokenString := tokenParts[1]

	// VALIDATE TOKEN
	
	token, err := utils.ValidateAccessToken(tokenString)

	if err != nil || !token.Valid {

		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid or expired token",
		})

		return
	}	
	// EXTRACT CLAIMS
	claims, ok := token.Claims.(jwt.MapClaims)

	if !ok {

		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid token claims",
		})

		return
	}
	// AUTHENTICATED USER
	
	userID := fmt.Sprintf("%v", claims["user_id"])
	// CHAT PARTNER ID
	receiverID := c.Param("receiverId")
	// MONGODB QUERY
	collection := database.DB.Collection("messages")

	filter := bson.M{
		"$or": []bson.M{
			{
				"sender_id":   userID,
				"receiver_id": receiverID,
			},
			{
				"sender_id":   receiverID,
				"receiver_id": userID,
			},
		},
	}

	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)

	defer cancel()

	page:=1
	limit:=50

	if p := c.Query("page"); p != "" {
		fmt.Sscanf(p, "%d", &page)
		if page < 1 {
			page = 1
		}
	}
	skip := (page - 1) * limit
	totlmessages, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to count messages",
		})
		return
	}
	findOptions := options.Find()

	findOptions.SetSort(
		bson.D{
			{
				Key:   "created_at",
				Value: -1,
			},
		},
	)

	findOptions.SetSkip(int64(skip))
	findOptions.SetLimit(int64(limit))

	cursor, err := collection.Find(
		ctx,
		filter,
		findOptions,
	)

	

	if err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch messages",
		})

		return
	}

	defer cursor.Close(ctx)

	var messages []models.Message

	if err = cursor.All(
		ctx,
		&messages,
	); err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to decode messages",
		})

		return
	}

	// Reverse messages slice to return in chronological order (oldest first)
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	c.JSON(http.StatusOK, gin.H{
    "messages": messages,
    "page":     page,
    "limit":    limit,
    "total":    totlmessages,
})
}

func SaveMessage(msg *models.Message) error {

	collection := database.DB.Collection("messages")

	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer cancel()

	msg.CreatedAt = time.Now()

	result, err := collection.InsertOne(
		ctx,
		msg,
	)

	if err != nil {
		return err
	}

	if objectID, ok := result.InsertedID.(primitive.ObjectID); ok {
		msg.ID = objectID
	}

	return nil
}