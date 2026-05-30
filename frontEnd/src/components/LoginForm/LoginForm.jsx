import InputField from "../InputField/InputField";

import "./LoginForm.css";

function LoginForm({
    email,
    password,
    errorMessage,
    onEmailChange,
    onPasswordChange,
    onSubmit,
    onRegisterClick,
    onForgotPasswordClick
}) {

    return (

        <form
            className="login-form"
            onSubmit={onSubmit}
        >

            <InputField
                label="Email"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={email}
                onChange={onEmailChange}
            />

            <InputField
                label="Password"
                type="password"
                name="password"
                placeholder="Enter your password"
                value={password}
                onChange={onPasswordChange}
            />

            {
                errorMessage && (

                    <div className="login-error-message">
                        {errorMessage}
                    </div>
                )
            }

            <button
                type="submit"
                className="login-button"
            >
                Login
            </button>

            <div className="login-links">

                <button
                    type="button"
                    className="login-link-button"
                    onClick={onForgotPasswordClick}
                >
                    Forgot Password?
                </button>

                <button
                    type="button"
                    className="login-link-button"
                    onClick={onRegisterClick}
                >
                    Create Account
                </button>

            </div>

        </form>
    );
}

export default LoginForm;