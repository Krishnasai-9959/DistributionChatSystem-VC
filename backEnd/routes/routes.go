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
	router.POST("/resend-otp", controllers.ResendOTP)

	router.POST("/reset-password", controllers.ResetPassword)

	// Protected routes
	protected := router.Group("/api")

	protected.Use(middleware.AuthMiddleware())

	protected.GET("/profile", controllers.GetProfile)
	protected.POST("/logout", controllers.Logout)
	protected.GET("/messages/:receiverId",controllers.GetChatHistory,)
	protected.GET("/conversations",controllers.GetConversations,)
	protected.GET("/users/search",controllers.SearchUsers,)
	protected.POST("/socket-token",controllers.GenerateSocketToken,)
	protected.GET("/users/status/:userId",controllers.GetUserStatus,)
}
