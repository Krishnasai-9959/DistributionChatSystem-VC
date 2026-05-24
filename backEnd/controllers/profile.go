package controllers

import (
	"backEnd/database"
	"backEnd/models"
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func GetProfile(c *gin.Context) {

	// Get user_id from middleware
	userIDValue, exists := c.Get("user_id")

	if !exists {

		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User ID not found in context",
		})

		return
	}

	// Convert interface{} -> string
	userID, ok := userIDValue.(string)

	if !ok {

		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid user ID type",
		})

		return
	}

	fmt.Println("Authenticated UserID:", userID)

	// Convert string -> Mongo ObjectID
	objID, err := primitive.ObjectIDFromHex(userID)

	if err != nil {

		fmt.Println("ObjectID Conversion Error:", err)

		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid ObjectID",
		})

		return
	}

	fmt.Println("Mongo ObjectID:", objID)

	collection := database.DB.Collection("users")

	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)

	defer cancel()

	var user models.User

	// Mongo query
	result := collection.FindOne(
		ctx,
		bson.M{"_id": objID},
	)

	fmt.Println("Mongo Query:", bson.M{"_id": objID})

	err = result.Decode(&user)

	if err != nil {

		fmt.Println("Decode Error:", err)

		c.JSON(http.StatusNotFound, gin.H{
			"error": err.Error(),
		})

		return
	}

	// Success response
	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":         user.ID.Hex(),
			"username":   user.Username,
			"email":      user.Email,
			"created_at": user.CreatedAt,
		},
	})
}