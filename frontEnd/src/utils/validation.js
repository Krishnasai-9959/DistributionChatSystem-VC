export const validateEmail = (email) => {

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailPattern.test(email);
};

export const validateUsername = (username) => {

    const usernamePattern =
        /^[a-zA-Z0-9_.]{3,20}$/;

    return usernamePattern.test(username);
};

export const validatePassword = (password) => {

    const passwordPattern =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

    return passwordPattern.test(password);
};