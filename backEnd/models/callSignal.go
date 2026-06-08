package models

type CallSignal struct {
	Type       string      `json:"type"`
	SenderID   string      `json:"sender_id"`
	ReceiverID string      `json:"receiver_id"`
	Data       interface{} `json:"data"`
}
