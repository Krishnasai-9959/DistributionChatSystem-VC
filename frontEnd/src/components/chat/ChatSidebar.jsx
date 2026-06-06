import {
    useEffect,
    useState
} from "react";

import {
    useNavigate
} from "react-router-dom";

import {
    getConversations
} from "../../services/chatService";

import {
    searchUsers
} from "../../services/userService";

import ConversationItem from "./ConversationItem";
import SearchUserItem from "./SearchUserItem";

import "./ChatSidebar.css";

function ChatSidebar({
    onUserSelect,
    refreshTrigger
}) {

    const navigate =
        useNavigate();

    const [conversations, setConversations] =
        useState([]);

    const [searchQuery, setSearchQuery] =
        useState("");

    const [searchResults, setSearchResults] =
        useState([]);

    useEffect(() => {

        loadConversations();

    }, [refreshTrigger]);

    useEffect(() => {

        const timeout =
            setTimeout(() => {

                if (!searchQuery.trim()) {

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

            const sortedConversations =
                (
                    response.conversations || []
                ).sort(
                    (a, b) =>
                        new Date(
                            b.last_message_time
                        ) -
                        new Date(
                            a.last_message_time
                        )
                );

            setConversations(
                sortedConversations
            );

        } catch (error) {

            console.error(
                "Failed to load conversations:",
                error
            );
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

            console.error(
                "Search failed:",
                error
            );
        }
    };

    const handleUserClick =
        (user) => {

        onUserSelect(user);

        setSearchQuery("");

        setSearchResults([]);
    };

    const handleConversationClick =
        (conversation) => {

        onUserSelect({

            id:
                conversation.user_id,

            username:
                conversation.username,
        });
    };

    const handleLogout =
        () => {

        localStorage.removeItem(
            "access_token"
        );

        localStorage.removeItem(
            "refresh_token"
        );

        localStorage.removeItem(
            "user"
        );

        navigate("/login");
    };

    return (

        <div className="chat-sidebar">

            <div className="chat-sidebar-header">

                <span>
                    RNA
                </span>

                <button
                    className="logout-button"
                    onClick={
                        handleLogout
                    }
                >
                    Logout
                </button>

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
                    conversations.length === 0 ? (

                        <div className="empty-conversations">

                            No conversations yet

                        </div>

                    ) : (

                        conversations.map(
                            (conversation) => (

                                <ConversationItem
                                    key={
                                        conversation.user_id
                                    }
                                    conversation={
                                        conversation
                                    }
                                    onClick={
                                        handleConversationClick
                                    }
                                />

                            )
                        )
                    )
                }

            </div>

        </div>
    );
}

export default ChatSidebar;