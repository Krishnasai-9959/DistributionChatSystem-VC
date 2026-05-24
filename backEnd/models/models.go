package models
import ("go.mongodb.org/mongo-driver/bson/primitive"
"time"
)
//The purpose of the file the data to be stored in the database and how it will be represented in the application. It defines the structure of the data and how it will be stored in the database. This file is used to create the database schema and to define the data models that will be used in the application. The models defined in this file will be used to create, read, update, and delete data from the database.
type User struct {
	ID 	 primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Username string 		   `bson:"username" json:"username"`
	Email    string 		   `bson:"email" json:"email"`
	Password string 		   `bson:"password" json:"password"`
	CreatedAt time.Time  `bson:"created_at" json:"created_at"`
}