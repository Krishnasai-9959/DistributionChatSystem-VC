package controllers

import (
	"backEnd/database"
	"backEnd/models"
	"backEnd/utils"
	"context"
	"fmt"
	"log"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"golang.org/x/crypto/bcrypt"
)

func Register(c *gin.Context) {

	var user models.User

	// Bind request body
	if err := c.BindJSON(&user); err != nil {

		c.JSON(400, gin.H{
			"error": "Invalid request",
		})

		return
	}

	// Username validation
	if !utils.ValidateUsername(user.Username) {

		c.JSON(400, gin.H{
			"error": "Invalid username",
		})

		return
	}

	// Email validation
	if !utils.ValidateEmail(user.Email) {

		c.JSON(400, gin.H{
			"error": "Invalid email",
		})

		return
	}

	// Password validation
	if !utils.ValidatePassword(user.Password) {

		c.JSON(400, gin.H{
			"error": "Password must contain 8+ characters, 1 uppercase letter, 1 number and 1 special character",
		})

		return
	}

	collection := database.DB.Collection("users")

	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)

	defer cancel()

	// Check existing email
	var existingUser models.User

	err := collection.FindOne(
		ctx,
		bson.M{"email": user.Email},
	).Decode(&existingUser)

	if err == nil {

		c.JSON(400, gin.H{
			"error": "Email already exists",
		})

		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword(
		[]byte(user.Password),
		bcrypt.DefaultCost,
	)

	if err != nil {

		c.JSON(500, gin.H{
			"error": "Password hashing failed",
		})

		return
	}

	user.Password = string(hashedPassword)
	user.CreatedAt = time.Now()

	// Insert user
	result, err := collection.InsertOne(ctx, user)

	if err != nil {

		c.JSON(500, gin.H{
			"error": "User registration failed",
		})

		return
	}

	c.JSON(201, gin.H{
		"message": "User registered successfully",
		"user_id": result.InsertedID,
	})
}

// Refresh Token
func RefreshToken(c *gin.Context) {

	var body struct {
		RefreshToken string `json:"refresh_token"`
	}

	// Bind request body
	if err := c.BindJSON(&body); err != nil {

		c.JSON(400, gin.H{
			"error": "Invalid request",
		})

		return
	}

	// Validate refresh token
	token, err := utils.ValidateRefreshToken(
		body.RefreshToken,
	)

	if err != nil || !token.Valid {

		c.JSON(401, gin.H{
			"error": "Invalid refresh token",
		})

		return
	}

	// Extract claims
	claims, ok := token.Claims.(jwt.MapClaims)

	if !ok {

		c.JSON(401, gin.H{
			"error": "Invalid token claims",
		})

		return
	}

	userID := claims["user_id"].(string)
	email := claims["email"].(string)

	// Generate new access token
	newAccessToken, err := utils.GenerateAccessToken(
		userID,
		email,
	)

	if err != nil {

		c.JSON(500, gin.H{
			"error": "Failed to generate access token",
		})

		return
	}

	c.JSON(200, gin.H{
		"access_token": newAccessToken,
	})
}

// Logout
func Logout(c *gin.Context) {

	c.JSON(200, gin.H{
		"message": "Logout successful",
	})
}

