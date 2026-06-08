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

import CallButton
from "../call/CallButton";

import VoiceCall
from "../call/VoiceCall";

import VideoCall
from "../call/VideoCall";

import IncomingCallModal
from "../call/IncomingCallModal";

import { audioSignal } from "../../utils/audioSignal";

import {
    encryptMessage,
    decryptMessage
}
from "../../utils/crypto";

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

    const [incomingCall, setIncomingCall] =
        useState(null);

    const [inCall, setInCall] =
        useState(false);

    const [callStatus, setCallStatus] =
        useState(null);

    const [isMuted, setIsMuted] =
        useState(false);

    const [callDuration, setCallDuration] =
        useState(0);

    const [callerName, setCallerName] =
        useState("");

    const [callType, setCallType] =
        useState(null);

    const [localStream, setLocalStream] =
        useState(null);

    const [remoteStream, setRemoteStream] =
        useState(null);

    const [isVideoMuted, setIsVideoMuted] =
        useState(false);

    const socketRef =
        useRef(null);

    const messagesEndRef =
        useRef(null);

    const peerConnectionRef =
        useRef(null);

    const localStreamRef =
        useRef(null);

    const remoteAudioRef =
        useRef(null);

    const iceCandidatesQueueRef =
        useRef([]);

    const timerRef =
        useRef(null);

    const rtcConfig = {

        iceServers: [
            {
                urls:
                    "stun:stun.l.google.com:19302"
            }
        ]
    };

    const currentUser =
        JSON.parse(
            localStorage.getItem("user") || "{}"
        );

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
            localStreamRef.current
                .getTracks()
                .forEach(track =>
                    track.stop()
                );
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
                    type:
                        "call-ended",
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

        console.log(
            "Call Ended"
        );
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

            console.log("Voice Call Accepted");
        } catch (error) {
            console.error("Error accepting call:", error);
            endCall(false);
        }
    }

    async function startVoiceCall() {
        if (!selectedUser)
            return;

        try {
            iceCandidatesQueueRef.current = [];
            setCallerName(selectedUser.username);
            setInCall(true);
            setCallStatus("calling");
            setIsMuted(false);
            setCallDuration(0);
            setCallType("voice");

            audioSignal.playDialtone();

            const stream =
                await navigator
                    .mediaDevices
                    .getUserMedia({
                        audio: true
                    });

            localStreamRef.current =
                stream;
            setLocalStream(stream);

            const peer =
                new RTCPeerConnection(
                    rtcConfig
                );

            peerConnectionRef.current =
                peer;

            stream
                .getTracks()
                .forEach(track => {

                    peer.addTrack(
                        track,
                        stream
                    );
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

            console.log(
                "Voice Call Started"
            );

        } catch (error) {

            console.error(
                "Voice Call Error:",
                error
            );
            endCall(false);
        }
    }

    async function startVideoCall() {
        if (!selectedUser)
            return;

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

            const stream =
                await navigator
                    .mediaDevices
                    .getUserMedia({
                        audio: true,
                        video: true
                    });

            localStreamRef.current =
                stream;
            setLocalStream(stream);

            const peer =
                new RTCPeerConnection(
                    rtcConfig
                );

            peerConnectionRef.current =
                peer;

            stream
                .getTracks()
                .forEach(track => {

                    peer.addTrack(
                        track,
                        stream
                    );
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

            console.log(
                "Video Call Started"
            );

        } catch (error) {

            console.error(
                "Video Call Error:",
                error
            );
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
            const response =
                await getSocketToken();

            console.log(
                "Socket Token Response:",
                response
            );

            const token = response.token || response.socket_token;

            const socket =
                new WebSocket(
                    `ws://localhost:8080/ws?socket_token=${token}`
                );

            socketRef.current =
                socket;

            socket.onopen =
                () => {

                console.log(
                    "WebSocket Connected"
                );
            };

            socket.onmessage =
                async (event) => {

                const payload =
                    JSON.parse(
                        event.data
                    );

                if (
                    payload.type === "offer" ||
                    payload.type === "video-offer"
                ) {
                    audioSignal.playRingtone();
                    const name = await getCallerName(payload.sender_id);
                    setIncomingCall({
                        ...payload,
                        username: name
                    });
                    return;
                }

                if (
                    payload.type === "answer" ||
                    payload.type === "video-answer"
                ) {
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

                if (
                    payload.type === "candidate"
                ) {
                    const candidate = new RTCIceCandidate(payload.data);
                    if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
                        await peerConnectionRef.current.addIceCandidate(candidate);
                    } else {
                        iceCandidatesQueueRef.current.push(candidate);
                    }
                    return;
                }

                if (
                    payload.type === "call-ended"
                ) {
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

                setMessages(
                    prev => [
                        ...prev,
                        payload
                    ]
                );

                onMessageSent?.();
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
    }

    async function loadMessages() {
        try {
            const response =
                await getChatHistory(
                    selectedUser.id
                );

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

            console.error(
                "Failed to load messages:",
                error
            );
        }
    }

    async function loadUserStatus() {
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
    }

    useEffect(() => {

        if (!selectedUser)
            return;

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

    const handleSend =
        () => {

        if (
            !newMessage.trim() ||
            !selectedUser
        ) {
            return;
        }

        const encryptedContent =
            encryptMessage(
                newMessage.trim()
            );

        const message = {

            type: "message",

            receiver_id:
                selectedUser.id,

            content:
                encryptedContent
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

                <CallButton
                    onVoiceCall={startVoiceCall}
                    onVideoCall={startVideoCall}
                />

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
                            (message, idx) => (

                                <div
                                    key={
                                        message.id ||
                                        `msg-${idx}`
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

                <div
                    ref={messagesEndRef}
                />

            </div>

            <IncomingCallModal
                caller={
                    incomingCall
                }
                onAccept={
                    acceptCall
                }
                onReject={
                    rejectCall
                }
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