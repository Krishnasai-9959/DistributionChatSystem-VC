import { useState, useEffect } from "react";
import { updateProfile } from "../../services/userService";
import "./EditProfileModal.css";

function EditProfileModal({ isOpen, onClose, currentUser, onProfileUpdate }) {
    const [bio, setBio] = useState("");
    const [profilePic, setProfilePic] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (currentUser && isOpen) {
            setTimeout(() => {
                const savedBio = localStorage.getItem(`bio_${currentUser.id}`) || "Hey there! I am using RNA Chat. 🚀";
                const savedPic = localStorage.getItem(`profile_pic_${currentUser.id}`) || "";
                setBio(savedBio);
                setProfilePic(savedPic);
            }, 0);
        }
    }, [currentUser, isOpen]);


    if (!isOpen) return null;

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const maxDim = 250; // Avatars can be small (250x250) to optimize storage
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

                const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                setProfilePic(dataUrl);
            };
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateProfile(bio, profilePic);
            localStorage.setItem(`bio_${currentUser.id}`, bio);
            localStorage.setItem(`profile_pic_${currentUser.id}`, profilePic);
            
            window.dispatchEvent(new Event("profileUpdate"));
            onProfileUpdate?.();
            onClose();
        } catch (error) {
            console.error("Failed to save profile:", error);
            alert("Error saving profile. Try a smaller image.");
        } finally {
            setIsSaving(false);
        }
    };

    const removeProfilePic = async () => {
        setProfilePic("");
        try {
            await updateProfile(bio, "");
            localStorage.removeItem(`profile_pic_${currentUser.id}`);
            window.dispatchEvent(new Event("profileUpdate"));
        } catch (error) {
            console.error("Failed to remove profile pic:", error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        window.location.href = "/login";
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Edit Profile Settings</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                
                <div className="modal-body">
                    <div className="profile-pic-section">
                        <div className="avatar-preview-container">
                            {profilePic ? (
                                <img src={profilePic} alt="Profile Preview" className="avatar-preview" />
                            ) : (
                                <div className="avatar-preview-fallback">
                                    {currentUser?.username?.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        
                        <div className="avatar-actions">
                            <label className="upload-btn">
                                Choose Photo
                                <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
                            </label>
                            {profilePic && (
                                <button className="remove-btn" onClick={removeProfilePic}>Remove</button>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Username</label>
                        <input type="text" value={currentUser?.username || ""} disabled className="disabled-input" />
                        <small className="help-text">Username cannot be changed</small>
                    </div>

                    <div className="form-group">
                        <label>Bio</label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Write something about yourself..."
                            maxLength={120}
                            rows={3}
                        />
                        <span className="char-count">{bio.length}/120</span>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="logout-modal-btn" onClick={handleLogout}>
                        Logout
                    </button>
                    <div className="footer-right-actions">
                        <button className="cancel-btn" onClick={onClose}>Cancel</button>
                        <button className="save-btn" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EditProfileModal;
