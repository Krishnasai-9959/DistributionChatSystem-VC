package models

type SocketPayload struct {
	Type string `json:"type"`

	SenderID   string `json:"sender_id"`
	ReceiverID string `json:"receiver_id"`

	Content string `json:"content,omitempty"`

	Data interface{} `json:"data,omitempty"`
}
