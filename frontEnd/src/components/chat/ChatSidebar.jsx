
import { useEffect, useState } from "react";

import { getConversations }
from "../../services/chatService";

import { searchUsers }
from "../../services/userService";

import ConversationItem
from "./ConversationItem";

import SearchUserItem
from "./SearchUserItem";

import "./ChatSidebar.css";

function ChatSidebar({
    onUserSelect
}) {

    const [conversations, setConversations] =
        useState([]);

    const [searchQuery, setSearchQuery] =
        useState("");

    const [searchResults, setSearchResults] =
        useState([]);

    useEffect(() => {
        loadConversations();
    }, []);

    useEffect(() => {

        const timeout =
            setTimeout(() => {

                if (
                    !searchQuery.trim()
                ) {

                    setSearchResults([]);

                    return;
                }

                handleSearch();

            }, 300);

        return () =>
            clearTimeout(timeout);

    }, [searchQuery]);

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

    const handleSearch =
        async () => {

        try {

            const response =
                await searchUsers(
                    searchQuery
                );

            setSearchResults(
                response.users || []
            );

        } catch (error) {

            console.error(error);
        }
    };

    const handleUserClick =
        (user) => {

        console.log(
            "Selected User:",
            user
        );

        onUserSelect(user);

        setSearchQuery("");

        setSearchResults([]);
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
                    value={searchQuery}
                    onChange={(event) =>
                        setSearchQuery(
                            event.target.value
                        )
                    }
                />

            </div>

            {
                searchResults.length > 0 && (

                    <div className="search-results">

                        {
                            searchResults.map(
                                (user) => (

                                    <SearchUserItem
                                        key={user.id}
                                        user={user}
                                        onClick={
                                            handleUserClick
                                        }
                                    />

                                )
                            )
                        }

                    </div>
                )
            }

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