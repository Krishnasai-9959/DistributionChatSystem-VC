import { useState, useEffect } from "react";
import { getFileDataFromUrl } from "../../utils/crypto";

import "./ProfileDetailPanel.css";

function ProfileDetailPanel({ user, userStatus, messages = [], onClose }) {
    const [bio, setBio] = useState("");
    const [profilePic, setProfilePic] = useState("");
    const [wallpaper, setWallpaper] = useState("");
    const [mediaVisibility, setMediaVisibility] = useState(true);
    const [lightboxImage, setLightboxImage] = useState(null);

    // Load profile pic and bio from localStorage or fallback
    useEffect(() => {
        if (user) {
            setTimeout(() => {
                const savedPic = localStorage.getItem(`profile_pic_${user.id}`) || user.profile_pic || "";
                const savedBio = localStorage.getItem(`bio_${user.id}`) || user.bio || "Hey there! I am using RNA Chat. 💬";
                const savedMediaVis = localStorage.getItem(`media_visibility_${user.id}`) !== "false";
                const savedWallpaper = localStorage.getItem(`chat_wallpaper_${user.id}`);
                
                setProfilePic(savedPic);
                setBio(savedBio);
                setMediaVisibility(savedMediaVis);
                setWallpaper(savedWallpaper || "");
            }, 0);
        }
    }, [user]);


    if (!user) return null;

    // Filter and extract image data URLs from shared file messages or legacy base64 images
    const sharedImages = messages
        .map((msg) => {
            if (!msg.content) return null;
            const fileData = getFileDataFromUrl(msg.content);
            if (fileData && fileData.isImage) {
                return {
                    id: msg.id,
                    url: fileData.dataUrl,
                    filename: fileData.filename
                };
            }
            if (msg.content.trim().startsWith("data:image/")) {
                return {
                    id: msg.id,
                    url: msg.content.trim(),
                    filename: "shared-image.jpg"
                };
            }
            return null;
        })
        .filter(Boolean);


    const handleMediaVisibilityChange = (e) => {
        const value = e.target.checked;
        setMediaVisibility(value);
        localStorage.setItem(`media_visibility_${user.id}`, value ? "true" : "false");
        
        // Custom event to notify ChatArea to re-render and apply/remove blur on the fly!
        window.dispatchEvent(new Event("mediaVisibilityChanged"));
    };



    // Editable bio for contacts locally (helps personalize chats client-side)
    const handleBioChange = (newBio) => {
        setBio(newBio);
        localStorage.setItem(`bio_${user.id}`, newBio);
    };

    const handleWallpaperChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const maxWidth = 800;
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
                setWallpaper(dataUrl);
                localStorage.setItem(`chat_wallpaper_${user.id}`, dataUrl);
                window.dispatchEvent(new Event("wallpaperChanged"));
            };
        };
        reader.readAsDataURL(file);
    };

    const handleResetWallpaper = () => {
        setWallpaper("");
        localStorage.removeItem(`chat_wallpaper_${user.id}`);
        window.dispatchEvent(new Event("wallpaperChanged"));
    };

    const isOnline = userStatus?.online;
    const lastSeenText = userStatus?.last_seen 
        ? `Last seen ${new Date(userStatus.last_seen).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}`
        : "Offline";

    return (
        <div className="profile-detail-panel">
            <div className="panel-header">
                <h3>Contact Info</h3>
                <button className="panel-close-btn" onClick={onClose}>&times;</button>
            </div>

            <div className="panel-body">
                {/* Profile Picture Section */}
                <div className="contact-card">
                    <div className="contact-avatar-container">
                        {profilePic ? (
                            <img src={profilePic} alt={user.username} className="contact-avatar" />
                        ) : (
                            <div className="contact-avatar-fallback">
                                {user.username.charAt(0).toUpperCase()}
                            </div>
                        )}

                    </div>
                    <h2 className="contact-name">{user.username}</h2>
                    <span className={`contact-status-tag ${isOnline ? "online" : "offline"}`}>
                        {isOnline ? "🟢 Online" : `🔴 ${lastSeenText}`}
                    </span>
                </div>

                <hr className="divider" />

                {/* About / Bio Section */}
                <div className="detail-section">
                    <h4>About</h4>
                    <input 
                        type="text" 
                        className="editable-bio-input" 
                        value={bio} 
                        onChange={(e) => handleBioChange(e.target.value)}
                        placeholder="Set bio for this contact..."
                        maxLength={120}
                        title="Click to edit bio locally"
                    />
                </div>

                <hr className="divider" />

                {/* Settings Section: Media Visibility */}
                <div className="detail-section settings-section">
                    <div className="setting-item">
                        <div className="setting-info">
                            <h4>Media Visibility</h4>
                            <p>Show shared images in chat window</p>
                        </div>
                        <label className="switch">
                            <input 
                                type="checkbox" 
                                checked={mediaVisibility} 
                                onChange={handleMediaVisibilityChange} 
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>
                </div>

                <hr className="divider" />

                {/* Chat Wallpaper Section */}
                <div className="detail-section">
                    <h4>Chat Wallpaper</h4>
                    <div className="wallpaper-settings-row">
                        <label className="wallpaper-upload-btn">
                            📁 Choose Wallpaper
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleWallpaperChange} 
                                style={{ display: "none" }} 
                            />
                        </label>
                        {wallpaper && (
                            <button className="wallpaper-remove-btn" onClick={handleResetWallpaper}>
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                <hr className="divider" />

                {/* Shared Media Gallery */}
                <div className="detail-section media-gallery-section">
                    <h4>Shared Media ({sharedImages.length})</h4>
                    {sharedImages.length === 0 ? (
                        <p className="no-media-text">No images shared in this chat yet</p>
                    ) : (
                        <div className="media-grid">
                            {sharedImages.map((imgItem, idx) => (
                                <div 
                                    key={imgItem.id || idx} 
                                    className="media-thumbnail-container"
                                    onClick={() => {
                                        if (mediaVisibility) {
                                            setLightboxImage(imgItem.url);
                                        }
                                    }}
                                >
                                    <img 
                                        src={imgItem.url} 
                                        alt={imgItem.filename} 
                                        className={`media-thumbnail ${!mediaVisibility ? "blurred" : ""}`}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            {/* Lightbox for shared media */}
            {lightboxImage && (
                <div className="lightbox" onClick={() => setLightboxImage(null)}>
                    <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                        <button className="lightbox-close" onClick={() => setLightboxImage(null)}>&times;</button>
                        <img src={lightboxImage} alt="Shared fullscreen" className="lightbox-img" />
                        <a href={lightboxImage} download="shared-media.jpg" className="download-btn">
                            Download Image
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProfileDetailPanel;
