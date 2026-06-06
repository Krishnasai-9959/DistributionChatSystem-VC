import { useState } from "react";

import ChatSidebar from "../components/chat/ChatSidebar";
import ChatArea from "../components/chat/ChatArea";

import "./ChatDashboard.css";

function ChatDashboard() {

    const [selectedUser, setSelectedUser] =
        useState(null);

    return (
        <div className="chat-dashboard-page">

            <ChatSidebar
                onUserSelect={setSelectedUser}
            />

            <ChatArea
                selectedUser={selectedUser}
            />

        </div>
    );
}

export default ChatDashboard;