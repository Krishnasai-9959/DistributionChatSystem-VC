import { useEffect, useRef } from "react";
import "./VideoCall.css";

function VideoCall({
    inCall,
    onEndCall,
    callStatus,
    callerName,
    localStream,
    remoteStream,
    isMuted,
    onToggleMute,
    isVideoMuted,
    onToggleVideo,
    callDuration
}) {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    // Bind local stream to local video element
    useEffect(() => {
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = isVideoMuted ? null : localStream;
            if (localStream && !isVideoMuted) {
                localVideoRef.current.play().catch(err => {
                    console.warn("Failed to play local video:", err);
                });
            }
        }
    }, [localStream, isVideoMuted]);

    // Bind remote stream to remote video element
    useEffect(() => {
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            if (remoteStream) {
                remoteVideoRef.current.play().catch(err => {
                    console.warn("Failed to play remote video:", err);
                });
            }
        }
    }, [remoteStream]);

    if (!inCall) {
        return null;
    }

    const formatDuration = (secs) => {
        const mins = Math.floor(secs / 60);
        const remainingSecs = secs % 60;
        return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
    };

    const username = callerName || "User";
    const initials = username.substring(0, 2).toUpperCase();

    // Check if remote video tracks are active and enabled
    const hasRemoteVideo = remoteStream && remoteStream.getVideoTracks().some(track => track.enabled && track.readyState === "live");

    return (
        <div className="video-call-overlay">
            {/* Remote Video Container */}
            <div className="remote-video-wrapper">
                <video
                    ref={remoteVideoRef}
                    className="remote-video"
                    style={{ display: hasRemoteVideo ? "block" : "none" }}
                    autoPlay
                    playsInline
                />
                {!hasRemoteVideo && (
                    <div className="video-placeholder">
                        <div className="video-placeholder-avatar">
                            {initials}
                        </div>
                        <div className="video-placeholder-text">
                            {callStatus === "calling" ? "Calling..." : "Video is paused"}
                        </div>
                    </div>
                )}
            </div>

            {/* Local PIP Video */}
            <div className="local-video-wrapper">
                <video
                    ref={localVideoRef}
                    className="local-video"
                    style={{ display: (!isVideoMuted && localStream) ? "block" : "none" }}
                    autoPlay
                    playsInline
                    muted
                />
                {(!localStream || isVideoMuted) && (
                    <div className="video-placeholder">
                        <div className="video-placeholder-avatar" style={{ width: 40, height: 40, fontSize: 16 }}>
                            {initials}
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Info */}
            <div className="video-call-info">
                <h3 className="video-call-name">{username}</h3>
                <span className="video-call-status">
                    {callStatus === "calling" ? "Calling..." : "Connected"}
                </span>
                {callStatus === "connected" && (
                    <span className="video-call-timer">{formatDuration(callDuration)}</span>
                )}
            </div>

            {/* Floating Controls Overlay */}
            <div className="video-controls-overlay">
                {/* Mute Mic Button */}
                <button
                    className={`video-control-btn ${isMuted ? 'active' : ''}`}
                    onClick={onToggleMute}
                    title={isMuted ? "Unmute Mic" : "Mute Mic"}
                >
                    {isMuted ? (
                        <svg viewBox="0 0 24 24">
                            <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.41 1.41c-.64.42-1.39.67-2.21.67-2.39 0-4.38-1.78-4.72-4.1H5.5c.3 3.29 2.8 5.87 6 6.1V21h2v-2.1c.43-.05.85-.15 1.25-.28l5.1 5.1 1.27-1.27L4.27 3z"/>
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24">
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                        </svg>
                    )}
                </button>

                {/* Mute Camera Button */}
                <button
                    className={`video-control-btn ${isVideoMuted ? 'active' : ''}`}
                    onClick={onToggleVideo}
                    title={isVideoMuted ? "Turn Camera On" : "Turn Camera Off"}
                >
                    {isVideoMuted ? (
                        <svg viewBox="0 0 24 24">
                            <path d="M18 10.48V6c0-1.1-.9-2-2-2H6.83l2 2H16v4.17l2 2zM2.27 2.27L1 3.54l2.58 2.58C3.21 6.38 3 6.67 3 7v10c0 1.1.9 2 2 2h12c.33 0 .62-.21.78-.51l3.68 3.68 1.27-1.27L2.27 2.27zM5 17V8.83L13.17 17H5zm11.53-7.17l4.47-4.47V17l-1-1v-4.5z"/>
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24">
                            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                        </svg>
                    )}
                </button>

                {/* End Call Button */}
                <button
                    className="video-control-btn end-btn"
                    onClick={onEndCall}
                    title="End Call"
                >
                    <svg viewBox="0 0 24 24">
                        <path d="M12 9c-2.2 0-4.3.48-6.2 1.34l-1.9-1.9c2.53-1.44 5.41-2.24 8.5-2.24s5.97.8 8.5 2.24l-1.9 1.9C16.3 9.48 14.2 9 12 9zM21 17.5c0-.55-.45-1-1-1-1.25 0-2.45-.2-3.57-.57a1.02 1.02 0 0 0-1.02.24l-2.2 2.2a15.045 15.045 0 0 1-6.59-6.59l2.2-2.2a1 1 0 0 0 .25-1.02A11.75 11.75 0 0 0 8.5 7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5z" transform="rotate(135 12 12)"/>
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default VideoCall;
