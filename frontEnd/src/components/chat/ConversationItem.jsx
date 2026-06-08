import { useState, useEffect } from "react";
import { isEncryptedMessage, decryptMessage, getFileDataFromUrl } from "../../utils/crypto";
import "./ConversationItem.css";


function ConversationItem({
    conversation,
    onClick,
    isSelected
}) {
    const [profilePic, setProfilePic] = useState("");

    // Load profile photo
    useEffect(() => {
        setTimeout(() => {
            const pic = conversation.profile_pic || localStorage.getItem(`profile_pic_${conversation.user_id}`) || "";
            setProfilePic(pic);
        }, 0);
    }, [conversation.user_id, conversation.profile_pic]);

    // Listen to profile updates (e.g. if updated via ProfileDetailPanel)
    useEffect(() => {
        const handleProfileUpdate = () => {
            setTimeout(() => {
                const pic = conversation.profile_pic || localStorage.getItem(`profile_pic_${conversation.user_id}`) || "";
                setProfilePic(pic);
            }, 0);
        };
        window.addEventListener("profileUpdate", handleProfileUpdate);
        return () => window.removeEventListener("profileUpdate", handleProfileUpdate);
    }, [conversation.user_id, conversation.profile_pic]);

    const formatTime = (timestamp) => {
        if (!timestamp) return "";
        const date = new Date(timestamp);
        const now = new Date();
        
        // If today, show time
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }
        
        // If yesterday, show "Yesterday"
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return "Yesterday";
        }

        // If within a week, show day name
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 7) {
            return date.toLocaleDateString([], { weekday: "long" });
        }

        // Otherwise show date
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
    };

    // Render message content helper: handle images and documents safely
    const renderMessageContent = () => {
        const lastMessage = conversation.last_message;
        if (!lastMessage) return "No messages yet";
        
        let content = lastMessage;
        if (isEncryptedMessage(lastMessage)) {
            try {
                content = decryptMessage(lastMessage);
            } catch {
                return "Encrypted message";
            }
        }

        const fileData = getFileDataFromUrl(content);
        if (fileData) {
            if (fileData.isImage) {
                return <span className="media-preview-text">📷 Photo</span>;
            } else {
                return (
                    <span className="media-preview-text">
                        {fileData.icon} {fileData.filename}
                    </span>
                );
            }
        }
        
        return content;
    };


    return (
        <div
            className={`conversation-item ${isSelected ? "active" : ""}`}
            onClick={() => onClick?.(conversation)}
        >
            <div className="conversation-avatar">
                {profilePic ? (
                    <img src={profilePic} alt={conversation.username} className="conversation-avatar-img" />
                ) : (
                    <div className="conversation-avatar-fallback">
                        {conversation.username.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            <div className="conversation-content">
                <div className="conversation-header">
                    <span className="conversation-name">
                        {conversation.username}
                    </span>
                    <span className="conversation-time">
                        {formatTime(conversation.last_message_time)}
                    </span>
                </div>

                <div className="conversation-footer">
                    <span className="conversation-message">
                        {renderMessageContent()}
                    </span>

                    {conversation.unread_count > 0 && (
                        <div className="conversation-unread">
                            {conversation.unread_count}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ConversationItem;