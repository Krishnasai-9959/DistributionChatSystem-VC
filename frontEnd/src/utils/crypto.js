import CryptoJS from "crypto-js";

const SECRET_KEY = "RNA_CHAT_SECRET";

export const encryptMessage = (message) => {
    return CryptoJS.AES.encrypt(message, SECRET_KEY).toString();
};

export const decryptMessage = (cipherText) => {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
};

export const isEncryptedMessage = (str) => {
    return typeof str === "string" && str.startsWith("U2FsdGVkX1");
};

export const getFileDataFromUrl = (dataUrl) => {
    if (!dataUrl || typeof dataUrl !== "string") return null;
    
    // Check if it's our custom file structure: RNA_FILE|filename|dataURL
    if (dataUrl.startsWith("RNA_FILE|")) {
        const parts = dataUrl.split("|");
        const filename = parts[1] || "file";
        const actualUrl = parts.slice(2).join("|");
        const match = actualUrl.match(/^data:([^;]+);base64,/);
        const mimeType = match ? match[1] : "application/octet-stream";
        
        let icon = "📄";
        let isImage = false;
        
        if (mimeType.startsWith("image/")) {
            icon = "📷";
            isImage = true;
        } else if (mimeType.includes("zip")) {
            icon = "📦";
        } else if (mimeType.includes("pdf")) {
            icon = "📕";
        } else if (mimeType.includes("word") || mimeType.includes("officedocument.wordprocessingml")) {
            icon = "📘";
        } else if (mimeType.includes("excel") || mimeType.includes("officedocument.spreadsheetml")) {
            icon = "📗";
        }
        
        return {
            filename,
            dataUrl: actualUrl,
            mimeType,
            icon,
            isImage
        };
    }
    
    // Fallback: standard Data URL without filename
    const match = dataUrl.match(/^data:([^;]+);base64,/);
    if (!match) return null;
    
    const mimeType = match[1];
    let icon = "📄";
    let isImage = false;
    let extension;
    
    if (mimeType.startsWith("image/")) {
        icon = "📷";
        isImage = true;
        extension = mimeType.split("/")[1] || "png";
    } else if (mimeType.includes("zip")) {
        icon = "📦";
        extension = "zip";
    } else if (mimeType.includes("pdf")) {
        icon = "📕";
        extension = "pdf";
    } else {
        const parts = mimeType.split("/");
        extension = parts[parts.length - 1] || "file";
    }
    
    return {
        filename: `attachment.${extension}`,
        dataUrl,
        mimeType,
        icon,
        isImage
    };
};

