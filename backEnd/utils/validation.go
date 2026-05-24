package utils

import (
	"net/mail"
	"strings"
	"unicode"
)

func ValidateEmail(email string) bool {

	_, err := mail.ParseAddress(email)

	return err == nil
}

func ValidatePassword(password string) bool {

	if len(password) < 8 {
		return false
	}

	var hasUpper bool
	var hasLower bool
	var hasNumber bool
	var hasSpecial bool

	specialChars := "!@#$%^&*()_+-=[]{}|;:',.<>?/"

	for _, char := range password {

		if unicode.IsUpper(char) {
			hasUpper = true
		}

		if unicode.IsLower(char) {
			hasLower = true
		}

		if unicode.IsDigit(char) {
			hasNumber = true
		}

		if strings.ContainsRune(specialChars, char) {
			hasSpecial = true
		}
	}

	return hasUpper && hasLower && hasNumber && hasSpecial
}

func ValidateUsername(username string) bool {

	if len(username) < 3 || len(username) > 20 {
		return false
	}

	for _, char := range username {

		if !unicode.IsLetter(char) &&
			!unicode.IsNumber(char) &&
			char != '_' &&
			char != '.' {

			return false
		}
	}

	return true
}