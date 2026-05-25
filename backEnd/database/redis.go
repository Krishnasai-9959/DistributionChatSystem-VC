package database

import (
	"context"
	"fmt"
	"os"

	"github.com/go-redis/redis/v8"
)

var RedisClient *redis.Client

var Ctx = context.Background()

func ConnectRedis() *redis.Client {

	RedisClient = redis.NewClient(&redis.Options{
		Addr:     os.Getenv("REDIS_ADDR"),
		Password: os.Getenv("REDIS_PASSWORD"),
		DB:       0,
	})

	_, err := RedisClient.Ping(Ctx).Result()

	if err != nil {
		panic(err)
	}

	fmt.Println("Connected to Redis successfully")

	return RedisClient
}
