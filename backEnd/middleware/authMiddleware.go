package middleware
import(
	"net/http"
	"backEnd/utils"
	"strings"

	"github.com/gin-gonic/gin"
)
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context){
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header missing"})
			c.Abort()
			return
		}
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}
		tokenString := tokenParts[1]
		token,err:=utils.ValidateAccessToken(tokenString)
		if err!=nil || !token.Valid{
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}
		claims:=token.Claims
		c.Set("user",claims)

		c.Next()
	}
}