import axios from "axios";

export const getConversations =
async () => {

    const token =
        localStorage.getItem(
            "access_token"
        );

    const response =
        await axios.get(
            "http://localhost:8080/conversations",
            {
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

    return response.data;
};