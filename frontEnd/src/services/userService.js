import axios from "axios";

const BASE_URL =
    "http://localhost:8080";

export const searchUsers =
    async (query) => {

    const token =
        localStorage.getItem(
            "access_token"
        );

    const response =
        await axios.get(
            `${BASE_URL}/api/users/search?q=${query}`,
            {
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

    return response.data;
};

export const getUserStatus =
async (userId) => {

    const token =
        localStorage.getItem(
            "access_token"
        );

    const response =
        await axios.get(
            `http://localhost:8080/api/users/status/${userId}`,
            {
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

    return response.data;
};

export const getProfile = async () => {
    const token = localStorage.getItem("access_token");
    const response = await axios.get(
        `${BASE_URL}/api/profile`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );
    return response.data;
};

export const updateProfile = async (bio, profilePic) => {
    const token = localStorage.getItem("access_token");
    const response = await axios.put(
        `${BASE_URL}/api/profile`,
        { bio, profile_pic: profilePic },
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );
    return response.data;
};