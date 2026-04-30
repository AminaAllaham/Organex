require("dotenv").config();
const admin = require("firebase-admin");

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!admin.apps.length && projectId && clientEmail && privateKey) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

async function verifyFirebaseConnection() {
  try {
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY in backend/.env"
      );
    }
    await admin.app().options.credential.getAccessToken();
    console.log("Firebase Connected Successfully");
  } catch (err) {
    console.error("Error with Firebase Connection:", err.message);
  }
}

module.exports = { admin, verifyFirebaseConnection };
