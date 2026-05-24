package routes

import (
	"backEnd/controllers"
	"backEnd/middleware"

	"github.com/gin-gonic/gin"
)

func AuthRoutes(router *gin.Engine) {

	// Public routes
	router.POST("/register", controllers.Register)
	router.POST("/login", controllers.Login)

	// Protected routes
	protected := router.Group("/api")

	protected.Use(middleware.AuthMiddleware())

	protected.GET("/profile", func(c *gin.Context) {

		user, exists := c.Get("user")

		if !exists {

			c.JSON(401, gin.H{
				"error": "User not found",
			})

			return
		}

		c.JSON(200, gin.H{
			"message": "Protected route accessed",
			"user":    user,
		})
	})
}