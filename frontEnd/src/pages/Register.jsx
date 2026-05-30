import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Logo from "../components/Logo/Logo";
import RegisterForm from "../components/RegisterForm/RegisterForm";

import { registerUser } from "../services/authService";

import {
    validateEmail,
    validateUsername,
    validatePassword
} from "../utils/validation";

import "./Register.css";

function Register() {

    const navigate = useNavigate();

    const [username, setUsername] = useState("");

    const [email, setEmail] = useState("");

    const [password, setPassword] = useState("");

    const [confirmPassword, setConfirmPassword] =
        useState("");

    const [errorMessage, setErrorMessage] =
        useState("");

    const handleRegister = async (event) => {

        event.preventDefault();

        setErrorMessage("");

        // Username Validation

        if (!username.trim()) {

            setErrorMessage(
                "Please enter a username."
            );

            return;
        }

        if (!validateUsername(username)) {

            setErrorMessage(
                "Username must be 3-20 characters and contain only letters, numbers, _ or ."
            );

            return;
        }

        // Email Validation

        if (!email.trim()) {

            setErrorMessage(
                "Please enter your email."
            );

            return;
        }

        if (!validateEmail(email)) {

            setErrorMessage(
                "Please enter a valid email address."
            );

            return;
        }

        // Password Validation

        if (!password.trim()) {

            setErrorMessage(
                "Please enter your password."
            );

            return;
        }

        if (!validatePassword(password)) {

            setErrorMessage(
                "Password must contain uppercase, lowercase, number and special character."
            );

            return;
        }

        // Confirm Password Validation

        if (!confirmPassword.trim()) {

            setErrorMessage(
                "Please confirm your password."
            );

            return;
        }

        if (password !== confirmPassword) {

            setErrorMessage(
                "Passwords do not match."
            );

            return;
        }

        try {

            const response = await registerUser({
                username,
                email,
                password
            });

            console.log(response);

            navigate("/welcome");

        } catch (error) {

            setErrorMessage(
                error.response?.data?.error ||
                error.response?.data?.message ||
                "Registration failed."
            );
        }
    };

    return (

        <div className="register-page">

            <div className="register-card">

                <Logo
                    title="RNA"
                    tagline="Connect Beyond Messages"
                />

                <RegisterForm
                    username={username}
                    email={email}
                    password={password}
                    confirmPassword={confirmPassword}
                    errorMessage={errorMessage}

                    onUsernameChange={(event) => {

                        setErrorMessage("");

                        setUsername(
                            event.target.value
                        );
                    }}

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

                    onConfirmPasswordChange={(event) => {

                        setErrorMessage("");

                        setConfirmPassword(
                            event.target.value
                        );
                    }}

                    onSubmit={handleRegister}
                />

            </div>

        </div>
    );
}

export default Register;