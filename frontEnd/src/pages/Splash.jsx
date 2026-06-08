import { useNavigate } from "react-router-dom";

import Logo from "../components/Logo/Logo";
import "./Splash.css";

function Splash() {

    const navigate = useNavigate();

    const handleGetStarted = () => {
        navigate("/login");
    };

    return (
        <div className="splash-page">

            <div className="splash-content">

                <Logo
                    title="RNA"
                    tagline="Connect Beyond Messages"
                />

                <button
                    className="get-started-button"
                    onClick={handleGetStarted}
                >
                    Get Started
                </button>

            </div>

            <div className="splash-footer">
                <span className="splash-footer-brand">RNA Messaging System</span>
                <span className="splash-footer-secure">🔒 End-to-End Encrypted</span>
            </div>

        </div>
    );
}

export default Splash;