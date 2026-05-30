import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import Logo from "../components/Logo/Logo";

import { resetPassword } from "../services/authService";

import { validatePassword } from "../utils/validation";

import "./ResetPassword.css";

function ResetPassword() {

    const navigate = useNavigate();

    const location = useLocation();

    const email =
        location.state?.email || "";

    const [newPassword, setNewPassword] =
        useState("");

    const [confirmPassword, setConfirmPassword] =
        useState("");

    const [errorMessage, setErrorMessage] =
        useState("");

    const handleResetPassword =
        async (event) => {

        event.preventDefault();

        setErrorMessage("");

        if (!newPassword.trim()) {

            setErrorMessage(
                "Please enter a new password."
            );

            return;
        }

        if (!validatePassword(
            newPassword
        )) {

            setErrorMessage(
                "Password must contain uppercase, lowercase, number and special character."
            );

            return;
        }

        if (
            newPassword !==
            confirmPassword
        ) {

            setErrorMessage(
                "Passwords do not match."
            );

            return;
        }

        try {

            await resetPassword(
                email,
                newPassword
            );

            navigate(
                "/password-reset-success"
            );

        } catch (error) {

            setErrorMessage(
                error.response?.data?.error ||
                "Password reset failed."
            );
        }
    };

    return (

        <div className="reset-password-page">

            <div className="reset-password-card">

                <Logo
                    title="RNA"
                    tagline="Connect Beyond Messages"
                />

                <h2>
                    Reset Password
                </h2>

                <form
                    onSubmit={
                        handleResetPassword
                    }
                >

                    <input
                        type="password"
                        placeholder="New Password"
                        value={newPassword}
                        onChange={(event) =>
                            setNewPassword(
                                event.target.value
                            )
                        }
                        className="reset-password-input"
                    />

                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(event) =>
                            setConfirmPassword(
                                event.target.value
                            )
                        }
                        className="reset-password-input"
                    />

                    {
                        errorMessage && (

                            <p className="reset-password-error">
                                {errorMessage}
                            </p>
                        )
                    }

                    <button
                        type="submit"
                        className="reset-password-button"
                    >
                        Reset Password
                    </button>

                </form>

            </div>

        </div>
    );
}

export default ResetPassword;