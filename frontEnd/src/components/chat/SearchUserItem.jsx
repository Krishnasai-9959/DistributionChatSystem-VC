import { useState, useEffect } from "react";
import "./SearchUserItem.css";

function SearchUserItem({
    user,
    onClick
}) {
    const [profilePic, setProfilePic] = useState("");

    useEffect(() => {
        setTimeout(() => {
            const pic = user.profile_pic || localStorage.getItem(`profile_pic_${user.id}`) || "";
            setProfilePic(pic);
        }, 0);
    }, [user.id, user.profile_pic]);


    return (
        <div
            className="search-user-item"
            onClick={() => onClick(user)}
        >
            <div className="search-user-avatar">
                {profilePic ? (
                    <img src={profilePic} alt={user.username} className="search-avatar-img" />
                ) : (
                    user.username.charAt(0).toUpperCase()
                )}
            </div>

            <div className="search-user-name">
                {user.username}
            </div>
        </div>
    );
}

export default SearchUserItem;