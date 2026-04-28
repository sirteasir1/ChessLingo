import * as admin from "firebase-admin";

let initialized = false;

try {
  if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const projectId  = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

    if (projectId && privateKey && clientEmail) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, privateKey, clientEmail }),
      });
      initialized = true;
    } else {
      // Initialize without credentials (will fail on actual queries)
      console.warn("Firebase Admin: Missing env vars — some server features may not work");
      admin.initializeApp({ projectId: projectId ?? "chess-ca57d" });
    }
  } else {
    initialized = true;
  }
} catch (e) {
  console.error("Firebase Admin init error:", e);
}

export const adminDb   = admin.apps.length ? admin.firestore() : null;
export const adminAuth = admin.apps.length ? admin.auth()      : null;
export default admin;
