import { Routes, Route } from "react-router-dom";

import Splash from "./pages/Splash";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Welcome from "./pages/Welcome";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyOTP from "./pages/VerifyOTP";
import ResetPassword from "./pages/ResetPassword";
import PasswordResetSuccess from "./pages/PasswordResetSuccess";
import ChatDashboard from "./pages/ChatDashboard";
function App() {

    return (

        <Routes>

            <Route
                path="/"
                element={<Splash />}
            />

            <Route
                path="/login"
                element={<Login />}
            />

            <Route
                path="/register"
                element={<Register />}
            />

            <Route
                path="/welcome"
                element={<Welcome />}
            />
            <Route
    path="/forgot-password"
    element={<ForgotPassword />}
/>
<Route
    path="/verify-otp"
    element={<VerifyOTP />}
/>
<Route
    path="/reset-password"
    element={<ResetPassword />}
/>

<Route
    path="/password-reset-success"
    element={<PasswordResetSuccess />}
/>

<Route
    path="/chat"
    element={<ChatDashboard />}
/>

        </Routes>

    );
}

export default App;