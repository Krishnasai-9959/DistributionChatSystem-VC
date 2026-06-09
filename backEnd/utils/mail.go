package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	gomail "gopkg.in/gomail.v2"
)

func SendOTPEmail(toEmail string, otp string) error {
	resendKey := os.Getenv("RESEND_API_KEY")
	if resendKey != "" {
		// Use Resend HTTP API (avoids Render Free Tier SMTP port blocking)
		url := "https://api.resend.com/emails"
		from := "onboarding@resend.dev" // Free testing default

		payload := map[string]interface{}{
			"from":    fmt.Sprintf("ChatApp <%s>", from),
			"to":      []string{toEmail},
			"subject": "Password Reset OTP",
			"html":    fmt.Sprintf("<p>Your OTP for password reset is: <b>%s</b></p><p>It is valid for 5 minutes.</p>", otp),
		}

		jsonPayload, err := json.Marshal(payload)
		if err != nil {
			return fmt.Errorf("failed to marshal resend payload: %v", err)
		}

		req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
		if err != nil {
			return fmt.Errorf("failed to create request: %v", err)
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+resendKey)

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			return fmt.Errorf("resend request failed: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode >= 400 {
			var errBody map[string]interface{}
			json.NewDecoder(resp.Body).Decode(&errBody)
			return fmt.Errorf("resend returned status %d: %v", resp.StatusCode, errBody)
		}

		return nil
	}

	// Fallback to Gmail SMTP
	from := os.Getenv("EMAIL")
	password := os.Getenv("EMAIL_PASSWORD")

	m := gomail.NewMessage()
	m.SetHeader("From", from)
	m.SetHeader("To", toEmail)
	m.SetHeader("Subject", "Password Reset OTP")
	m.SetBody(
		"text/plain",
		"Your OTP for password reset is: "+otp,
	)

	d := gomail.NewDialer(
		"smtp.gmail.com",
		587,
		from,
		password,
	)

	return d.DialAndSend(m)
}