// Forgot Password
func ForgotPassword(c *gin.Context) {

	var body struct {
		Email string `json:"email"`
	}

	// Parse request
	if err := c.BindJSON(&body); err != nil {

		c.JSON(400, gin.H{
			"error": "Invalid request",
		})

		return
	}

	// OTP request protection
	requestKey := "otp_requests:" + body.Email

	requestCount, _ := database.RedisClient.Get(
		database.Ctx,
		requestKey,
	).Int()

	// If OTP requested more than 3 times
	// block for 5 mins
	if requestCount >= 3 {

		c.JSON(429, gin.H{
			"error": "Too many OTP requests. Try again later",
		})

		return
	}

	collection := database.DB.Collection("users")

	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)

	defer cancel()

	var user models.User

	// Check email exists
	err := collection.FindOne(
		ctx,
		bson.M{"email": body.Email},
	).Decode(&user)

	if err != nil {

		c.JSON(404, gin.H{
			"error": "Email not found",
		})

		return
	}

	// Generate OTP
	otp := utils.GenerateOTP()

	// Store OTP in Redis for 5 mins
	err = database.RedisClient.Set(
		database.Ctx,
		body.Email,
		otp,
		5*time.Minute,
	).Err()

	if err != nil {
		log.Printf("ForgotPassword Redis Set Error: %v\n", err)
		c.JSON(500, gin.H{
			"error": fmt.Sprintf("Failed to store OTP: %v", err),
		})

		return
	}

	// Send OTP Email
	err = utils.SendOTPEmail(
		body.Email,
		otp,
	)

	if err != nil {
		log.Printf("ForgotPassword Email Send Error: %v\n", err)
		c.JSON(500, gin.H{
			"error": fmt.Sprintf("Failed to send email: %v", err),
		})

		return
	}

	// Increase OTP request count
	database.RedisClient.Incr(
		database.Ctx,
		requestKey,
	)

	// Expire request counter after 5 mins
	database.RedisClient.Expire(
		database.Ctx,
		requestKey,
		5*time.Minute,
	)

	c.JSON(200, gin.H{
		"message": "OTP sent successfully",
	})
}

// Verify OTP
func VerifyOTP(c *gin.Context) {

	var body struct {
		Email string `json:"email"`
		OTP   string `json:"otp"`
	}

	// Parse request
	if err := c.BindJSON(&body); err != nil {

		c.JSON(400, gin.H{
			"error": "Invalid request",
		})

		return
	}

	// OTP brute force protection
	attemptKey := "otp_attempts:" + body.Email

	attempts, _ := database.RedisClient.Get(
		database.Ctx,
		attemptKey,
	).Int()

	// If wrong OTP entered more than 5 times
	// block user temporarily
	if attempts >= 5 {

		c.JSON(429, gin.H{
			"error": "Too many OTP attempts. Try again later",
		})

		return
	}

	// Get stored OTP
	storedOTP, err := database.RedisClient.Get(
		database.Ctx,
		body.Email,
	).Result()

	if err != nil {

		c.JSON(400, gin.H{
			"error": "OTP expired or not found",
		})

		return
	}

	// Wrong OTP
	if storedOTP != body.OTP {

		// Increase failed OTP attempts
		database.RedisClient.Incr(
			database.Ctx,
			attemptKey,
		)

		// Expire attempts counter after 10 mins
		database.RedisClient.Expire(
			database.Ctx,
			attemptKey,
			10*time.Minute,
		)

		c.JSON(401, gin.H{
			"error": "Invalid OTP",
		})

		return
	}

	// OTP correct

	// Clear brute force attempts
	database.RedisClient.Del(
		database.Ctx,
		attemptKey,
	)

	// Delete OTP after successful verification
	database.RedisClient.Del(
		database.Ctx,
		body.Email,
	)

	c.JSON(200, gin.H{
		"message": "OTP verified successfully",
	})
}

