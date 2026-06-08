package models

import "time"

// type Conversation struct {
// 	UserID          string    `json:"user_id"`
// 	Username        string    `json:"username"`
// 	LastMessage     string    `json:"last_message"`
// 	LastMessageTime time.Time `json:"last_message_time"`
// 	UnreadCount     int       `json:"unread_count"`
//}

type Conversation struct {
	UserID string `json:"user_id"`
	Username string `json:"username"`
	LastMessage string `json:"last_message"`
	LastMessageTime time.Time `json:"last_message_time"`
	UnreadCount int `json:"unread_count"`
	ProfilePic string `json:"profile_pic,omitempty"`
	Bio string `json:"bio,omitempty"`
}