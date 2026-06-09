package websocket

import (
	"backEnd/controllers"
	"backEnd/database"
	"backEnd/models"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// WebSocket upgrader
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// userID -> websocket connection
var clients = make(map[string]*websocket.Conn)

var mutex sync.Mutex

// userID -> write mutex for thread-safe concurrent writes
var clientMutexes = make(map[string]*sync.Mutex)
var clientMutexesMutex sync.Mutex

func getClientMutex(userID string) *sync.Mutex {
	clientMutexesMutex.Lock()
	defer clientMutexesMutex.Unlock()
	m, ok := clientMutexes[userID]
	if !ok {
		m = &sync.Mutex{}
		clientMutexes[userID] = m
	}
	return m
}

// channels
var broadcast = make(chan models.Message, 1000)

var callBroadcast = make(chan models.CallSignal, 1000)

// Handle websocket connections
func HandleConnections(c *gin.Context) {

	socketToken := c.Query("socket_token")

	if socketToken == "" {

		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Socket token missing",
		})

		return
	}

	// Verify socket token
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

	// Optional one-time use token
	database.RedisClient.Del(
		database.Ctx,
		"socket:"+socketToken,
	)

	fmt.Println(
		"Authenticated websocket user:",
		userID,
	)

	// Upgrade HTTP -> WebSocket
	ws, err := upgrader.Upgrade(
		c.Writer,
		c.Request,
		nil,
	)

	if err != nil {

		fmt.Println(
			"Upgrade error:",
			err,
		)

		return
	}

	defer ws.Close()

	// Register connection
	mutex.Lock()

	clients[userID] = ws

	err = database.RedisClient.Set(
		database.Ctx,
		"online:"+userID,
		"true",
		0,
	).Err()

	if err != nil {

		fmt.Println(
			"Redis online status error:",
			err,
		)
	}

	mutex.Unlock()

	fmt.Println(
		"User connected:",
		userID,
	)

	// Listen for socket events
	for {

		var payload models.SocketPayload

		err := ws.ReadJSON(&payload)

		if err != nil {

			fmt.Println(
				"Read error:",
				err,
			)

			mutex.Lock()

			delete(
				clients,
				userID,
			)

			database.RedisClient.Del(
				database.Ctx,
				"online:"+userID,
			)

			database.RedisClient.Set(
				database.Ctx,
				"last_seen:"+userID,
				time.Now().Unix(),
				0,
			)

			mutex.Unlock()

			break
		}

		// Never trust sender from frontend
		payload.SenderID = userID

		switch payload.Type {

		case "message":

			msg := models.Message{
				SenderID:   userID,
				ReceiverID: payload.ReceiverID,
				Content:    payload.Content,
				Type:       "text",
				Status:     "sent",
			}

			err = controllers.SaveMessage(
				&msg,
			)

			if err != nil {

				fmt.Println(
					"Message save error:",
					err,
				)
			}

			broadcast <- msg

		case "offer":

			callBroadcast <- models.CallSignal{
				Type:       "offer",
				SenderID:   userID,
				ReceiverID: payload.ReceiverID,
				Data:       payload.Data,
			}

		case "video-offer":

			callBroadcast <- models.CallSignal{
				Type:       "video-offer",
				SenderID:   userID,
				ReceiverID: payload.ReceiverID,
				Data:       payload.Data,
			}

		case "answer":

			callBroadcast <- models.CallSignal{
				Type:       "answer",
				SenderID:   userID,
				ReceiverID: payload.ReceiverID,
				Data:       payload.Data,
			}

		case "video-answer":

			callBroadcast <- models.CallSignal{
				Type:       "video-answer",
				SenderID:   userID,
				ReceiverID: payload.ReceiverID,
				Data:       payload.Data,
			}

		case "candidate":

			callBroadcast <- models.CallSignal{
				Type:       "candidate",
				SenderID:   userID,
				ReceiverID: payload.ReceiverID,
				Data:       payload.Data,
			}

		case "call-ended":

			callBroadcast <- models.CallSignal{
				Type:       "call-ended",
				SenderID:   userID,
				ReceiverID: payload.ReceiverID,
			}
		}
	}
}

// Chat message router
func HandleMessages() {

	for {

		msg := <-broadcast

		fmt.Println(
			"Routing message to:",
			msg.ReceiverID,
		)

		mutex.Lock()

		receiverConn,
			ok := clients[msg.ReceiverID]

		mutex.Unlock()

		if ok {
			go func(conn *websocket.Conn, message models.Message, rID string) {
				m := getClientMutex(rID)
				m.Lock()
				defer m.Unlock()

				conn.SetWriteDeadline(time.Now().Add(3 * time.Second))
				err := conn.WriteJSON(message)

				if err != nil {
					fmt.Println("Write error:", err)
					conn.Close()

					mutex.Lock()
					delete(clients, rID)
					mutex.Unlock()

					fmt.Println("Removed offline user:", rID)
				} else {
					fmt.Println("Message delivered successfully")
				}
			}(receiverConn, msg, msg.ReceiverID)

		} else {

			fmt.Println(
				"Receiver offline:",
				msg.ReceiverID,
			)
		}
	}
}

// Voice call signaling router
func HandleCallSignals() {

	for {

		signal := <-callBroadcast

		mutex.Lock()

		receiverConn,
			ok := clients[signal.ReceiverID]

		mutex.Unlock()

		if ok {
			go func(conn *websocket.Conn, sig models.CallSignal, rID string) {
				m := getClientMutex(rID)
				m.Lock()
				defer m.Unlock()

				conn.SetWriteDeadline(time.Now().Add(3 * time.Second))
				err := conn.WriteJSON(sig)

				if err != nil {
					fmt.Println("Call signal error:", err)
				}
			}(receiverConn, signal, signal.ReceiverID)
		}
	}
}
