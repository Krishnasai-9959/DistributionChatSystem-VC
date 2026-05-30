import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Logo from "../components/Logo/Logo";

import "./PasswordResetSuccess.css";

function PasswordResetSuccess() {

    const navigate = useNavigate();

    useEffect(() => {

        const timer =
            setTimeout(() => {

                navigate("/login");

            }, 3000);

        return () =>
            clearTimeout(timer);

    }, [navigate]);

    return (

        <div className="password-success-page">

            <div className="password-success-card">

                <Logo
                    title="RNA"
                    tagline="Connect Beyond Messages"
                />

                <h2>
                    Password Reset Successful
                </h2>

                <p>
                    Redirecting to Login...
                </p>

            </div>

        </div>
    );
}

export default PasswordResetSuccess;