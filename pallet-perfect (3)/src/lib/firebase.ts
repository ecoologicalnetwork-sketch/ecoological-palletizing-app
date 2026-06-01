import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, writeBatch, deleteDoc, onSnapshot } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Box, PalletBase, SOSConfig, StandardBox } from '../types';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const googleProvider = new GoogleAuthProvider();

export const signIn = () => signInWithPopup(auth, googleProvider);
export const signOut = () => firebaseSignOut(auth);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const sanitizeId = (id: string) => id.replace(/[\/\.]/g, '-');

// Box Library Sync
export async function saveBoxLibrary(boxes: Box[]) {
  try {
    const batch = writeBatch(db);
    for (const box of boxes) {
      const boxRef = doc(db, 'boxLibrary', sanitizeId(box.sku));
      batch.set(boxRef, box);
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'boxLibrary');
  }
}

export async function fetchBoxLibrary(): Promise<Box[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'boxLibrary'));
    return querySnapshot.docs.map(doc => doc.data() as Box);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'boxLibrary');
    return [];
  }
}

// Pallet Library Sync
export async function savePalletLibrary(pallets: PalletBase[]) {
  try {
    const batch = writeBatch(db);
    for (const pallet of pallets) {
      const palletRef = doc(db, 'palletLibrary', sanitizeId(pallet.id));
      batch.set(palletRef, pallet);
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'palletLibrary');
  }
}

export async function fetchPalletLibrary(): Promise<PalletBase[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'palletLibrary'));
    return querySnapshot.docs.map(doc => doc.data() as PalletBase);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'palletLibrary');
    return [];
  }
}

// Config Sync
export async function saveSOSConfig(config: SOSConfig) {
  try {
    await setDoc(doc(db, 'config', 'settings'), config);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'config/settings');
  }
}

export async function fetchSOSConfig(): Promise<SOSConfig | null> {
  try {
    const d = await getDoc(doc(db, 'config', 'settings'));
    return d.exists() ? d.data() as SOSConfig : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'config/settings');
    return null;
  }
}

// Standard Box Library Sync
export async function saveStandardBoxLibrary(boxes: StandardBox[]) {
  try {
    const batch = writeBatch(db);
    for (const box of boxes) {
      const boxRef = doc(db, 'standardBoxLibrary', sanitizeId(box.id));
      batch.set(boxRef, box);
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'standardBoxLibrary');
  }
}

export async function fetchStandardBoxLibrary(): Promise<StandardBox[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'standardBoxLibrary'));
    return querySnapshot.docs.map(doc => doc.data() as StandardBox);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'standardBoxLibrary');
    return [];
  }
}
