import axios from "axios";

const BASE_URL =
    "http://localhost:8080";

export const loginUser = async (
    loginData
) => {

    const response =
        await axios.post(
            `${BASE_URL}/login`,
            loginData
        );

    return response.data;
};

export const registerUser = async (
    registerData
) => {

    const response =
        await axios.post(
            `${BASE_URL}/register`,
            registerData
        );

    return response.data;
};

export const forgotPassword =
    async (email) => {

    const response =
        await axios.post(
            `${BASE_URL}/forgot-password`,
            {
                email
            }
        );

    return response.data;
};

export const verifyOTP =
    async (
        email,
        otp
    ) => {

    const response =
        await axios.post(
            `${BASE_URL}/verify-otp`,
            {
                email,
                otp
            }
        );

    return response.data;
};

export const resendOTP =
    async (email) => {

    const response =
        await axios.post(
            `${BASE_URL}/resend-otp`,
            {
                email
            }
        );

    return response.data;
};

export const resetPassword =
    async (
        email,
        newPassword
    ) => {

    const response =
        await axios.post(
            `${BASE_URL}/reset-password`,
            {
                email,
                new_password:
                    newPassword
            }
        );

    return response.data;
};