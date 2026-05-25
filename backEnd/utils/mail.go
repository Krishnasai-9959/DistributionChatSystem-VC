package utils

import (
	"os"

	gomail "gopkg.in/gomail.v2"
)

func SendOTPEmail(toEmail string, otp string) error {

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

	err := d.DialAndSend(m)

	return err
}
