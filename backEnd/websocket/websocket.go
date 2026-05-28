package websocket

import (
	"backEnd/models"
	"backEnd/utils"
	"fmt"
	"net/http"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
)

// WebSocket upgrader
var upgrader = websocket.Upgrader{

	CheckOrigin: func(r *http.Request) bool {

		origin := r.Header.Get("Origin")

		allowedOrigins := map[string]bool{

			"http://localhost:3000": true,
			"http://localhost:5173": true,

			"https://yourfrontend.com": true,
		}

		return allowedOrigins[origin]
	},
}

// userID -> websocket connection
var clients = make(map[string]*websocket.Conn)

var mutex sync.Mutex

// private message channel
var broadcast = make(chan models.Message)

// Handle websocket connections
func HandleConnections(c *gin.Context) {
	// GET AUTHORIZATION HEADER

	authHeader := c.GetHeader("Authorization")

	if authHeader == "" {

		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authorization header missing",
		})

		return
	}
	// SPLIT BEARER TOKEN

	tokenParts := strings.Split(authHeader, " ")

	if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {

		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid authorization format",
		})

		return
	}

	tokenString := tokenParts[1]
	// VALIDATE JWT

	token, err := utils.ValidateAccessToken(tokenString)

	if err != nil || !token.Valid {

		fmt.Println("Token validation error:", err)

		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid or expired token",
		})

		return
	}
	// EXTRACT CLAIMS

	claims, ok := token.Claims.(jwt.MapClaims)

	if !ok {

		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid token claims",
		})

		return
	}
	// EXTRACT AUTHENTICATED USER

	userID := fmt.Sprintf("%v", claims["user_id"])

	fmt.Println("Authenticated websocket user:", userID)
	// UPGRADE HTTP -> WEBSOCKET

	ws, err := upgrader.Upgrade(
		c.Writer,
		c.Request,
		nil,
	)

	if err != nil {
		fmt.Println("Upgrade error:", err)
		return
	}
	defer ws.Close()
	// REGISTER USER CONNECTION
	mutex.Lock()
	clients[userID] = ws
	mutex.Unlock()

	fmt.Println("User connected:", userID)

	// LISTEN FOR MESSAGES

	for {

		var msg models.Message

		err := ws.ReadJSON(&msg)

		if err != nil {

			fmt.Println("Read error:", err)

			mutex.Lock()
			delete(clients, userID)
			mutex.Unlock()

			break
		}

		// NEVER trust sender_id from frontend
		// Always enforce authenticated sender

		msg.SenderID = userID

		fmt.Println("Message received:")
		fmt.Println(msg)

		// send to private router
		broadcast <- msg
	}
}

// Handle private message routing
func HandleMessages() {

	for {

		msg := <-broadcast

		fmt.Println("Routing message to:", msg.ReceiverID)

		mutex.Lock()

		receiverConn, ok := clients[msg.ReceiverID]

		mutex.Unlock()

		if ok {

			err := receiverConn.WriteJSON(msg)

			if err != nil {

				fmt.Println("Write error:", err)

				receiverConn.Close()

				mutex.Lock()
				delete(clients, msg.ReceiverID)
				mutex.Unlock()
			}

		} else {

			fmt.Println("Receiver offline")
		}
	}
}