// Resend OTP
func ResendOTP(c *gin.Context) {

	var body struct {
		Email string `json:"email"`
	}

	// Parse request
	if err := c.BindJSON(&body); err != nil {

		c.JSON(400, gin.H{
			"error": "Invalid request",
		})

		return
	}

	// OTP request protection
	requestKey := "otp_requests:" + body.Email

	requestCount, _ := database.RedisClient.Get(
		database.Ctx,
		requestKey,
	).Int()

	// If OTP requested more than 3 times
	// block user for 5 mins
	if requestCount >= 3 {

		c.JSON(429, gin.H{
			"error": "Too many OTP requests. Try again later",
		})

		return
	}

	// Generate new OTP
	otp := utils.GenerateOTP()

	// Replace old OTP
	err := database.RedisClient.Set(
		database.Ctx,
		body.Email,
		otp,
		5*time.Minute,
	).Err()

	if err != nil {
		log.Printf("ResendOTP Redis Set Error: %v\n", err)
		c.JSON(500, gin.H{
			"error": fmt.Sprintf("Failed to store OTP: %v", err),
		})

		return
	}

	// Send email
	err = utils.SendOTPEmail(
		body.Email,
		otp,
	)

	if err != nil {
		log.Printf("ResendOTP Email Send Error: %v\n", err)
		c.JSON(500, gin.H{
			"error": fmt.Sprintf("Failed to send OTP: %v", err),
		})

		return
	}

	// Increase OTP request count
	database.RedisClient.Incr(
		database.Ctx,
		requestKey,
	)

	// Expire request counter after 5 mins
	database.RedisClient.Expire(
		database.Ctx,
		requestKey,
		5*time.Minute,
	)

	c.JSON(200, gin.H{
		"message": "OTP resent successfully",
	})
}

// reset password
func ResetPassword(c *gin.Context) {
	var body struct {
		Email       string `json:"email"`
		NewPassword string `json:"new_password"`
	}
	if err := c.BindJSON(&body); err != nil {
		c.JSON(400, gin.H{
			"error": "Invalid request",
		})
		return
	}
	if !utils.ValidatePassword(body.NewPassword) {
		c.JSON(400, gin.H{
			"error": "Password must contain 8+ characters, 1 uppercase letter, 1 number and 1 special character",
		})
		return
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(body.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(500, gin.H{
			"error": "Password hashing failed",
		})
		return
	}
	collection := database.DB.Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	update := bson.M{"$set": bson.M{"password": string(hashedPassword)}}
	result, err := collection.UpdateOne(ctx, bson.M{"email": body.Email}, update)
	if err != nil {
		c.JSON(500, gin.H{
			"error": "Failed to update password",
		})
		return
	}
	if result.MatchedCount == 0 {
		c.JSON(404, gin.H{
			"error": "Email not found",
		})
		return
	}
	c.JSON(200, gin.H{
		"message": "Password reset successful",
	})
}

// Login
func Login(c *gin.Context) {

	var user models.User

	// Parse request body
	if err := c.BindJSON(&user); err != nil {

		c.JSON(400, gin.H{
			"error": "Invalid request",
		})

		return
	}

	collection := database.DB.Collection("users")

	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)

	defer cancel()

	var existingUser models.User

	// Find user
	err := collection.FindOne(
		ctx,
		bson.M{"email": user.Email},
	).Decode(&existingUser)

	if err != nil {

		c.JSON(401, gin.H{
			"error": "Invalid email or password",
		})

		return
	}

	// Compare password
	err = bcrypt.CompareHashAndPassword(
		[]byte(existingUser.Password),
		[]byte(user.Password),
	)

	if err != nil {

		c.JSON(401, gin.H{
			"error": "Invalid email or password",
		})

		return
	}

	// Generate access token
	accessToken, err := utils.GenerateAccessToken(
		existingUser.ID.Hex(),
		existingUser.Email,
	)

	if err != nil {

		c.JSON(500, gin.H{
			"error": "Access token generation failed",
		})

		return
	}

	// Generate refresh token
	refreshToken, err := utils.GenerateRefreshToken(
		existingUser.ID.Hex(),
		existingUser.Email,
	)

	if err != nil {

		c.JSON(500, gin.H{
			"error": "Refresh token generation failed",
		})

		return
	}

	c.JSON(200, gin.H{
		"message":       "Login successful",
		"access_token":  accessToken,
		"refresh_token": refreshToken,
		"user": gin.H{
			"id":       existingUser.ID,
			"username": existingUser.Username,
			"email":    existingUser.Email,
		},
	})
}
