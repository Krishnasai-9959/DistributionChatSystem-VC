
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { startSocket } from "./services/socketService";
import { registerServiceWorker } from "./services/pushService";

ReactDOM.createRoot(document.getElementById("root")).render(
    <BrowserRouter>
        <App />
    </BrowserRouter>
);

// Start global socket connection on app load
startSocket().catch(err => console.warn("startSocket error:", err));

// Request notification permission for incoming-call notifications (if not already granted)
if (typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted") {
    try { Notification.requestPermission().then(() => {}); } catch (e) { void e; }
}

// Register service worker for optional Web Push (scaffolding)
(async () => {
    try {
        const reg = await registerServiceWorker();
        if (reg) console.log('Service worker active:', reg.active);
    } catch (e) {
        console.warn('Service worker registration error:', e);
    }
})();