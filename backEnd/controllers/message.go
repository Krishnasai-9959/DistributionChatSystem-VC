package controllers

import (
	"backEnd/database"
	"backEnd/models"
	"context"
	"time"
)

func SaveMessage(msg models.Message) error {
	collection := database.DB.Collection("messages")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	msg.CreatedAt = time.Now()

	_, err := collection.InsertOne(ctx, msg)
	return err
}
