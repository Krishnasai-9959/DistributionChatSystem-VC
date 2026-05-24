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
	"message": "Login successful",
	"access_token": accessToken,
	"refresh_token": refreshToken,
	"user": gin.H{
		"id": existingUser.ID,
		"username": existingUser.Username,
		"email": existingUser.Email,
	},
})
}