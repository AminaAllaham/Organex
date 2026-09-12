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
        console.error("PDF deletion authentication error:", error.message);
        return res.status(401).json({
            error: "Unauthorized",
        });
    }

    const rawResourceId = req.body?.resourceId;

    if (
        typeof rawResourceId !== "string" ||
        !rawResourceId.trim() ||
        rawResourceId.includes("/")
    ) {
        return res.status(400).json({
            error: "Invalid request",
        });
    }

    const resourceId = rawResourceId.trim();

    const resourceRef = getFirestore().doc(
        `users/${decodedToken.uid}/resources/${resourceId}`
    );
    let resourceSnapshot;

    try {
        resourceSnapshot = await resourceRef.get();
    } catch (error) {
        console.error("PDF resource lookup error:", error.message);
        return res.status(500).json({
            error: "Internal server error",
        });
    }

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

    let deleteResult;

    try {
        deleteResult = await cloudinary.uploader.destroy(publicId, {
            resource_type: "raw",
            type: "authenticated",
            invalidate: true,
        });
    } catch (error) {
        console.error("Cloudinary PDF deletion error:", error.message);
        return res.status(502).json({
            error: "Unable to delete PDF file",
        });
    }

    if (!["ok", "not found"].includes(deleteResult?.result)) {
        console.error("Unexpected Cloudinary PDF deletion result");
        return res.status(502).json({
            error: "Unable to delete PDF file",
        });
    }

    try {
        await resourceRef.delete();
    } catch (error) {
        console.error("PDF resource deletion error:", error.message);
        return res.status(500).json({
            error: "Internal server error",
        });
    }

    return res.status(200).json({
        success: true,
    });
};
