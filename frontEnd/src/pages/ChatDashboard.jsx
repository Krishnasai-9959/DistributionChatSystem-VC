import ChatSidebar from "../components/chat/ChatSidebar";
import ChatArea from "../components/chat/ChatArea";

import "./ChatDashboard.css";

function ChatDashboard() {

    return (

        <div className="chat-dashboard-page">

            <ChatSidebar />

            <ChatArea />

        </div>

    );
}

export default ChatDashboard;