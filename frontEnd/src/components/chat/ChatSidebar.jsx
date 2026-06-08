import {
    useEffect,
    useState
} from "react";



import {
    getConversations
} from "../../services/chatService";

import {
    searchUsers,
    getProfile
} from "../../services/userService";

import ConversationItem from "./ConversationItem";
import SearchUserItem from "./SearchUserItem";
import EditProfileModal from "./EditProfileModal";

import "./ChatSidebar.css";

function ChatSidebar({
    onUserSelect,
    refreshTrigger,
    theme,
    onThemeToggle,
    selectedUser
}) {



    const [conversations, setConversations] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    
    // Current User Profile state
    const [currentUser, setCurrentUser] = useState(() => {
        return JSON.parse(localStorage.getItem("user") || "{}");
    });
    const [userProfilePic, setUserProfilePic] = useState("");
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

    const loadUserProfile = async () => {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        setCurrentUser(user);
        if (user.id) {
            const localPic = localStorage.getItem(`profile_pic_${user.id}`) || "";
            setUserProfilePic(localPic);
            
            try {
                const profileData = await getProfile();
                if (profileData && profileData.user) {
                    const dbPic = profileData.user.profile_pic || "";
                    const dbBio = profileData.user.bio || "";
                    
                    setUserProfilePic(dbPic);
                    localStorage.setItem(`profile_pic_${user.id}`, dbPic);
                    localStorage.setItem(`bio_${user.id}`, dbBio);
                }
            } catch (err) {
                console.error("Failed to fetch profile from server:", err);
            }
        }
    };

    useEffect(() => {
        setTimeout(() => {
            loadUserProfile();
        }, 0);
    }, [refreshTrigger]);


    // Listen to local profile changes (e.g. from the modal)
    useEffect(() => {
        const handleProfileUpdate = () => {
            loadUserProfile();
        };
        window.addEventListener("profileUpdate", handleProfileUpdate);
        return () => window.removeEventListener("profileUpdate", handleProfileUpdate);
    }, []);

    async function loadConversations() {
        try {
            const response = await getConversations();

            const sortedConversations = (response.conversations || []).sort(
                (a, b) => new Date(b.last_message_time) - new Date(a.last_message_time)
            );

            setConversations(sortedConversations);

        } catch (error) {
            console.error("Failed to load conversations:", error);
        }
    }

    async function handleSearch() {
        try {
            const response = await searchUsers(searchQuery);
            setSearchResults(response.users || []);
        } catch (error) {
            console.error("Search failed:", error);
        }
    }

    useEffect(() => {
        setTimeout(() => {
            loadConversations();
        }, 0);
    }, [refreshTrigger]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                return;
            }
            handleSearch();
        }, 300);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);


    const handleUserClick = (user) => {
        onUserSelect(user);
        setSearchQuery("");
        setSearchResults([]);
    };

    const handleConversationClick = (conversation) => {
        onUserSelect({
            id: conversation.user_id,
            username: conversation.username,
        });
    };

    return (
        <div className="chat-sidebar">
            <div className="chat-sidebar-header">
                <div className="user-profile-summary" onClick={() => setIsEditProfileOpen(true)} title="Click to edit profile">
                    <div className="sidebar-user-avatar">
                        {userProfilePic ? (
                            <img src={userProfilePic} alt="User profile" className="sidebar-avatar-img" />
                        ) : (
                            <div className="sidebar-avatar-fallback">
                                {currentUser?.username?.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="sidebar-user-info">
                        <span className="sidebar-username">{currentUser?.username || "Me"}</span>
                        <span className="sidebar-status-text">Settings</span>
                    </div>
                </div>

                <div className="header-actions">
                    <label className="theme-switch" title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}>
                        <input 
                            type="checkbox" 
                            checked={theme === "dark"} 
                            onChange={onThemeToggle} 
                        />
                        <span className="theme-slider"></span>
                    </label>
                </div>
            </div>


            <div className="chat-sidebar-search">
                <div className="search-input-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                    />
                </div>
            </div>

            {searchResults.length > 0 && (
                <div className="search-results">
                    {searchResults.map((user) => (
                        <SearchUserItem
                            key={user.id}
                            user={user}
                            onClick={handleUserClick}
                        />
                    ))}
                </div>
            )}

            <div className="chat-sidebar-conversations">
                {conversations.length === 0 ? (
                    <div className="empty-conversations">
                        No conversations yet
                    </div>
                ) : (
                    conversations.map((conversation) => {
                        const isSelected = selectedUser && selectedUser.id === conversation.user_id;
                        return (
                            <ConversationItem
                                key={conversation.user_id}
                                conversation={conversation}
                                onClick={handleConversationClick}
                                isSelected={isSelected}
                            />
                        );
                    })
                )}
            </div>

            <EditProfileModal
                isOpen={isEditProfileOpen}
                onClose={() => setIsEditProfileOpen(false)}
                currentUser={currentUser}
                onProfileUpdate={loadUserProfile}
            />
        </div>
    );
}

export default ChatSidebar;