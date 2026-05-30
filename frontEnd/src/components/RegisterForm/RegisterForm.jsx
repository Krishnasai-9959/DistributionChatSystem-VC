import InputField from "../InputField/InputField";

import "./RegisterForm.css";

function RegisterForm({
    username,
    email,
    password,
    confirmPassword,
    onUsernameChange,
    onEmailChange,
    onPasswordChange,
    onConfirmPasswordChange,
    onSubmit,
    errorMessage
}) {
    return (
        <form
            className="register-form"
            onSubmit={onSubmit}
        >

            <InputField
                label="Username"
                type="text"
                name="username"
                placeholder="Enter username"
                value={username}
                onChange={onUsernameChange}
            />

            <InputField
                label="Email"
                type="email"
                name="email"
                placeholder="Enter email"
                value={email}
                onChange={onEmailChange}
            />

            <InputField
                label="Password"
                type="password"
                name="password"
                placeholder="Enter password"
                value={password}
                onChange={onPasswordChange}
            />

            <InputField
                label="Confirm Password"
                type="password"
                name="confirmPassword"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={onConfirmPasswordChange}
            />

            {
                errorMessage && (
                    <div className="register-error-message">
                        {errorMessage}
                    </div>
                )
            }

            <button
                type="submit"
                className="register-button"
            >
                Create Account
            </button>

        </form>
    );
}

export default RegisterForm;