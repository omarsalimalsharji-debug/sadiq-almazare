import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  initializeFirestore,
  doc,
  getDocFromServer,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true,
  },
  firebaseConfig.firestoreDatabaseId
);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot (with single transient retry)
async function testConnection(retryAttempt = 0): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      if (retryAttempt < 1) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        return testConnection(retryAttempt + 1);
      }
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export async function signInWithGoogleFarmer() {
  const result = await signInWithPopup(auth, googleProvider);
  const fbUser = result.user;

  if (fbUser && fbUser.uid) {
    const publicPath = `users/${fbUser.uid}`;
    try {
      const publicRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(publicRef);
      if (!snap.exists()) {
        await setDoc(publicRef, {
          uid: fbUser.uid,
          displayName: (fbUser.displayName || 'مزارع عُماني').slice(0, 80),
          governorate: 'محافظة الداخلية',
          wilayat: 'نزوى',
          role: 'farmer',
          level: 1,
          totalPoints: 0,
          isBanned: false,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(
          publicRef,
          {
            displayName: (fbUser.displayName || 'مزارع عُماني').slice(0, 80),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, publicPath);
    }

    const privatePath = `users/${fbUser.uid}/private/info`;
    try {
      const privRef = doc(db, 'users', fbUser.uid, 'private', 'info');
      const privSnap = await getDoc(privRef);
      if (!privSnap.exists()) {
        await setDoc(privRef, {
          uid: fbUser.uid,
          email: fbUser.email || '',
          notificationsEnabled: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, privatePath);
    }
  }

  return result.user;
}

export async function signOutFirebase() {
  await signOut(auth);
}
