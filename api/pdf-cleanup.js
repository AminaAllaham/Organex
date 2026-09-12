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
        console.error("PDF cleanup authentication error:", error.message);
        return res.status(401).json({
            error: "Unauthorized",
        });
    }

    const rawPublicId = req.body?.publicId;

    if (typeof rawPublicId !== "string" || !rawPublicId.trim()) {
        return res.status(400).json({
            error: "Invalid secure PDF",
        });
    }

    const publicId = rawPublicId.trim();
    const expectedPublicIdPrefix =
        `users/${decodedToken.uid}/resources/`;
    const suffix = publicId.slice(expectedPublicIdPrefix.length);

    if (
        !publicId.startsWith(expectedPublicIdPrefix) ||
        !suffix ||
        suffix.startsWith("/") ||
        suffix.includes("..") ||
        suffix.includes("\\")
    ) {
        return res.status(400).json({
            error: "Invalid secure PDF",
        });
    }

    let resourceSnapshot;

    try {
        resourceSnapshot = await getFirestore()
            .collection("users")
            .doc(decodedToken.uid)
            .collection("resources")
            .where("file.publicId", "==", publicId)
            .limit(1)
            .get();
    } catch (error) {
        console.error("PDF cleanup reference check failed");
        return res.status(500).json({
            error: "Internal server error",
        });
    }

    if (!resourceSnapshot.empty) {
        return res.status(409).json({
            error: "PDF is already attached to a resource",
        });
    }

    let deleteResult;

    try {
        deleteResult = await cloudinary.uploader.destroy(publicId, {
            resource_type: "raw",
            type: "authenticated",
            invalidate: true,
        });
    } catch (error) {
        console.error("PDF cleanup failed");
        return res.status(502).json({
            error: "Unable to clean up PDF",
        });
    }

    if (!["ok", "not found"].includes(deleteResult?.result)) {
        console.error("Unexpected PDF cleanup result");
        return res.status(502).json({
            error: "Unable to clean up PDF",
        });
    }

    return res.status(200).json({
        success: true,
    });
};
