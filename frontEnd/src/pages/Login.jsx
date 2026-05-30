import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Logo from "../components/Logo/Logo";
import LoginForm from "../components/LoginForm/LoginForm";

import { loginUser } from "../services/authService";
import { validateEmail } from "../utils/validation";

import "./Login.css";

function Login() {

    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [errorMessage, setErrorMessage] =
        useState("");

    const handleLogin = async (event) => {

        event.preventDefault();

        setErrorMessage("");

        if (!email.trim()) {

            setErrorMessage(
                "Please enter your email address."
            );

            return;
        }

        if (!validateEmail(email)) {

            setErrorMessage(
                "Please enter a valid email address."
            );

            return;
        }

        if (!password.trim()) {

            setErrorMessage(
                "Please enter your password."
            );

            return;
        }

        try {

            const response = await loginUser({
                email,
                password
            });

            localStorage.setItem(
                "access_token",
                response.access_token
            );

            localStorage.setItem(
                "refresh_token",
                response.refresh_token
            );

            localStorage.setItem(
                "user",
                JSON.stringify(response.user)
            );

           navigate("/chat");

            // Future
            // navigate("/chat");

        } catch (error) {

            setErrorMessage(
                error.response?.data?.error ||
                "Email or password is incorrect."
            );
        }
    };

    return (

        <div className="login-page">

            <div className="login-card">

                <Logo
                    title="RNA"
                    tagline="Connect Beyond Messages"
                />

                <LoginForm
                    email={email}
                    password={password}
                    errorMessage={errorMessage}

                    onEmailChange={(event) => {

                        setErrorMessage("");

                        setEmail(
                            event.target.value
                                .trim()
                                .toLowerCase()
                        );
                    }}

                    onPasswordChange={(event) => {

                        setErrorMessage("");

                        setPassword(
                            event.target.value
                        );
                    }}

                    onSubmit={handleLogin}

                    onRegisterClick={() =>
                        navigate("/register")
                    }

                    onForgotPasswordClick={() =>
                        navigate("/forgot-password")
                    }
                />

            </div>

        </div>
    );
}

export default Login;