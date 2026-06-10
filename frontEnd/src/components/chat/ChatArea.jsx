import {
    useEffect,
    useRef,
    useState
} from "react";
import { useNavigate } from "react-router-dom";

import {
    getUserStatus
} from "../../services/userService";

import {
    getChatHistory,
    getConversations
} from "../../services/chatService";

import IncomingCallModal from "../call/IncomingCallModal";
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';

import { encryptMessage, decryptMessage, isEncryptedMessage, getFileDataFromUrl } from "../../utils/crypto";
import { sendSocketMessage } from "../../services/socketService";

import "./ChatArea.css";

function ChatArea({
    selectedUser,
    onUserSelect,
    onMessageSent,
    onMessagesUpdate,
    onStatusUpdate,
    onToggleProfile,
    onBack,
    zpInstance
}) {
    const navigate = useNavigate();
    
    // Mirror selectedUser prop with a mutable ref to solve stale closure in socket event handlers
    const selectedUserRef = useRef(selectedUser);
    useEffect(() => {
        selectedUserRef.current = selectedUser;
    }, [selectedUser]);

    const [messages, setMessages] = useState([]);
    const [userStatus, setUserStatus] = useState(null);
    const [newMessage, setNewMessage] = useState("");
    const [incomingCall, setIncomingCall] = useState(null);
    const [inCall, setInCall] = useState(false);
    const [callStatus, setCallStatus] = useState(null);
    const [callDuration, setCallDuration] = useState(0);
    const [callerName, setCallerName] = useState("");
    const [callType, setCallType] = useState(null);

    // Profile Details Sync State
    const [userProfilePic, setUserProfilePic] = useState("");
    const [mediaVisibility, setMediaVisibility] = useState(true);
    const [chatWallpaper, setChatWallpaper] = useState("");

    // socket is now global (services/socketService); local ref removed
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const zegoContainerRef = useRef(null);
    const zegoInstanceRef = useRef(null);
    const zegoRoomIDRef = useRef(null);
    const timerRef = useRef(null);

    const currentUser = JSON.parse(
        localStorage.getItem("user") || "{}"
    );

    // Sync messages with parent component for media gallery usage
    useEffect(() => {
        onMessagesUpdate?.(messages);
    }, [messages, onMessagesUpdate]);

    // Load custom profile info for the selected contact locally
    useEffect(() => {
        if (selectedUser) {
            setTimeout(() => {
                setUserProfilePic(localStorage.getItem(`profile_pic_${selectedUser.id}`) || "");
                setMediaVisibility(localStorage.getItem(`media_visibility_${selectedUser.id}`) !== "false");
            }, 0);
        }
    }, [selectedUser]);


    // Handle updates when profile pic/visibility/wallpaper changes in other components
    useEffect(() => {
        const handleProfileUpdate = () => {
            if (selectedUser) {
                setTimeout(() => {
                    setUserProfilePic(localStorage.getItem(`profile_pic_${selectedUser.id}`) || selectedUser.profile_pic || "");
                }, 0);
            }
        };
        const handleMediaVisChange = () => {
            if (selectedUser) {
                setTimeout(() => {
                    setMediaVisibility(localStorage.getItem(`media_visibility_${selectedUser.id}`) !== "false");
                }, 0);
            }
        };
        const handleWallpaperChange = () => {
            if (selectedUser) {
                setTimeout(() => {
                    setChatWallpaper(localStorage.getItem(`chat_wallpaper_${selectedUser.id}`) || "");
                }, 0);
            }
        };

        // Initial load for current selected user
        setTimeout(() => {
            if (selectedUser) {
                const pic = localStorage.getItem(`profile_pic_${selectedUser.id}`) || selectedUser.profile_pic || "";
                setUserProfilePic(pic);
                setMediaVisibility(localStorage.getItem(`media_visibility_${selectedUser.id}`) !== "false");
                setChatWallpaper(localStorage.getItem(`chat_wallpaper_${selectedUser.id}`) || "");
                
                // Cache user profile pic and bio if fetched from database
                if (selectedUser.profile_pic) {
                    localStorage.setItem(`profile_pic_${selectedUser.id}`, selectedUser.profile_pic);
                }
                if (selectedUser.bio) {
                    localStorage.setItem(`bio_${selectedUser.id}`, selectedUser.bio);
                }
            } else {
                setUserProfilePic("");
                setMediaVisibility(true);
                setChatWallpaper("");
            }
        }, 0);

        window.addEventListener("profileUpdate", handleProfileUpdate);
        window.addEventListener("mediaVisibilityChanged", handleMediaVisChange);
        window.addEventListener("wallpaperChanged", handleWallpaperChange);
        return () => {
            window.removeEventListener("profileUpdate", handleProfileUpdate);
            window.removeEventListener("mediaVisibilityChanged", handleMediaVisChange);
            window.removeEventListener("wallpaperChanged", handleWallpaperChange);
        };
    }, [selectedUser]);

    useEffect(() => {
        if (inCall && zegoContainerRef.current) {
            const initZego = async () => {
                try {
                    let rawAppID = import.meta.env.VITE_ZEGO_APP_ID;
                    if (typeof rawAppID === "string") {
                        rawAppID = rawAppID.replace(/['"]/g, "").trim();
                    }
                    const appID = Number(rawAppID);

                    let serverSecret = import.meta.env.VITE_ZEGO_SERVER_SECRET;
                    if (typeof serverSecret === "string") {
                        serverSecret = serverSecret.replace(/['"]/g, "").trim();
                    }
                    
                    console.log("Initializing ZegoCloud calling: AppID =", appID, "ServerSecret set =", !!serverSecret, "CallType =", callType);

                    if (!appID || !serverSecret) {
                        console.error("ZegoCloud appID or serverSecret is missing from env");
                        alert("Call system configuration error. Please check environment variables.");
                        endCall(false);
                        return;
                    }

                    const roomID = zegoRoomIDRef.current || `room_${currentUser.id.substring(0, 6)}_${selectedUser?.id?.substring(0, 6) || 'guest'}_${Date.now()}`;
                    zegoRoomIDRef.current = roomID;

                    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
                        appID,
                        serverSecret,
                        roomID,
                        currentUser.id,
                        currentUser.username || `User_${currentUser.id.substring(0, 4)}`
                    );

                    const zp = ZegoUIKitPrebuilt.create(kitToken);
                    zegoInstanceRef.current = zp;

                    zp.joinRoom({
                        container: zegoContainerRef.current,
                        sharedLinks: [],
                        scenario: {
                            mode: ZegoUIKitPrebuilt.OneONoneCall
                        },
                        turnOnCameraWhenJoining: callType === "video",
                        showMyCameraToggleButton: callType === "video",
                        showScreenSharingButton: callType === "video",
                        turnOnMicrophoneWhenJoining: true,
                        showMyMicrophoneToggleButton: true,
                        showAudioVideoSettingsButton: true,
                        showTextChat: false,
                        showUserList: false,
                        maxUsers: 2,
                        layout: "Grid",
                        showLayoutButton: false,
                        onLeaveRoom: () => {
                            endCall(true);
                        }
                    });
                } catch (err) {
                    console.error("ZegoCloud initialization failed:", err);
                    endCall(false);
                }
            };

            initZego();
        } else {
            if (zegoInstanceRef.current) {
                try {
                    zegoInstanceRef.current.destroy();
                } catch (e) {
                    console.warn("Error destroying Zego instance:", e);
                }
                zegoInstanceRef.current = null;
            }
        }
    }, [inCall, callType]);

    async function getCallerName(callerId) {
        if (selectedUser && selectedUser.id === callerId) {
            return selectedUser.username;
        }
        try {
            const response = await getConversations();
            const conv = (response.conversations || []).find(c => c.user_id === callerId);
            if (conv) return conv.username;
        } catch (e) {
            console.error("Error fetching caller name:", e);
        }
        return `User (${callerId.substring(0, 6)})`;
    }

    function endCall(sendSignal = true) {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        const receiverId = selectedUser?.id || (incomingCall ? incomingCall.sender_id : null);

        if (sendSignal && receiverId) {
            try {
                sendSocketMessage({
                    type: "call-ended",
                    receiver_id: receiverId
                });
            } catch (e) {
                console.error("Failed sending call-ended signal:", e);
            }
        }

        if (zegoInstanceRef.current) {
            try {
                zegoInstanceRef.current.destroy();
            } catch (e) {
                console.warn("Error destroying Zego instance:", e);
            }
            zegoInstanceRef.current = null;
        }
        zegoRoomIDRef.current = null;

        setInCall(false);
        setIncomingCall(null);
        setCallStatus(null);
        setCallType(null);
        setCallDuration(0);
    }

    function rejectCall() {
        if (!incomingCall) return;

        const callerId = incomingCall.sender_id;

        try {
            sendSocketMessage({
                type: "call-ended",
                receiver_id: callerId
            });
        } catch (e) {
            console.error("Failed sending reject signal:", e);
        }

        setIncomingCall(null);
    }

    async function acceptCall() {
        if (!incomingCall) return;

        const callerId = incomingCall.sender_id;
        const roomID = incomingCall.data?.roomID;
        const incomingCallType = incomingCall.data?.callType || (incomingCall.type === "video-offer" ? "video" : "voice");

        // Open caller chat
        if (onUserSelect) {
            onUserSelect({
                id: callerId,
                username: incomingCall.username || `User (${callerId.substring(0, 6)})`
            });
        }

        zegoRoomIDRef.current = roomID;
        setCallerName(incomingCall.username);
        setInCall(true);
        setCallStatus("connected");
        setCallType(incomingCallType);
        setIncomingCall(null);

        try {
            sendSocketMessage({
                type: incomingCallType === "video" ? "video-answer" : "answer",
                receiver_id: callerId,
                data: { roomID }
            });
        } catch (e) {
            console.error("Failed sending answer:", e);
        }
    }

    async function startVoiceCall() {
        if (!selectedUser) return;
        const roomID = `room_${currentUser.id.substring(0, 6)}_${selectedUser.id.substring(0, 6)}_${Date.now()}`;
        zegoRoomIDRef.current = roomID;

        setCallerName(selectedUser.username);
        setInCall(true);
        setCallStatus("calling");
        setCallType("voice");

        try {
            sendSocketMessage({
                type: "offer",
                receiver_id: selectedUser.id,
                data: { roomID, callType: "voice" }
            });
        } catch (e) {
            console.error("Failed sending offer:", e);
        }
    }

    async function startVideoCall() {
        if (!selectedUser) return;
        const roomID = `room_${currentUser.id.substring(0, 6)}_${selectedUser.id.substring(0, 6)}_${Date.now()}`;
        zegoRoomIDRef.current = roomID;

        setCallerName(selectedUser.username);
        setInCall(true);
        setCallStatus("calling");
        setCallType("video");

        try {
            sendSocketMessage({
                type: "video-offer",
                receiver_id: selectedUser.id,
                data: { roomID, callType: "video" }
            });
        } catch (e) {
            console.error("Failed sending video-offer:", e);
        }
    }

    function scrollToBottom() {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTo({
                top: messagesContainerRef.current.scrollHeight,
                behavior: "smooth"
            });
        }
    }

    // Global socket is managed by services/socketService. We listen for dispatched events below.

    async function loadMessages() {
        const currentSelected = selectedUserRef.current;
        if (!currentSelected) return;
        try {
            const response = await getChatHistory(currentSelected.id);

            const decryptedMessages = (response.messages || []).map(msg => {
                try {
                    return {
                        ...msg,
                        content: (msg.content && isEncryptedMessage(msg.content)) ? decryptMessage(msg.content) : msg.content
                    };
                } catch (e) {
                    console.error("Failed to decrypt message in history:", e);
                    return msg;
                }
            });

            setMessages(decryptedMessages);
        } catch (error) {
            console.error("Failed to load messages:", error);
        }
    }

    async function loadUserStatus() {
        if (!selectedUser) return;
        try {
            const response = await getUserStatus(selectedUser.id);
            setUserStatus(response);
        } catch (error) {
            console.error("Failed to load status:", error);
        }
    }

    useEffect(() => {
        if (!selectedUser) return;
        setTimeout(() => {
            loadMessages();
            loadUserStatus();
        }, 0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedUser]);

    useEffect(() => {
        // Listen for global socket messages dispatched by socketService
        const handler = async (e) => {
            const payload = e.detail;
            if (!payload) return;

            if (payload.type === "offer" || payload.type === "video-offer") {
                const name = await getCallerName(payload.sender_id);
                setIncomingCall({ ...payload, username: name });
                return;
            }

            if (payload.type === "answer" || payload.type === "video-answer") {
                setCallStatus("connected");
                return;
            }

            if (payload.type === "candidate") {
                // ZegoCloud manages ICE candidates automatically
                return;
            }

            if (payload.type === "call-ended") {
                endCall(false);
                return;
            }
            if (payload.content && isEncryptedMessage(payload.content)) {
                try {
                    payload.content = decryptMessage(payload.content);
                } catch (e) {
                    console.error("Failed to decrypt incoming message:", e);
                }
            }

            const currentSelected = selectedUserRef.current;
            if (currentSelected && (payload.sender_id === currentSelected.id || payload.receiver_id === currentSelected.id)) {
                setMessages(prev => [...prev, payload]);
            }
            onMessageSent?.();
        };

        window.addEventListener("socketMessage", handler);
        return () => window.removeEventListener("socketMessage", handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Periodically update user status and handle page visibility/window focus to ensure online/offline status stays synced
    useEffect(() => {
        if (!selectedUser) return;

        // 1. Setup interval to poll status every 6 seconds
        const intervalId = setInterval(() => {
            loadUserStatus();
        }, 6000);

        // 2. Visibility change listener (tab visibility change / app background/foreground)
        const handleVisibilityChange = () => {
                if (document.visibilityState === "visible") {
                console.log("Tab visibility changed to visible: refreshing status");
                loadUserStatus();
                loadMessages();
            }
        };

        // 3. Window focus listener (browser window focused)
        const handleWindowFocus = () => {
            console.log("Window focused: refreshing status");
            loadUserStatus();
            loadMessages();
            // global socket service will handle reconnection
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleWindowFocus);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("focus", handleWindowFocus);
        };
    }, [selectedUser]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (onStatusUpdate) {
            onStatusUpdate(userStatus);
        }
    }, [userStatus, onStatusUpdate]);

    useEffect(() => {
        if (callStatus === "connected") {
            timerRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [callStatus]);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    const handleSend = () => {
        if (!newMessage.trim() || !selectedUser) return;

        const encryptedContent = encryptMessage(newMessage.trim());

        const message = {
            type: "message",
            receiver_id: selectedUser.id,
            content: encryptedContent
        };

        try { sendSocketMessage(message); } catch (e) { console.log("Socket not connected"); return; }

        setMessages(prev => [
            ...prev,
            {
                id: Date.now(),
                sender_id: currentUser.id,
                receiver_id: selectedUser.id,
                content: newMessage.trim(),
                created_at: new Date().toISOString()
            }
        ]);

        setNewMessage("");
        onMessageSent?.();
    };

    // Client-side file attachment handler (supports images, zip, pdf, etc.)
    const handleFileAttachment = (e) => {
        const file = e.target.files[0];
        if (!file || !selectedUser) return;

        const sendFilePayload = (base64Data) => {
            const payloadContent = `RNA_FILE|${file.name}|${base64Data}`;
            const encryptedContent = encryptMessage(payloadContent);

            const message = {
                type: "message",
                receiver_id: selectedUser.id,
                content: encryptedContent
            };

            try { sendSocketMessage(message);
                setMessages(prev => [
                    ...prev,
                    {
                        id: Date.now(),
                        sender_id: currentUser.id,
                        receiver_id: selectedUser.id,
                        content: payloadContent, // Keep plaintext locally
                        created_at: new Date().toISOString()
                    }
                ]);
                onMessageSent?.();
            } catch (e) {
                alert("Unable to send. Socket is disconnected.");
            }
        };

        const reader = new FileReader();
        if (file.type.startsWith("image/")) {
            // If it is an image, compress it first using Canvas
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const maxDim = 800; // Keep image dimensions reasonable
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxDim) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                        }
                    } else {
                        if (height > maxDim) {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
                    sendFilePayload(compressedBase64);
                };
            };
            reader.readAsDataURL(file);
        } else {
            // For any other file types (zip, pdf, docx, etc.), read as raw base64 data URL
            reader.onload = (event) => {
                sendFilePayload(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    };


    const renderMessageList = () => {
        const list = [];
        let lastDateStr = "";

        messages.forEach((message, idx) => {
            const msgDate = new Date(message.created_at || message.id || Date.now());
            const dateStr = msgDate.toDateString();

            if (dateStr !== lastDateStr) {
                lastDateStr = dateStr;
                let displayDate = msgDate.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
                const today = new Date().toDateString();
                const yesterday = new Date(Date.now() - 86400000).toDateString();
                if (dateStr === today) {
                    displayDate = "Today";
                } else if (dateStr === yesterday) {
                    displayDate = "Yesterday";
                }
                list.push({
                    type: "divider",
                    id: `divider-${idx}`,
                    label: displayDate
                });
            }
            list.push({
                type: "message",
                ...message
            });
        });

        return list.map((item) => {
            if (item.type === "divider") {
                return (
                    <div key={item.id} className="date-divider">
                        <span>{item.label}</span>
                    </div>
                );
            }

            const isMe = item.sender_id === currentUser.id;
            const msgTime = new Date(item.created_at || item.id || Date.now()).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            });

            const fileData = getFileDataFromUrl(item.content);

            return (
                <div
                    key={item.id || `msg-${item.id}`}
                    className={`message-wrapper ${isMe ? "wrapper-sent" : "wrapper-received"}`}
                >
                    <div
                        className={`message ${isMe ? "message-sent" : "message-received"} ${fileData ? (fileData.isImage ? "message-image" : "message-file") : ""}`}
                    >
                        {fileData ? (
                            fileData.isImage ? (
                                <div className="image-bubble-container">
                                    <img
                                        src={fileData.dataUrl}
                                        alt="Shared media"
                                        className={`shared-image-media ${!mediaVisibility ? "blurred" : ""}`}
                                    />
                                    {!mediaVisibility && (
                                        <div className="blur-overlay" title="Media visibility is disabled for this user">
                                            <span>Media Hidden</span>
                                        </div>
                                    )}
                                    <span className="message-timestamp image-timestamp">{msgTime}</span>
                                </div>
                            ) : (
                                <div className="file-bubble-container">
                                    <div className="file-info-icon">{fileData.icon}</div>
                                    <div className="file-info-details">
                                        <span className="file-name-text" title={fileData.filename}>
                                            {fileData.filename}
                                        </span>
                                        <span className="file-type-subtitle">
                                            {fileData.mimeType.split("/")[1]?.toUpperCase() || "File"} Document
                                        </span>
                                    </div>
                                    <a
                                        href={fileData.dataUrl}
                                        download={fileData.filename}
                                        className="file-download-button"
                                        title="Download File"
                                    >
                                        ⬇️
                                    </a>
                                </div>
                            )
                        ) : (
                            <div className="message-text">{item.content}</div>
                        )}
                        {(!fileData || !fileData.isImage) && (
                            <span className="message-timestamp">{msgTime}</span>
                        )}
                    </div>
                </div>
            );
        });
    };


    if (!selectedUser) {
        return (
            <div className="chat-area">
                <div className="chat-empty-state">
                    <div className="empty-state-illustration">💬</div>
                    <h3>Select a conversation to start chatting</h3>
                    <p>Select contacts from the sidebar search or history list to connect.</p>
                </div>
                <IncomingCallModal
                    caller={incomingCall}
                    onAccept={acceptCall}
                    onReject={rejectCall}
                    onBannerClick={() => {
                        if (incomingCall && onUserSelect) {
                            onUserSelect({
                                id: incomingCall.sender_id,
                                username: incomingCall.username || `User (${incomingCall.sender_id.substring(0, 6)})`
                            });
                        }
                    }}
                />

                {inCall && (
                    <div 
                        className="zego-call-container" 
                        ref={zegoContainerRef} 
                        style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 9999, backgroundColor: '#1a1a1a' }}
                    />
                )}
            </div>
        );
    }

    const isOnline = userStatus?.online;
    const lastSeenText = userStatus?.last_seen
        ? `Last seen ${new Date(userStatus.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : "Offline";

    return (
        <div 
            className="chat-area"
            style={chatWallpaper ? { backgroundImage: `url(${chatWallpaper})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
        >
            {!chatWallpaper && <div className="chat-messages-pattern"></div>}
            <div className="chat-header">
                <div className="chat-header-user-info" onClick={onToggleProfile} title="Click to view contact profile">
                    <button className="chat-back-btn" onClick={(e) => { e.stopPropagation(); onBack(); }} title="Back to chats">
                        ←
                    </button>
                    <div className="chat-header-avatar">
                        {userProfilePic ? (
                            <img src={userProfilePic} alt={selectedUser.username} className="header-avatar-img" />
                        ) : (
                            <div className="header-avatar-fallback">
                                {selectedUser.username.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="header-text-details">
                        <h3>{selectedUser.username}</h3>
                        {isOnline ? (
                            <small className="status-online">🟢 Online</small>
                        ) : (
                            <small className="status-offline">{lastSeenText}</small>
                        )}
                    </div>
                </div>
 
                <div className="chat-header-actions">
                    <div className="call-buttons-container">
                        <button className="call-btn voice-btn" onClick={startVoiceCall} title="Start Voice Call">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M6.62 10.79a15.15 15.15 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.11-.27 11.72 11.72 0 0 0 3.7.59 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.72 11.72 0 0 0 .59 3.7 1 1 0 0 1-.27 1.11z"/>
                            </svg>
                            <span>Voice Call</span>
                        </button>
                        <button className="call-btn video-btn" onClick={startVideoCall} title="Start Video Call">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                            </svg>
                            <span>Video Call</span>
                        </button>
                    </div>
                </div>
            </div>
 
            <div 
                ref={messagesContainerRef}
                className="chat-messages"
            >
                {messages.length === 0 ? (
                    <div className="no-messages">
                        No messages yet. Start chatting.
                    </div>
                ) : (
                    renderMessageList()
                )}
                <div ref={messagesEndRef} />
            </div>

            <IncomingCallModal
                caller={incomingCall}
                onAccept={acceptCall}
                onReject={rejectCall}
                onBannerClick={() => {
                    if (incomingCall && onUserSelect) {
                        onUserSelect({
                            id: incomingCall.sender_id,
                            username: incomingCall.username || `User (${incomingCall.sender_id.substring(0, 6)})`
                        });
                    }
                }}
            />

            {inCall && (
                <div 
                    className="zego-call-container" 
                    ref={zegoContainerRef} 
                    style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 9999, backgroundColor: '#1a1a1a' }}
                />
            )}
            <div className="chat-input-wrapper-whatsapp">
                <div className="chat-input-pill-whatsapp">
                    <button className="input-action-btn-whatsapp" title="Emojis" type="button">
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="whatsapp-svg-icon">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                            <line x1="9" y1="9" x2="9.01" y2="9" />
                            <line x1="15" y1="9" x2="15.01" y2="9" />
                        </svg>
                    </button>

                    <input
                        type="text"
                        placeholder="Message"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleSend();
                            }
                        }}
                        className="whatsapp-text-input"
                    />

                    <label className="input-action-btn-whatsapp" title="Attach Document">
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="whatsapp-svg-icon">
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                        <input
                            type="file"
                            accept="application/zip,application/x-zip-compressed,application/pdf,text/plain,.zip,.rar,.pdf,.doc,.docx,.xls,.xlsx"
                            onChange={handleFileAttachment}
                            style={{ display: "none" }}
                        />
                    </label>

                    <label className="input-action-btn-whatsapp" title="Attach Photo">
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="whatsapp-svg-icon">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                        </svg>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileAttachment}
                            style={{ display: "none" }}
                        />
                    </label>
                </div>

                <button onClick={handleSend} className="chat-send-circle-whatsapp" title="Send message">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="whatsapp-send-icon">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default ChatArea;