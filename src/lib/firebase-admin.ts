import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin if it hasn't been initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminAuth = getAuth();

export async function setMasterRole(uid: string) {
  try {
    await adminAuth.setCustomUserClaims(uid, { role: 'master' });
  } catch (error) {
    console.error('Error setting master role:', error);
    throw error;
  }
}

export async function verifyMasterRole(uid: string): Promise<boolean> {
  try {
    const user = await adminAuth.getUser(uid);
    return user.customClaims?.role === 'master';
  } catch (error) {
    console.error('Error verifying master role:', error);
    return false;
  }
}
