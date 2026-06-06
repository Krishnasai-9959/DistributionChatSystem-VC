import { useState } from "react";

import ChatSidebar from "../components/chat/ChatSidebar";
import ChatArea from "../components/chat/ChatArea";

import "./ChatDashboard.css";

function ChatDashboard() {

    const [
        selectedUser,
        setSelectedUser
    ] = useState(null);

    const [
        refreshConversations,
        setRefreshConversations
    ] = useState(0);

    const triggerConversationRefresh =
        () => {

        setRefreshConversations(
            prev => prev + 1
        );
    };

    return (

        <div className="chat-dashboard-page">

            <ChatSidebar
                onUserSelect={
                    setSelectedUser
                }
                refreshTrigger={
                    refreshConversations
                }
            />

            <ChatArea
                selectedUser={
                    selectedUser
                }
                onMessageSent={
                    triggerConversationRefresh
                }
            />

        </div>

    );
}

export default ChatDashboard;