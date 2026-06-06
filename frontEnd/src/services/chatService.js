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

export const getChatHistory =
async (receiverId) => {

    const token =
        localStorage.getItem(
            "access_token"
        );

    const response =
        await axios.get(
            `http://localhost:8080/api/messages/${receiverId}`,
            {
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

    return response.data;
};