import axios from 'axios';
import { ZIM } from 'zego-zim-web';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';

// Initialize ZegoCloud for global call invitations
export const initZegoCloud = async (user) => {
    if (!user || !user.id || !user.username) {
        console.warn("ZegoCloud init failed: Invalid user object", user);
        return null;
    }

    try {
        // Fetch the token securely from the backend
        const accessToken = localStorage.getItem("access_token");
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/call/token`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        const token = response.data.token;

        const zp = ZegoUIKitPrebuilt.create(token);
        
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
