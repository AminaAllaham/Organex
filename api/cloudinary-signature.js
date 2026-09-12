const { getApps, initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { v2: cloudinary } = require("cloudinary");

// Initialize Firebase Admin once
if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
    });
}

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed",
        });
    }

    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "Unauthorized",
            });
        }

        const idToken = authHeader.substring(7);

        // Verify Firebase user
        const decodedToken = await getAuth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const timestamp = Math.floor(Date.now() / 1000);

        const folder = `users/${uid}/resources`;

        const paramsToSign = {
            timestamp,
            folder,
            type: "authenticated",
            allowed_formats: "pdf",
            overwrite: false,
        };

        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            process.env.CLOUDINARY_API_SECRET
        );

        return res.status(200).json({
            signature,
            timestamp,
            folder,
            type: "authenticated",
            allowedFormats: "pdf",
            overwrite: false,
            apiKey: process.env.CLOUDINARY_API_KEY,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload`,
        });
    } catch (error) {
        console.error("Cloudinary signature error:", error);

        return res.status(401).json({
            error: "Unauthorized",
        });
    }
};
