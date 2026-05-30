import "./ConversationItem.css";

function ConversationItem({
    conversation
}) {

    return (

        <div className="conversation-item">

            <div className="conversation-header">

                <span>
                    {conversation.username}
                </span>

                <span>
                    {
                        new Date(
                            conversation.last_message_time
                        ).toLocaleTimeString()
                    }
                </span>

            </div>

            <div className="conversation-message">

                {conversation.last_message}

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