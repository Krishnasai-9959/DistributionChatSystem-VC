import { getSocketToken } from "./chatService";

let socket = null;
let reconnectTimer = null;

function dispatch(payload) {
    try {
        window.dispatchEvent(new CustomEvent("socketMessage", { detail: payload }));
    } catch (err) {
        console.warn("Failed to dispatch socketMessage event", err);
    }
}

async function startSocket() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

    try {
        const resp = await getSocketToken();
        const token = resp.token || resp.socket_token;
        const WS_URL = import.meta.env.VITE_API_URL
            .replace("https://", "wss://")
            .replace("http://", "ws://");

        socket = new WebSocket(`${WS_URL}/ws?socket_token=${token}`);

        socket.onopen = () => {
            console.log("Global WebSocket connected");
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
        };

        socket.onmessage = (event) => {
            let payload = null;
            try {
                payload = JSON.parse(event.data);
            } catch (err) {
                console.warn("Invalid socket payload", err);
                return;
            }

            // Log receive time for diagnostics
            try {
                console.debug('[socketService] received', payload.type, 'from', payload.sender_id, 'at', new Date().toISOString());
            } catch (e) { /* ignore */ }

            // Play ringtone and show notification for incoming offers when not visible
            if (payload.type === "offer" || payload.type === "video-offer") {
                const senderName = payload.username || payload.sender_name || `User (${(payload.sender_id||'').substring(0,6)})`;
                // If tab not visible, show a Notification (requires permission)
                if (document.visibilityState !== "visible") {
                    if (Notification && Notification.permission === "granted") {
                        try {
                            const n = new Notification("Incoming call", {
                                body: `${senderName} is calling you`,
                                tag: `call-${payload.sender_id}`,
                                data: payload
                            });
                            n.onclick = () => {
                                window.focus();
                                window.dispatchEvent(new CustomEvent('incomingCall', { detail: payload }));
                                n.close();
                            };
                        } catch (err) {
                            console.warn("Notification show failed", err);
                        }
                    }
                }

                // Ringtone will be handled by ZegoCloud
            }

            dispatch(payload);
        };

        socket.onerror = (err) => {
            console.error("Global socket error:", err);
        };

        socket.onclose = (ev) => {
            console.log("Global socket closed, reconnecting...", ev);
            if (!reconnectTimer) {
                reconnectTimer = setTimeout(() => {
                    reconnectTimer = null;
                    startSocket();
                }, 3000);
            }
        };
    } catch (err) {
        console.error("Failed to start socket:", err);
        if (!reconnectTimer) {
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                startSocket();
            }, 5000);
        }
    }
}

function sendSocketMessage(message) {
    if (!socket) {
        console.warn("Socket not initialized yet");
        return;
    }
    try {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
            try { console.debug('[socketService] sent', message.type, 'to', message.receiver_id, 'at', new Date().toISOString()); } catch (e) {}
        } else {
            console.warn("Socket not open, message dropped", message);
        }
    } catch (err) {
        console.error("Failed to send socket message", err);
    }
}

export { startSocket, sendSocketMessage };
