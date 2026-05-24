package utils
import(
	"errors"
	"time"
	"os"
	"github.com/golang-jwt/jwt/v5"
)
//acccesstoken is jwt
func GenerateAccessToken(userID string,email string)(string,error){
	secret := os.Getenv("ACCESS_SECRET")// the key stays only on the server 
	if secret == "" {
		return "",errors.New("ACCESS_SECRET not set in environment variables")

	}
//Before signing, the claims exist as a normal Go map in server memory.
	claims:=jwt.MapClaims{
		"user_id":userID,
		"email":email,
		"exp":time.Now().Add(time.Hour * 72).Unix(),
		"iat":time.Now().Unix(),
		"type":"access",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256,claims,
	)
signedToken,err := token.SignedString([]byte(secret))
if err!=nil{
	return "",err
}
return signedToken,nil
}

func GenerateRefreshToken(userID string, email string) (string, error) {

	secret := os.Getenv("REFRESH_SECRET")

	if secret == "" {
		return "", errors.New("REFRESH_SECRET not found")
	}

	claims := jwt.MapClaims{
		"user_id": userID,
		"email":   email,
		"exp":     time.Now().Add(time.Hour * 24 * 7).Unix(),
		"iat":     time.Now().Unix(),
		"type":    "refresh",
	}

	token := jwt.NewWithClaims(
		jwt.SigningMethodHS256,
		claims,
	)

	signedToken, err := token.SignedString([]byte(secret))

	if err != nil {
		return "", err
	}

	return signedToken, nil
}

func ValidateAccessToken(tokenString string) (*jwt.Token, error) {

	secret := os.Getenv("ACCESS_SECRET")

	if secret == "" {
		return nil, errors.New("ACCESS_SECRET not found")
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {

		_, ok := token.Method.(*jwt.SigningMethodHMAC)

		if !ok {
			return nil, errors.New("invalid signing method")
		}

		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	return token, nil
}
func ValidateRefreshToken(tokenString string) (*jwt.Token, error) {

	secret := os.Getenv("REFRESH_SECRET")

	if secret == "" {
		return nil, errors.New("REFRESH_SECRET not found")
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {

		_, ok := token.Method.(*jwt.SigningMethodHMAC)

		if !ok {
			return nil, errors.New("invalid signing method")
		}

		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	return token, nil
}
//---
  // |
  // ValidateToken checks the validity of a JWT token and returns the claims if valid
func ValidateToken(tokenString string)(*jwt.Token,error){
	secretKey:=os.Getenv("JWT_SECRET")
	if secretKey == "" {
		return nil,errors.New("JWT_SECRET not set in environment variables")
	}
	token,err:=jwt.Parse(tokenString,func(token *jwt.Token)(interface{},error){
		_,ok:=token.Method.(*jwt.SigningMethodHMAC)
		if !ok{
			return nil,errors.New("Invalid signing method")
		}
		return []byte(secretKey),nil
	})
	if err!=nil{
		return nil,err
	}
	return token,nil
}