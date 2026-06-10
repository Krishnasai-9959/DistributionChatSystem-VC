import axios from 'axios';
import { ZIM } from 'zego-zim-web';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';

export const initZegoCloud = async (user) => {
    if (!user || !user.id || !user.username) {
        console.warn("ZegoCloud init failed: Invalid user object", user);
        return null;
    }

    try {
        let rawAppID = import.meta.env.VITE_ZEGO_APP_ID;
        if (typeof rawAppID === "string") {
            rawAppID = rawAppID.replace(/['"]/g, "").trim();
        }
        const appID = Number(rawAppID);

        if (!appID) {
            console.error("ZegoCloud appID is missing from frontend env variables");
            return null;
        }

        const token = localStorage.getItem("access_token");
        if (!token) {
            console.error("No access token found in localStorage");
            return null;
        }

        // Fetch Zego token securely from backend
        const response = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/call/token`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        const zegoToken = response.data.token;

        if (!zegoToken) {
            console.error("Failed to retrieve Zego token from server");
            return null;
        }

        // Generate production kitToken wrapping the backend-generated token
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
            appID,
            zegoToken,
            "", // roomID is not needed for ZIM global invitation plugin initialization
            user.id,
            user.username
        );

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        
        // Add ZIM plugin for Call Invitation functionality (WhatsApp-like ringing)
        zp.addPlugins({ ZIM });

        return zp;
    } catch (error) {
        console.error("Failed to initialize ZegoCloud:", error);
        return null;
    }
};

// Start a 1-on-1 call using ZegoCloud
export const startZegoCall = (zp, targetUser, isVideoCall = false) => {
    if (!zp || !targetUser) return;

    const targetUserID = String(targetUser.id);
    const targetUserName = targetUser.username;

    zp.sendCallInvitation({
        callees: [{ userID: targetUserID, userName: targetUserName }],
        callType: isVideoCall ? ZegoUIKitPrebuilt.InvitationTypeVideoCall : ZegoUIKitPrebuilt.InvitationTypeVoiceCall,
        timeout: 60, // 60 seconds ringing timeout
    }).then((res) => {
        console.log("Call invitation sent successfully", res);
        if (res.errorInvitees.length > 0) {
            console.warn("The user might be offline or unreachable.");
        }
    }).catch((err) => {
        console.error("Failed to send call invitation", err);
    });
};
