import {
    useEffect,
    useRef,
    useState
} from "react";

import {
    getUserStatus
} from "../../services/userService";

import {
    getChatHistory,
    getSocketToken
} from "../../services/chatService";

import "./ChatArea.css";

function ChatArea({
    selectedUser,
    onMessageSent
}) {

    const [messages, setMessages] =
        useState([]);

    const [userStatus, setUserStatus] =
        useState(null);

    const [newMessage, setNewMessage] =
        useState("");

    const socketRef =
        useRef(null);

    const messagesEndRef =
        useRef(null);

    const currentUser =
        JSON.parse(
            localStorage.getItem("user") || "{}"
        );

    useEffect(() => {

        if (!selectedUser)
            return;

        loadMessages();
        loadUserStatus();

    }, [selectedUser]);

    useEffect(() => {

        connectSocket();

        return () => {
            socketRef.current?.close();
        };

    }, []);

    useEffect(() => {

        scrollToBottom();

    }, [messages]);

    const scrollToBottom = () => {

        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth"
        });
    };

    const connectSocket = async () => {

        try {

            const response =
                await getSocketToken();

            console.log(
                "Socket Token Response:",
                response
            );

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

            socket.onmessage = (event) => {

                const message =
                    JSON.parse(
                        event.data
                    );

                setMessages(
                    prev => [
                        ...prev,
                        message
                    ]
                );

                onMessageSent?.();
            };

            socket.onerror = (error) => {

                console.error(
                    "WebSocket Error:",
                    error
                );
            };

            socket.onclose = () => {

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

            console.error(
                "Failed to load messages:",
                error
            );
        }
    };

    const loadUserStatus = async () => {

        if (!selectedUser)
            return;

        try {

            const response =
                await getUserStatus(
                    selectedUser.id
                );

            setUserStatus(
                response
            );

        } catch (error) {

            console.error(
                "Failed to load status:",
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

        if (
            socketRef.current &&
            socketRef.current.readyState === WebSocket.OPEN
        ) {

            socketRef.current.send(
                JSON.stringify(
                    message
                )
            );

        } else {

            console.log(
                "Socket not connected"
            );

            return;
        }

        setMessages(
            prev => [
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

        onMessageSent?.();
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

                <div>

                    <h3>
                        {selectedUser.username}
                    </h3>

                    {
                        userStatus?.online ? (

                            <small>
                                🟢 Online
                            </small>

                        ) : (

                            <small>

                                {
                                    userStatus?.last_seen
                                        ? `Last seen ${new Date(
                                            userStatus.last_seen
                                        ).toLocaleString()}`
                                        : "Offline"
                                }

                            </small>

                        )
                    }

                </div>

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

                                    {message.content}

                                </div>

                            )
                        )
                    )
                }

                <div
                    ref={messagesEndRef}
                />

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
                    onClick={
                        handleSend
                    }
                >
                    Send
                </button>

            </div>

        </div>
    );
}

export default ChatArea;