package main

import (
	"backEnd/database"
	"backEnd/routes"
	"backEnd/websocket"
	"log"
	"os"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {

	if err := godotenv.Load(); err != nil {
		log.Println(".env not found, using environment variables")
	}

	database.ConnectDB()
	database.ConnectRedis()

	router := gin.Default()

	router.Use(cors.New(cors.Config{

		AllowOriginFunc: func(origin string) bool {

			allowedOrigins := map[string]bool{

				"http://localhost:5173": true,

				"http://127.0.0.1:5173": true,

				"https://distribution-chat-system-vc.vercel.app": true,
			}

			if allowedOrigins[origin] {
				return true
			}

			if strings.HasPrefix(origin, "https://distribution-chat-system") && strings.HasSuffix(origin, ".vercel.app") {
				return true
			}

			if extraOrigins := os.Getenv("ALLOWED_ORIGINS"); extraOrigins != "" {

				for _, allowed := range strings.Split(extraOrigins, ",") {

					if strings.TrimSpace(allowed) == origin {
						return true
					}
				}
			}

			return false
		},

		AllowMethods: []string{
			"GET",
			"POST",
			"PUT",
			"PATCH",
			"DELETE",
			"OPTIONS",
		},

		AllowHeaders: []string{
			"Origin",
			"Content-Type",
			"Authorization",
		},

		ExposeHeaders: []string{
			"Content-Length",
		},

		AllowCredentials: true,
	}))

	router.GET("/", func(c *gin.Context) {

		c.JSON(200, gin.H{
			"message": "Server is running",
		})
	})

	routes.AuthRoutes(router)

	router.GET(
		"/ws",
		websocket.HandleConnections,
	)

	go websocket.HandleMessages()



	port := os.Getenv("PORT")

	if port == "" {

		port = "8080"
	}

	log.Println(
		"Server running on port:",
		port,
	)

	err := router.Run(
		":" + port,
	)

	if err != nil {

		log.Fatal(err)
	}
}
