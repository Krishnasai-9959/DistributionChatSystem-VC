package models

import "time"

type Conversation struct {
	UserID          string    `json:"user_id"`
	Username        string    `json:"username"`
	LastMessage     string    `json:"last_message"`
	LastMessageTime time.Time `json:"last_message_time"`
	UnreadCount     int       `json:"unread_count"`
}