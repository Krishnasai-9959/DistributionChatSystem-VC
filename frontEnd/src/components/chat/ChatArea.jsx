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
    getSocketToken,
    getConversations
} from "../../services/chatService";

import CallButton from "../call/CallButton";
import VoiceCall from "../call/VoiceCall";
import VideoCall from "../call/VideoCall";
import IncomingCallModal from "../call/IncomingCallModal";

import { audioSignal } from "../../utils/audioSignal";
import { encryptMessage, decryptMessage, getFileDataFromUrl } from "../../utils/crypto";

import "./ChatArea.css";

function ChatArea({
    selectedUser,
    onMessageSent,
    onMessagesUpdate,
    onStatusUpdate,
    onToggleProfile,
    onBack
}) {

    const [messages, setMessages] = useState([]);
    const [userStatus, setUserStatus] = useState(null);
    const [newMessage, setNewMessage] = useState("");
    const [incomingCall, setIncomingCall] = useState(null);
    const [inCall, setInCall] = useState(false);
    const [callStatus, setCallStatus] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [callerName, setCallerName] = useState("");
    const [callType, setCallType] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isVideoMuted, setIsVideoMuted] = useState(false);

    // Profile Details Sync State
    const [userProfilePic, setUserProfilePic] = useState("");
    const [mediaVisibility, setMediaVisibility] = useState(true);
    const [chatWallpaper, setChatWallpaper] = useState("");

    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const iceCandidatesQueueRef = useRef([]);
    const timerRef = useRef(null);

    const rtcConfig = {
        iceServers: [
            {
                urls: "stun:stun.l.google.com:19302"
            }
        ]
    };

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

    async function processIceQueue() {
        while (iceCandidatesQueueRef.current.length > 0) {
            const candidate = iceCandidatesQueueRef.current.shift();
            try {
                if (peerConnectionRef.current) {
                    await peerConnectionRef.current.addIceCandidate(candidate);
                }
            } catch (err) {
                console.error("Error adding queued ICE candidate:", err);
            }
        }
    }

    function endCall(sendSignal = true) {
        audioSignal.stop();

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
        }

        iceCandidatesQueueRef.current = [];

        const receiverId = selectedUser?.id || (incomingCall ? incomingCall.sender_id : null);

        if (
            sendSignal &&
            receiverId &&
            socketRef.current &&
            socketRef.current.readyState === WebSocket.OPEN
        ) {
            socketRef.current.send(
                JSON.stringify({
                    type: "call-ended",
                    receiver_id: receiverId
                })
            );
        }

        setInCall(false);
        setIncomingCall(null);
        setCallStatus(null);
        setIsMuted(false);
        setIsVideoMuted(false);
        setCallDuration(0);
        setLocalStream(null);
        setRemoteStream(null);
        setCallType(null);
    }

    function rejectCall() {
        if (!incomingCall) return;

        audioSignal.stop();

        const callerId = incomingCall.sender_id;

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(
                JSON.stringify({
                    type: "call-ended",
                    receiver_id: callerId
                })
            );
        }

        setIncomingCall(null);
    }

    async function acceptCall() {
        if (!incomingCall) return;

        audioSignal.stop();

        const callerId = incomingCall.sender_id;
        const offer = incomingCall.data;
        const isVideoCallType = incomingCall.type === "video-offer";

        try {
            iceCandidatesQueueRef.current = [];
            setCallerName(incomingCall.username);
            setInCall(true);
            setCallStatus("connected");
            setIsMuted(false);
            setIsVideoMuted(false);
            setCallDuration(0);
            setCallType(isVideoCallType ? "video" : "voice");
            setIncomingCall(null);

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: isVideoCallType
            });
            localStreamRef.current = stream;
            setLocalStream(stream);

            const peer = new RTCPeerConnection(rtcConfig);
            peerConnectionRef.current = peer;

            stream.getTracks().forEach(track => {
                peer.addTrack(track, stream);
            });

            peer.onicecandidate = (event) => {
                if (event.candidate && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                    socketRef.current.send(
                        JSON.stringify({
                            type: "candidate",
                            receiver_id: callerId,
                            data: event.candidate
                        })
                    );
                }
            };

            peer.ontrack = (event) => {
                if (event.streams[0]) {
                    setRemoteStream(event.streams[0]);
                    if (remoteAudioRef.current) {
                        remoteAudioRef.current.srcObject = event.streams[0];
                    }
                }
            };

            await peer.setRemoteDescription(new RTCSessionDescription(offer));
            processIceQueue();

            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);

            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(
                    JSON.stringify({
                        type: isVideoCallType ? "video-answer" : "answer",
                        receiver_id: callerId,
                        data: answer
                    })
                );
            }
        } catch (error) {
            console.error("Error accepting call:", error);
            endCall(false);
        }
    }

    async function startVoiceCall() {
        if (!selectedUser) return;

        try {
            iceCandidatesQueueRef.current = [];
            setCallerName(selectedUser.username);
            setInCall(true);
            setCallStatus("calling");
            setIsMuted(false);
            setCallDuration(0);
            setCallType("voice");

            audioSignal.playDialtone();

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true
            });

            localStreamRef.current = stream;
            setLocalStream(stream);

            const peer = new RTCPeerConnection(rtcConfig);
            peerConnectionRef.current = peer;

            stream.getTracks().forEach(track => {
                peer.addTrack(track, stream);
            });

            peer.onicecandidate = (event) => {
                if (event.candidate && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                    socketRef.current.send(
                        JSON.stringify({
                            type: "candidate",
                            receiver_id: selectedUser.id,
                            data: event.candidate
                        })
                    );
                }
            };

            peer.ontrack = (event) => {
                if (event.streams[0]) {
                    setRemoteStream(event.streams[0]);
                    if (remoteAudioRef.current) {
                        remoteAudioRef.current.srcObject = event.streams[0];
                    }
                }
            };

            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);

            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(
                    JSON.stringify({
                        type: "offer",
                        receiver_id: selectedUser.id,
                        data: offer
                    })
                );
            }
        } catch (error) {
            console.error("Voice Call Error:", error);
            endCall(false);
        }
    }

    async function startVideoCall() {
        if (!selectedUser) return;

        try {
            iceCandidatesQueueRef.current = [];
            setCallerName(selectedUser.username);
            setInCall(true);
            setCallStatus("calling");
            setIsMuted(false);
            setIsVideoMuted(false);
            setCallDuration(0);
            setCallType("video");

            audioSignal.playDialtone();

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            });

            localStreamRef.current = stream;
            setLocalStream(stream);

            const peer = new RTCPeerConnection(rtcConfig);
            peerConnectionRef.current = peer;

            stream.getTracks().forEach(track => {
                peer.addTrack(track, stream);
            });

            peer.onicecandidate = (event) => {
                if (event.candidate && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                    socketRef.current.send(
                        JSON.stringify({
                            type: "candidate",
                            receiver_id: selectedUser.id,
                            data: event.candidate
                        })
                    );
                }
            };

            peer.ontrack = (event) => {
                if (event.streams[0]) {
                    setRemoteStream(event.streams[0]);
                    if (remoteAudioRef.current) {
                        remoteAudioRef.current.srcObject = event.streams[0];
                    }
                }
            };

            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);

            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(
                    JSON.stringify({
                        type: "video-offer",
                        receiver_id: selectedUser.id,
                        data: offer
                    })
                );
            }
        } catch (error) {
            console.error("Video Call Error:", error);
            endCall(false);
        }
    }

    function toggleMute() {
        if (localStreamRef.current) {
            const audioTracks = localStreamRef.current.getAudioTracks();
            if (audioTracks.length > 0) {
                const nextMuted = !isMuted;
                audioTracks.forEach(track => {
                    track.enabled = !nextMuted;
                });
                setIsMuted(nextMuted);
            }
        }
    }

    function toggleVideo() {
        if (localStreamRef.current) {
            const videoTracks = localStreamRef.current.getVideoTracks();
            if (videoTracks.length > 0) {
                const nextMuted = !isVideoMuted;
                videoTracks.forEach(track => {
                    track.enabled = !nextMuted;
                });
                setIsVideoMuted(nextMuted);
            }
        }
    }

    function scrollToBottom() {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth"
        });
    }

    async function connectSocket() {
        try {
            const response = await getSocketToken();
            const token = response.token || response.socket_token;

            const WS_URL =
                import.meta.env.VITE_API_URL
                    .replace("https://", "wss://")
                    .replace("http://", "ws://");

            const socket = new WebSocket(
                `${WS_URL}/ws?socket_token=${token}`
            );

            socketRef.current = socket;

            socket.onopen = () => {
                console.log("WebSocket Connected");
            };

            socket.onmessage = async (event) => {
                const payload = JSON.parse(event.data);

                if (payload.type === "offer" || payload.type === "video-offer") {
                    audioSignal.playRingtone();
                    const name = await getCallerName(payload.sender_id);
                    setIncomingCall({
                        ...payload,
                        username: name
                    });
                    return;
                }

                if (payload.type === "answer" || payload.type === "video-answer") {
                    if (peerConnectionRef.current) {
                        await peerConnectionRef.current.setRemoteDescription(
                            new RTCSessionDescription(payload.data)
                        );
                        audioSignal.stop();
                        setCallStatus("connected");
                        processIceQueue();
                    }
                    return;
                }

                if (payload.type === "candidate") {
                    const candidate = new RTCIceCandidate(payload.data);
                    if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
                        await peerConnectionRef.current.addIceCandidate(candidate);
                    } else {
                        iceCandidatesQueueRef.current.push(candidate);
                    }
                    return;
                }

                if (payload.type === "call-ended") {
                    endCall(false);
                    return;
                }

                if (payload.content) {
                    try {
                        payload.content = decryptMessage(payload.content);
                    } catch (e) {
                        console.error("Failed to decrypt incoming message:", e);
                    }
                }

                setMessages(prev => [...prev, payload]);
                onMessageSent?.();
            };

            socket.onerror = (error) => {
                console.error("WebSocket Error:", error);
            };

            socket.onclose = () => {
                console.log("WebSocket Closed");
            };
        } catch (error) {
            console.error("Failed to connect WebSocket:", error);
        }
    }

    async function loadMessages() {
        try {
            const response = await getChatHistory(selectedUser.id);

            const decryptedMessages = (response.messages || []).map(msg => {
                try {
                    return {
                        ...msg,
                        content: msg.content ? decryptMessage(msg.content) : msg.content
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
        setTimeout(() => {
            connectSocket();
        }, 0);
        return () => {
            socketRef.current?.close();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


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
            audioSignal.stop();
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
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

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(message));
        } else {
            console.log("Socket not connected");
            return;
        }

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

            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify(message));
                
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
            } else {
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
            </div>
        );
    }

    const isOnline = userStatus?.online;
    const lastSeenText = userStatus?.last_seen
        ? `Last seen ${new Date(userStatus.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : "Offline";

    return (
        <div className="chat-area">
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
                    <CallButton
                        onVoiceCall={startVoiceCall}
                        onVideoCall={startVideoCall}
                    />
                </div>
            </div>

            <div 
                className="chat-messages"
                style={chatWallpaper ? { backgroundImage: `url(${chatWallpaper})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
            >
                {!chatWallpaper && <div className="chat-messages-pattern"></div>}
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
            />

            {callType === "video" ? (
                <VideoCall
                    inCall={inCall}
                    onEndCall={endCall}
                    callStatus={callStatus}
                    callerName={callerName}
                    localStream={localStream}
                    remoteStream={remoteStream}
                    isMuted={isMuted}
                    onToggleMute={toggleMute}
                    isVideoMuted={isVideoMuted}
                    onToggleVideo={toggleVideo}
                    callDuration={callDuration}
                />
            ) : (
                <VoiceCall
                    inCall={inCall}
                    onEndCall={endCall}
                    callStatus={callStatus}
                    callerName={callerName}
                    isMuted={isMuted}
                    onToggleMute={toggleMute}
                    callDuration={callDuration}
                />
            )}

            <audio
                ref={remoteAudioRef}
                autoPlay
            />

            <div className="chat-input-container">
                <label className="attachment-btn" title="Attach Document">
                    📎
                    <input
                        type="file"
                        accept="application/zip,application/x-zip-compressed,application/pdf,text/plain,.zip,.rar,.pdf,.doc,.docx,.xls,.xlsx"
                        onChange={handleFileAttachment}
                        style={{ display: "none" }}
                    />
                </label>

                <label className="attachment-btn" title="Attach Photo">
                    📷
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileAttachment}
                        style={{ display: "none" }}
                    />
                </label>

                <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            handleSend();
                        }
                    }}
                />

                <button onClick={handleSend} className="send-btn" title="Send message">
                    Send
                </button>
            </div>
        </div>
    );
}

export default ChatArea;