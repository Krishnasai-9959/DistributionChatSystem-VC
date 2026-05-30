import { useEffect, useState } from "react";

import { getConversations }
from "../../services/chatService";

import ConversationItem
from "./ConversationItem";

import "./ChatSidebar.css";

function ChatSidebar() {

    const [conversations, setConversations] =
        useState([]);

    useEffect(() => {

        loadConversations();

    }, []);

    const loadConversations =
        async () => {

        try {

            const response =
                await getConversations();

            setConversations(
                response.conversations || []
            );

        } catch (error) {

            console.error(error);
        }
    };

    return (

        <div className="chat-sidebar">

            <div className="chat-sidebar-header">

                RNA

            </div>

            <div className="chat-sidebar-search">

                <input
                    type="text"
                    placeholder="Search users..."
                />

            </div>

            <div className="chat-sidebar-conversations">

                {
                    conversations.map(
                        (conversation) => (

                            <ConversationItem
                                key={
                                    conversation.user_id
                                }
                                conversation={
                                    conversation
                                }
                            />

                        )
                    )
                }

            </div>

        </div>
    );
}

export default ChatSidebar;