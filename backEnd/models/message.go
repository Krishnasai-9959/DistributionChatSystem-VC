package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Message struct {
	ID primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`

	SenderID string `json:"sender_id" bson:"sender_id"`

	ReceiverID string `json:"receiver_id" bson:"receiver_id"`

	Content string `json:"content" bson:"content"`

	Type string `json:"type" bson:"type"`

	Status string `json:"status" bson:"status"`

	CreatedAt time.Time `json:"created_at" bson:"created_at"`
}
