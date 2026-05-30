import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import Logo from "../components/Logo/Logo";

import {
    verifyOTP,
    resendOTP
} from "../services/authService";

import "./VerifyOTP.css";

function VerifyOTP() {

    const navigate = useNavigate();

    const location = useLocation();

    const email =
        location.state?.email || "";

    const [otp, setOTP] =
        useState("");

    const [errorMessage, setErrorMessage] =
        useState("");

    const [successMessage, setSuccessMessage] =
        useState("");

    const handleVerifyOTP =
        async (event) => {

        event.preventDefault();

        setErrorMessage("");
        setSuccessMessage("");

        if (!otp.trim()) {

            setErrorMessage(
                "Please enter OTP."
            );

            return;
        }

        try {

            await verifyOTP(
                email,
                otp
            );

            navigate(
                "/reset-password",
                {
                    state: {
                        email
                    }
                }
            );

        } catch (error) {

            setErrorMessage(
                error.response?.data?.error ||
                "OTP verification failed."
            );
        }
    };

    const handleResendOTP =
        async () => {

        try {

            await resendOTP(
                email
            );

            setSuccessMessage(
                "OTP resent successfully."
            );

        } catch (error) {

            setErrorMessage(
                error.response?.data?.error ||
                "Failed to resend OTP."
            );
        }
    };

    return (

        <div className="verify-otp-page">

            <div className="verify-otp-card">

                <Logo
                    title="RNA"
                    tagline="Connect Beyond Messages"
                />

                <h2>
                    Verify OTP
                </h2>

                <p>
                    OTP sent to:
                </p>

                <p className="verify-otp-email">
                    {email}
                </p>

                <form
                    onSubmit={
                        handleVerifyOTP
                    }
                >

                    <input
                        type="text"
                        placeholder="Enter OTP"
                        value={otp}
                        onChange={(event) =>
                            setOTP(
                                event.target.value
                            )
                        }
                        className="verify-otp-input"
                    />

                    {
                        errorMessage && (

                            <p className="verify-otp-error">
                                {errorMessage}
                            </p>
                        )
                    }

                    {
                        successMessage && (

                            <p className="verify-otp-success">
                                {successMessage}
                            </p>
                        )
                    }

                    <button
                        type="submit"
                        className="verify-otp-button"
                    >
                        Verify OTP
                    </button>

                </form>

                <button
                    className="resend-otp-button"
                    onClick={
                        handleResendOTP
                    }
                >
                    Resend OTP
                </button>

            </div>

        </div>
    );
}

export default VerifyOTP;