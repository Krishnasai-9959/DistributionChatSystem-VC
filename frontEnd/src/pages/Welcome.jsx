import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Logo from "../components/Logo/Logo";
import "./Welcome.css";

function Welcome() {

    const navigate = useNavigate();

    useEffect(() => {

        const timer = setTimeout(() => {

            navigate("/login");

        }, 3000);

        return () => clearTimeout(timer);

    }, [navigate]);

    return (
        <div className="welcome-page">

            <div className="welcome-card">

                <Logo
                    title="RNA"
                    tagline="Connect Beyond Messages"
                />

                <h2 className="welcome-title">
                    Welcome To RNA
                </h2>

                <p className="welcome-message">
                    Thank You For Choosing RNA
                </p>

                <p className="welcome-redirect">
                    Redirecting to Login...
                </p>

            </div>

        </div>
    );
}

export default Welcome;