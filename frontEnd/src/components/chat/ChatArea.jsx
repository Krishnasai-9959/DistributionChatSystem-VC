import { useEffect, useRef, useState } from "react";

import {
    getChatHistory,
    getSocketToken
} from "../../services/chatService";

import "./ChatArea.css";

function ChatArea({ selectedUser }) {

    const [messages, setMessages] =
        useState([]);

    const [newMessage, setNewMessage] =
        useState("");

    const socketRef =
        useRef(null);

    const currentUser =
        JSON.parse(
            localStorage.getItem("user")
        );

    // Load chat history when user changes
    useEffect(() => {

        if (!selectedUser)
            return;

        loadMessages();

    }, [selectedUser]);

    // Connect websocket once
    useEffect(() => {

        connectSocket();

        return () => {

            if (
                socketRef.current
            ) {

                socketRef.current.close();
            }
        };

    }, []);

    const connectSocket =
        async () => {

        try {

            const response =
                await getSocketToken();

            const socket =
                new WebSocket(
                    `ws://localhost:8080/ws?socket_token=${response.socket_token}`
                );

            socketRef.current =
                socket;

            socket.onopen = () => {

                console.log(
                    "WebSocket Connected"
                );
            };

            socket.onmessage =
                (event) => {

                const message =
                    JSON.parse(
                        event.data
                    );

                setMessages(
                    (prev) => [
                        ...prev,
                        message
                    ]
                );
            };

            socket.onerror =
                (error) => {

                console.error(
                    "WebSocket Error:",
                    error
                );
            };

            socket.onclose =
                () => {

                console.log(
                    "WebSocket Closed"
                );
            };

        } catch (error) {

            console.error(
                "Failed to connect WebSocket:",
                error
            );
        }
    };

    const loadMessages =
        async () => {

        try {

            const response =
                await getChatHistory(
                    selectedUser.id
                );

            setMessages(
                response.messages || []
            );

        } catch (error) {

            console.error(
                "Failed to load messages:",
                error
            );
        }
    };

    const handleSend = () => {

        if (
            !newMessage.trim() ||
            !selectedUser
        ) {
            return;
        }

        const message = {

            receiver_id:
                selectedUser.id,

            content:
                newMessage
        };

        // Send via websocket
        socketRef.current?.send(
            JSON.stringify(
                message
            )
        );

        // Instant UI update
        setMessages(
            (prev) => [
                ...prev,
                {
                    id: Date.now(),
                    sender_id:
                        currentUser.id,
                    receiver_id:
                        selectedUser.id,
                    content:
                        newMessage
                }
            ]
        );

        setNewMessage("");
    };

    if (!selectedUser) {

        return (

            <div className="chat-area">

                <div className="chat-empty-state">

                    Select a conversation
                    to start chatting

                </div>

            </div>
        );
    }

    return (

        <div className="chat-area">

            <div className="chat-header">

                <h3>
                    {
                        selectedUser.username
                    }
                </h3>

            </div>

            <div className="chat-messages">

                {
                    messages.length === 0 ? (

                        <div className="no-messages">

                            No messages yet.
                            Start chatting.

                        </div>

                    ) : (

                        messages.map(
                            (message) => (

                                <div
                                    key={
                                        message.id ||
                                        Math.random()
                                    }
                                    className={
                                        message.sender_id === currentUser.id
                                            ? "message message-sent"
                                            : "message message-received"
                                    }
                                >

                                    {
                                        message.content
                                    }

                                </div>

                            )
                        )
                    )
                }

            </div>

            <div className="chat-input-container">

                <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) =>
                        setNewMessage(
                            e.target.value
                        )
                    }
                    onKeyDown={(e) => {

                        if (
                            e.key === "Enter"
                        ) {

                            handleSend();
                        }
                    }}
                />

                <button
                    onClick={handleSend}
                >

                    Send

                </button>

            </div>

        </div>

    );
}

export default ChatArea;