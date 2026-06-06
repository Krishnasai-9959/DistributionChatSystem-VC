import "./ConversationItem.css";

function ConversationItem({
    conversation,
    onClick
}) {

    const formatTime =
        (timestamp) => {

        if (!timestamp)
            return "";

        return new Date(
            timestamp
        ).toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    };

    return (

        <div
            className="conversation-item"
            onClick={() =>
                onClick?.(
                    conversation
                )
            }
        >

            <div className="conversation-header">

                <span>
                    {
                        conversation.username
                    }
                </span>

                <span>
                    {
                        formatTime(
                            conversation.last_message_time
                        )
                    }
                </span>

            </div>

            <div className="conversation-message">

                {
                    conversation.last_message
                }

            </div>

            {
                conversation.unread_count > 0 && (

                    <div className="conversation-unread">

                        {
                            conversation.unread_count
                        }

                    </div>

                )
            }

        </div>
    );
}

export default ConversationItem;