package models

type SearchUser struct {
	ID         string `json:"id"`
	Username   string `json:"username"`
	ProfilePic string `json:"profile_pic,omitempty"`
	Bio        string `json:"bio,omitempty"`
}