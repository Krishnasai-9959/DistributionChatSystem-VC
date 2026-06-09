package database

import (
	"context"
	"fmt"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var DB *mongo.Database

func ConnectDB() {

	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
	}

	client, err := mongo.Connect(
		context.TODO(),
		options.Client().ApplyURI(mongoURI),
	)

	if err != nil {
		fmt.Println("Error connecting to MongoDB:", err)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err = client.Ping(ctx, nil)

	if err != nil {
		fmt.Println("MongoDB Ping Error:", err)
		return
	}

	fmt.Println("Connected to MongoDB!")

	DB = client.Database("chatapp")

	// Ensure Indexes for fast messaging and conversation queries
	messagesCol := DB.Collection("messages")
	_, err = messagesCol.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "sender_id", Value: 1},
				{Key: "receiver_id", Value: 1},
				{Key: "created_at", Value: -1},
			},
		},
		{
			Keys: bson.D{
				{Key: "sender_id", Value: 1},
				{Key: "created_at", Value: -1},
			},
		},
		{
			Keys: bson.D{
				{Key: "receiver_id", Value: 1},
				{Key: "created_at", Value: -1},
			},
		},
	})
	if err != nil {
		fmt.Println("Warning: Failed to create database indexes:", err)
	} else {
		fmt.Println("MongoDB Indexes ensured successfully!")
	}
}