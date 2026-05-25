package controllers

import (
	"backEnd/database"
	"backEnd/models"
	"backEnd/utils"
	"context"
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
func Logout(c *gin.Context) {
	c.JSON(200, gin.H{
		"message": "Logout successful",
	})
}

func ForgotPassword(c *gin.Context) {

	var body struct {
		Email string `json:"email"`
	}

	if err := c.BindJSON(&body); err != nil {

		c.JSON(400, gin.H{
			"error": "Invalid request",
		})

		return
	}
	requestKey := "otp_requests:" + body.Email

	requestCount, _ := database.RedisClient.Get(
		database.Ctx,
		requestKey,
	).Int()
	//if the otp requests sent more than 3 times by clicking resend otp then block the user for 5mins and reset the count after 5 mins

	// Max 3 OTP requests
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

		c.JSON(500, gin.H{
			"error": "Failed to store OTP",
		})

		return
	}

	// Send Email
	err = utils.SendOTPEmail(body.Email, otp)

	if err != nil {

		c.JSON(500, gin.H{
			"error": "Failed to send email",
		})

		return
	}

	c.JSON(200, gin.H{
		"message": "OTP sent successfully",
	})
}

// verify otp
func VerifyOTP(c *gin.Context) {
	var body struct {
		Email string `json:"email"`
		OTP   string `json:"otp"`
	}
	if err := c.BindJSON(&body); err != nil {
		c.JSON(400, gin.H{
			"error": "Invalid request",
		})
		return
	}
	//Get otp from redis
	storedOTP, err := database.RedisClient.Get(
		database.Ctx,
		body.Email,
	).Result()
	if err != nil {
		c.JSON(400, gin.H{
			"error": "OTP expired or invalid",
		})
		return
	}

	if storedOTP != body.OTP {
		c.JSON(400, gin.H{
			"error": "Invalid OTP",
		})
		return
	}
	c.JSON(200, gin.H{
		"message": "OTP verified successfully",
	})
}

// Login function
func Login(c *gin.Context) {

	var user models.User

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
