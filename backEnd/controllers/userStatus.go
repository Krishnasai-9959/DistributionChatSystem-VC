package controllers

import (
	"backEnd/database"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func GetUserStatus(c *gin.Context) {

	userID :=
		c.Param("userId")

	online, _ :=
		database.RedisClient.Exists(
			database.Ctx,
			"online:"+userID,
		).Result()

	if online > 0 {

		c.JSON(
			http.StatusOK,
			gin.H{
				"online": true,
			},
		)

		return
	}

	lastSeen, err :=
		database.RedisClient.Get(
			database.Ctx,
			"last_seen:"+userID,
		).Result()

	if err != nil {

		c.JSON(
			http.StatusOK,
			gin.H{
				"online": false,
			},
		)

		return
	}

	timestamp, _ :=
		strconv.ParseInt(
			lastSeen,
			10,
			64,
		)

	c.JSON(
		http.StatusOK,
		gin.H{
			"online": false,
			"last_seen":
				time.Unix(
					timestamp,
					0,
				),
		},
	)
}