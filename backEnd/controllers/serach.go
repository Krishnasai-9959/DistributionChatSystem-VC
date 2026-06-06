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

func SearchUsers(c *gin.Context) {

	userID := c.GetString("user_id")

	query := c.Query("q")

	if query == "" {

		c.JSON(http.StatusOK, gin.H{
			"users": []models.SearchUser{},
		})

		return
	}

	collection := database.DB.Collection("users")

	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer cancel()

	filter := bson.M{
		"username": bson.M{
			"$regex":   query,
			"$options": "i",
		},
	}

	cursor, err := collection.Find(
		ctx,
		filter,
	)

	if err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to search users",
		})

		return
	}

	defer cursor.Close(ctx)

	var users []models.User

	if err := cursor.All(
		ctx,
		&users,
	); err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to decode users",
		})

		return
	}

	var results []models.SearchUser

	for _, user := range users {

		// don't show current user

		if user.ID.Hex() == userID {
			continue
		}

		results = append(
			results,
			models.SearchUser{
				ID:       user.ID.Hex(),
				Username: user.Username,
			},
		)
	}

	c.JSON(http.StatusOK, gin.H{
		"users": results,
	})
}