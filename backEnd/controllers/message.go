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
)


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

	cursor, err := collection.Find(
		ctx,
		filter,
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

	c.JSON(http.StatusOK, gin.H{
		"messages": messages,
	})
}

func SaveMessage(msg models.Message) error {

	collection := database.DB.Collection("messages")

	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer cancel()

	msg.CreatedAt = time.Now()

	_, err := collection.InsertOne(
		ctx,
		msg,
	)

	return err
}