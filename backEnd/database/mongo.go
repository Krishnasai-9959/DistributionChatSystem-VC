package database

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var DB *mongo.Database

func ConnectDB() {

	client, err := mongo.Connect(
		context.TODO(),
		options.Client().ApplyURI("mongodb://localhost:27017"),
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
}