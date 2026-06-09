import "./IncomingCallBanner.css";

function IncomingCallModal({
    caller,
    onAccept,
    onReject
}) {

    if (!caller) {
        return null;
    }

    const username = caller.username || "User";
    const initials = username
        .substring(0, 2)
        .toUpperCase();

    const isVideo = caller.type === "video-offer";

    return (
        <div className="incoming-call-banner">
            <div className="banner-avatar-container">
                <div className="banner-avatar-pulse"></div>
                <div className="banner-avatar">
                    {initials}
                </div>
            </div>

            <div className="banner-details">
                <div className="banner-caller-name">
                    {username}
                </div>
                <div className="banner-call-type">
                    {isVideo ? "📹 Incoming Video Call..." : "📞 Incoming Voice Call..."}
                </div>
            </div>

            <div className="banner-actions">
                <button 
                    className="banner-btn accept-btn" 
                    onClick={onAccept}
                    title="Answer Call"
                >
                    <svg viewBox="0 0 24 24">
                        <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1.02 1.02 0 0 0-1.02.24l-2.2 2.2a15.045 15.045 0 0 1-6.59-6.59l2.2-2.2a1 1 0 0 0 .25-1.02A11.75 11.75 0 0 0 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z"/>
                    </svg>
                </button>
                
                <button 
                    className="banner-btn decline-btn" 
                    onClick={onReject}
                    title="Decline Call"
                >
                    <svg viewBox="0 0 24 24">
                        <path d="M12 9c-2.2 0-4.3.48-6.2 1.34l-1.9-1.9c2.53-1.44 5.41-2.24 8.5-2.24s5.97.8 8.5 2.24l-1.9 1.9C16.3 9.48 14.2 9 12 9zM21 17.5c0-.55-.45-1-1-1-1.25 0-2.45-.2-3.57-.57a1.02 1.02 0 0 0-1.02.24l-2.2 2.2a15.045 15.045 0 0 1-6.59-6.59l2.2-2.2a1 1 0 0 0 .25-1.02A11.75 11.75 0 0 0 8.5 7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5z" transform="rotate(135 12 12)"/>
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default IncomingCallModal;