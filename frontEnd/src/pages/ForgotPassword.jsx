import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Logo from "../components/Logo/Logo";

import { forgotPassword }
from "../services/authService";

import { validateEmail }
from "../utils/validation";

import "./ForgotPassword.css";

function ForgotPassword() {

    const navigate = useNavigate();

    const [email, setEmail] =
        useState("");

    const [errorMessage, setErrorMessage] =
        useState("");

    const handleForgotPassword =
        async (event) => {

        event.preventDefault();

        setErrorMessage("");

        if (!email.trim()) {

            setErrorMessage(
                "Please enter your email."
            );

            return;
        }

        if (!validateEmail(email)) {

            setErrorMessage(
                "Please enter a valid email."
            );

            return;
        }

        try {

            await forgotPassword(email);

            navigate(
                "/verify-otp",
                {
                    state: {
                        email
                    }
                }
            );

        } catch (error) {

            setErrorMessage(
                error.response?.data?.error ||
                "Failed to send OTP."
            );
        }
    };

    return (

        <div className="forgot-password-page">

            <div className="forgot-password-card">

                <Logo
                    title="RNA"
                    tagline="Connect Beyond Messages"
                />

                <h2>
                    Forgot Password
                </h2>

                <form
                    onSubmit={
                        handleForgotPassword
                    }
                >

                    <input
                        type="email"
                        placeholder="Enter Email"
                        value={email}
                        onChange={(event) =>
                            setEmail(
                                event.target.value
                                    .trim()
                                    .toLowerCase()
                            )
                        }
                        className="forgot-password-input"
                    />

                    {
                        errorMessage && (

                            <p className="forgot-password-error">
                                {errorMessage}
                            </p>
                        )
                    }

                    <button
                        type="submit"
                        className="forgot-password-button"
                    >
                        Send OTP
                    </button>

                </form>

            </div>

        </div>
    );
}

export default ForgotPassword;