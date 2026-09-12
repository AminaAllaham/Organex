const { getApps, initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { v2: cloudinary } = require("cloudinary");

if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
    });
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");

    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({
            error: "Method not allowed",
        });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !/^Bearer\s+\S+$/.test(authHeader)) {
        return res.status(401).json({
            error: "Unauthorized",
        });
    }

    const idToken = authHeader.replace(/^Bearer\s+/, "");
    let decodedToken;

    try {
        decodedToken = await getAuth().verifyIdToken(idToken);
    } catch (error) {
        console.error("PDF access authentication error:", error.message);
        return res.status(401).json({
            error: "Unauthorized",
        });
    }

    const body = req.body;
    const resourceId = body?.resourceId;
    const action = body?.action === undefined ? "view" : body.action;

    if (
        typeof resourceId !== "string" ||
        !resourceId.trim() ||
        resourceId.includes("/") ||
        !["view", "download"].includes(action)
    ) {
        return res.status(400).json({
            error: "Invalid request",
        });
    }

    try {
        const resourceRef = getFirestore().doc(
            `users/${decodedToken.uid}/resources/${resourceId}`
        );
        const resourceSnapshot = await resourceRef.get();

        if (!resourceSnapshot.exists) {
            return res.status(404).json({
                error: "Resource not found",
            });
        }

        const resource = resourceSnapshot.data();
        const file = resource?.file;
        const publicId = file?.publicId;
        const expectedPublicIdPrefix =
            `users/${decodedToken.uid}/resources/`;

        if (
            resource?.resourceType !== "pdf" ||
            !file ||
            typeof publicId !== "string" ||
            !publicId.trim() ||
            !publicId.startsWith(expectedPublicIdPrefix) ||
            file.resourceType !== "raw" ||
            file.deliveryType !== "authenticated" ||
            file.format !== "pdf"
        ) {
            return res.status(400).json({
                error: "Invalid secure PDF resource",
            });
        }

        const expiresAt = Math.floor(Date.now() / 1000) + 300;
        const url = cloudinary.utils.private_download_url(publicId, "pdf", {
            resource_type: "raw",
            type: "authenticated",
            attachment: action === "download",
            expires_at: expiresAt,
        });

        return res.status(200).json({
            url,
            expiresAt,
            action,
        });
    } catch (error) {
        console.error("PDF access error:", error.message);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
};
