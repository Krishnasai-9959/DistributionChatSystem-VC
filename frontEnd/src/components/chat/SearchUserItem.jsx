import "./SearchUserItem.css";

function SearchUserItem({
    user,
    onClick
}) {

    return (

        <div
            className="search-user-item"
            onClick={() => onClick(user)}
        >

            <div className="search-user-avatar">

                {
                    user.username
                        .charAt(0)
                        .toUpperCase()
                }

            </div>

            <div className="search-user-name">

                {user.username}

            </div>

        </div>

    );
}

export default SearchUserItem;