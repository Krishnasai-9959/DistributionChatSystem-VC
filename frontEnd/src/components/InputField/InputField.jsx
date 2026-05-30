import { useState } from "react";

import "./InputField.css";

function InputField({
    label,
    type,
    name,
    placeholder,
    value,
    onChange
}) {

    const [showPassword, setShowPassword] =
        useState(false);

    const isPasswordField =
        type === "password";

    const handlePasswordToggle = () => {

        setShowPassword(
            !showPassword
        );
    };

    return (

        <div className="input-field-container">

            <label
                htmlFor={name}
                className="input-field-label"
            >
                {label}
            </label>

            <div className="input-field-wrapper">

                <input
                    id={name}
                    name={name}
                    type={
                        isPasswordField
                            ? (
                                showPassword
                                    ? "text"
                                    : "password"
                            )
                            : type
                    }
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className="input-field-control"
                />

                {
                    isPasswordField && (

                        <button
                            type="button"
                            className="password-toggle-button"
                            onClick={
                                handlePasswordToggle
                            }
                        >
                            {
                                showPassword
                                    ? "Hide"
                                    : "Show"
                            }
                        </button>
                    )
                }

            </div>

        </div>
    );
}

export default InputField;