import { useState, useEffect } from "react";

import ChatSidebar from "../components/chat/ChatSidebar";
import ChatArea from "../components/chat/ChatArea";
import ProfileDetailPanel from "../components/chat/ProfileDetailPanel";

import "./ChatDashboard.css";

function ChatDashboard() {
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedUserStatus, setSelectedUserStatus] = useState(null);
    const [refreshConversations, setRefreshConversations] = useState(0);
    const [showProfilePanel, setShowProfilePanel] = useState(false);
    const [currentMessages, setCurrentMessages] = useState([]);
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("theme") || "light";
    });

    // Handle theme side effects
    useEffect(() => {
        document.body.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    // Handle contact photo updates locally to refresh lists
    useEffect(() => {
        const handleProfileUpdate = () => {
            setRefreshConversations(prev => prev + 1);
        };
        window.addEventListener("profileUpdate", handleProfileUpdate);
        return () => window.removeEventListener("profileUpdate", handleProfileUpdate);
    }, []);

    // Handle hardware/browser back button on mobile
    useEffect(() => {
        const handlePopState = (event) => {
            if (selectedUser) {
                setSelectedUser(null);
            }
        };
        window.addEventListener("popstate", handlePopState);
        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, [selectedUser]);

    const toggleTheme = () => {
        setTheme(prev => (prev === "light" ? "dark" : "light"));
    };

    const triggerConversationRefresh = () => {
        setRefreshConversations(prev => prev + 1);
    };

    const handleUserSelect = (user) => {
        setSelectedUser(user);
        setSelectedUserStatus(null); // Reset status when switching users
        setShowProfilePanel(false); // Close profile panel when switching users
        if (user && !selectedUser) {
            window.history.pushState({ chatActive: true }, "");
        }
    };

    return (
        <div className={`chat-dashboard-page ${selectedUser ? "chat-selected" : ""} ${showProfilePanel ? "profile-open" : ""}`}>
            <div className="chat-sidebar-wrapper">
                <ChatSidebar
                    onUserSelect={handleUserSelect}
                    refreshTrigger={refreshConversations}
                    theme={theme}
                    onThemeToggle={toggleTheme}
                    selectedUser={selectedUser}
                />
            </div>

            <div className="chat-area-wrapper">
                <ChatArea
                    selectedUser={selectedUser}
                    onUserSelect={handleUserSelect}
                    onMessageSent={triggerConversationRefresh}
                    onMessagesUpdate={setCurrentMessages}
                    onStatusUpdate={setSelectedUserStatus}
                    onToggleProfile={() => setShowProfilePanel(prev => !prev)}
                    onBack={() => setSelectedUser(null)}
                />
            </div>

            {showProfilePanel && selectedUser && (
                <ProfileDetailPanel
                    user={selectedUser}
                    userStatus={selectedUserStatus}
                    messages={currentMessages}
                    onClose={() => setShowProfilePanel(false)}
                />
            )}
        </div>
    );
}

export default ChatDashboard;