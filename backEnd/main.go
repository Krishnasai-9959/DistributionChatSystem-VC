package main

import (
	"backEnd/database"
	"backEnd/routes"
	"backEnd/websocket"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {

	err := godotenv.Load()

	if err != nil {
		log.Fatal("Error loading .env file")
	}

	database.ConnectDB()
	database.ConnectRedis()

	router := gin.Default()

	router.GET("/", func(c *gin.Context) {

		c.JSON(200, gin.H{
			"message": "Server is running",
		})
	})

	routes.AuthRoutes(router)

	// websocket route
	router.GET("/ws", websocket.HandleConnections)

	// start broadcaster
	go websocket.HandleMessages()

	port := os.Getenv("PORT")

	if port == "" {
		port = "8080"
	}

	router.Run(":" + port)
}
