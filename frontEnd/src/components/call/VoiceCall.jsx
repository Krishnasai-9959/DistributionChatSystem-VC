import "./VoiceCall.css";

function VoiceCall({
    inCall,
    onEndCall,
    callStatus,
    callerName,
    isMuted,
    onToggleMute,
    callDuration
}) {

    if (!inCall) {
        return null;
    }

    const formatDuration = (secs) => {
        const mins = Math.floor(secs / 60);
        const remainingSecs = secs % 60;
        return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
    };

    const username = callerName || "Voice Call";
    const initials = username.substring(0, 2).toUpperCase();

    const getStatusLabel = () => {
        if (callStatus === "calling") return "Calling...";
        if (callStatus === "ringing") return "Ringing...";
        if (callStatus === "connected") return "Connected";
        return "Connecting...";
    };

    return (
        <div className="call-overlay">
            <div className="call-card">
                <div className="avatar-container">
                    {callStatus !== "connected" && (
                        <>
                            <div className="avatar-pulse"></div>
                            <div className="avatar-pulse-delayed"></div>
                        </>
                    )}
                    <div className="call-avatar">
                        {initials}
                    </div>
                </div>

                <h2 className="call-name">{username}</h2>
                <div className="call-status">{getStatusLabel()}</div>

                {callStatus === "connected" && (
                    <div className="call-duration">{formatDuration(callDuration)}</div>
                )}

                <div className="call-controls">
                    <button 
                        className={`control-btn mute-btn ${isMuted ? 'active' : ''}`}
                        onClick={onToggleMute}
                        title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
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

                    <button 
                        className="control-btn end-btn" 
                        onClick={onEndCall}
                        title="End Call"
                    >
                        <svg viewBox="0 0 24 24">
                            <path d="M12 9c-2.2 0-4.3.48-6.2 1.34l-1.9-1.9c2.53-1.44 5.41-2.24 8.5-2.24s5.97.8 8.5 2.24l-1.9 1.9C16.3 9.48 14.2 9 12 9zM21 17.5c0-.55-.45-1-1-1-1.25 0-2.45-.2-3.57-.57a1.02 1.02 0 0 0-1.02.24l-2.2 2.2a15.045 15.045 0 0 1-6.59-6.59l2.2-2.2a1 1 0 0 0 .25-1.02A11.75 11.75 0 0 0 8.5 7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5z" transform="rotate(135 12 12)"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default VoiceCall;