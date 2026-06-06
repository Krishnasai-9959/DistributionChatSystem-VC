package websocket

import (
	"backEnd/controllers"
	"backEnd/database"
	"backEnd/models"
	"fmt"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// WebSocket upgrader
var upgrader = websocket.Upgrader{

	CheckOrigin: func(r *http.Request) bool {

		return true

		// origin := r.Header.Get("Origin")

		// allowedOrigins := map[string]bool{

		// 	"http://localhost:3000": true,
		// 	"http://localhost:5173": true,

		// 	"https://yourfrontend.com": true,
		// }

		// return allowedOrigins[origin]
	},
}

// userID -> websocket connection
var clients = make(map[string]*websocket.Conn)

var mutex sync.Mutex

// private message channel
var broadcast = make(chan models.Message)

// Handle websocket connections
func HandleConnections(c *gin.Context) {

	// GET SOCKET TOKEN

	socketToken := c.Query("socket_token")

	if socketToken == "" {

		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Socket token missing",
		})

		return
	}

	// VERIFY SOCKET TOKEN IN REDIS

	userID, err := database.RedisClient.Get(
		database.Ctx,
		"socket:"+socketToken,
	).Result()

	if err != nil {

		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid or expired socket token",
		})

		return
	}

	// OPTIONAL: ONE-TIME USE TOKEN

	database.RedisClient.Del(
		database.Ctx,
		"socket:"+socketToken,
	)

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

		msg.Type = "text"
		msg.Status = "sent"

		err = controllers.SaveMessage(&msg)

		if err != nil {

			fmt.Println("Message save error:", err)
		}

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

				fmt.Println("Removed offline user:", msg.ReceiverID)

			} else {

				fmt.Println("Message delivered successfully")
			}

		} else {

			fmt.Println("Receiver offline:", msg.ReceiverID)
		}
	}
}