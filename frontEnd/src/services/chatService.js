import axios from "axios";

const BASE_URL =
    "http://localhost:8080";

export const getConversations =
async () => {

    const token =
        localStorage.getItem(
            "access_token"
        );

    const response =
        await axios.get(
            `${BASE_URL}/api/conversations`,
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
            `${BASE_URL}/api/messages/${receiverId}`,
            {
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

    return response.data;
};

export const getSocketToken =
async () => {

    const token =
        localStorage.getItem(
            "access_token"
        );

    const response =
        await axios.post(
            `${BASE_URL}/api/socket-token`,
            {},
            {
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

    return response.data;
};