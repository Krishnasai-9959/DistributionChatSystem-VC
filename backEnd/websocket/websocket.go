package websocket

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// WebSocket upgrader
var upgrader = websocket.Upgrader{

	// Allow only trusted frontend origins
	CheckOrigin: func(r *http.Request) bool {

		origin := r.Header.Get("Origin")

		allowedOrigins := map[string]bool{

			// Local frontend
			"http://localhost:3000": true,
			"http://localhost:5173": true,

			// Production frontend
			"https://yourfrontend.com": true,
		}

		return allowedOrigins[origin]
	},
}

// Connected websocket clients
var clients = make(map[*websocket.Conn]bool)

// Broadcast channel
var broadcast = make(chan map[string]interface{})

// Handle websocket connections
func HandleConnections(c *gin.Context) {

	// Upgrade HTTP request to websocket
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

	// Register connected client
	clients[ws] = true

	fmt.Println("Client connected")

	for {

		var msg map[string]interface{}

		// Read websocket message
		err := ws.ReadJSON(&msg)

		if err != nil {

			fmt.Println("Read error:", err)

			delete(clients, ws)
			break
		}

		fmt.Println("Message received:")
		fmt.Println(msg)

		// Send message to broadcast channel
		broadcast <- msg
	}
}

// Broadcast messages to connected clients
func HandleMessages() {

	for {

		msg := <-broadcast

		fmt.Println("Broadcasting message")

		for client := range clients {

			err := client.WriteJSON(msg)

			if err != nil {

				fmt.Println("Write error:", err)

				client.Close()

				delete(clients, client)
			}
		}
	}
}
