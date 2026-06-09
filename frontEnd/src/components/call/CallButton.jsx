import "./VoiceCall.css";

function CallButton({ onVoiceCall, onVideoCall }) {
    return (
        <div className="call-buttons-container">
            <button className="call-btn voice-btn" onClick={onVoiceCall} title="Start Voice Call">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M6.62 10.79a15.15 15.15 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.11-.27 11.72 11.72 0 0 0 3.7.59 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.72 11.72 0 0 0 .59 3.7 1 1 0 0 1-.27 1.11z"/>
                </svg>
                <span>Voice Call</span>
            </button>
            <button className="call-btn video-btn" onClick={onVideoCall} title="Start Video Call">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                </svg>
                <span>Video Call</span>
            </button>
        </div>
    );
}

export default CallButton;