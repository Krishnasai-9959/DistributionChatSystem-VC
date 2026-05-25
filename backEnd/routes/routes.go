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
	router.POST("/refresh-token", controllers.RefreshToken)
	router.POST("/forgot-password", controllers.ForgotPassword)
	router.POST("/verify-otp", controllers.VerifyOTP)

	// Protected routes
	protected := router.Group("/api")

	protected.Use(middleware.AuthMiddleware())

	protected.GET("/profile", controllers.GetProfile)
	protected.POST("/logout", controllers.Logout)
}
