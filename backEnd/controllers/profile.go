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
			"id":          user.ID.Hex(),
			"username":    user.Username,
			"email":       user.Email,
			"profile_pic": user.ProfilePic,
			"bio":         user.Bio,
			"created_at":  user.CreatedAt,
		},
	})
}

func UpdateProfile(c *gin.Context) {
	// Get user_id from middleware
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User ID not found in context",
		})
		return
	}

	userID, ok := userIDValue.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid user ID type",
		})
		return
	}

	var req struct {
		ProfilePic string `json:"profile_pic"`
		Bio        string `json:"bio"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	objID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid ObjectID",
		})
		return
	}

	collection := database.DB.Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	update := bson.M{
		"$set": bson.M{
			"profile_pic": req.ProfilePic,
			"bio":         req.Bio,
		},
	}

	_, err = collection.UpdateOne(ctx, bson.M{"_id": objID}, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update profile",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
	})
}
