import { useEffect, useState } from "react";
import { getChatHistory } from "../../services/chatService";

import "./ChatArea.css";

function ChatArea({ selectedUser }) {

    const [messages, setMessages] =
        useState([]);

    const [newMessage, setNewMessage] =
        useState("");

    useEffect(() => {

        if (!selectedUser) return;

        loadMessages();

    }, [selectedUser]);

    const loadMessages = async () => {

        try {

            const response =
                await getChatHistory(
                    selectedUser.id
                );

            setMessages(
                response.messages || []
            );

        } catch (error) {

            console.error(error);
        }
    };

    const handleSend = () => {

        if (!newMessage.trim())
            return;

        console.log(
            "Sending:",
            newMessage
        );

        setMessages(
            prev => [
                ...prev,
                {
                    id: Date.now(),
                    content: newMessage,
                    sender_id: "me"
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
                    {selectedUser.username}
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
                                    key={message.id}
                                    className={
                                        message.sender_id === "me"
                                            ? "message message-sent"
                                            : "message message-received"
                                    }
                                >

                                    {message.content}

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