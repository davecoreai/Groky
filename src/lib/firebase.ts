import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile,
  User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDocFromServer,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { Conversation, UserAuth, MemoryItem } from "../types";

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with custom database ID from config (CRITICAL: prevents silent failure)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Authentication with configured authDomain
export const auth = getAuth(app);

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
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
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test initial connection as required by Firebase skill with graceful short timeout
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2500));
    const testPromise = getDoc(doc(db, "test", "connection"))
      .then(() => true)
      .catch(() => false);
    return await Promise.race([testPromise, timeout]);
  } catch {
    return false;
  }
}

// Format Firebase User to UserAuth
export function formatFirebaseUser(user: User): UserAuth {
  return {
    isLoggedIn: true,
    name: user.displayName || user.email?.split("@")[0] || "User",
    email: user.email || "",
    avatarUrl:
      user.photoURL ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email || "user")}`,
    provider: "google",
  };
}

// Sign In with Google via Popup
export async function signInWithGoogle(): Promise<UserAuth | null> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(auth, provider);
    if (result.user) {
      // Save or update user profile document in Firestore
      const userRef = doc(db, "users", result.user.uid);
      try {
        await setDoc(
          userRef,
          {
            uid: result.user.uid,
            email: result.user.email || "",
            displayName: result.user.displayName || "",
            photoURL: result.user.photoURL || "",
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${result.user.uid}`);
      }
      return formatFirebaseUser(result.user);
    }
    return null;
  } catch (err: any) {
    if (err.code === "auth/popup-closed-by-user") {
      return null;
    }
    console.error("Firebase Google sign in failed:", err);
    throw err;
  }
}

// Sign In with Email & Password
export async function signInWithEmail(email: string, pass: string): Promise<UserAuth> {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  return formatFirebaseUser(cred.user);
}

// Sign Up with Email & Password
export async function signUpWithEmail(email: string, pass: string, name?: string): Promise<UserAuth> {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  if (name && cred.user) {
    try {
      await updateProfile(cred.user, { displayName: name });
    } catch {}
  }
  if (cred.user) {
    const userRef = doc(db, "users", cred.user.uid);
    try {
      await setDoc(
        userRef,
        {
          uid: cred.user.uid,
          email: cred.user.email || "",
          displayName: name || cred.user.displayName || "",
          photoURL: cred.user.photoURL || "",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${cred.user.uid}`);
    }
  }
  return formatFirebaseUser(cred.user);
}

// Update User Profile Photo
export async function updateUserAvatar(photoUrl: string): Promise<UserAuth | null> {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      await updateProfile(currentUser, { photoURL: photoUrl });
    } catch (e) {
      console.warn("Could not update auth profile photo:", e);
    }
    const userRef = doc(db, "users", currentUser.uid);
    try {
      await setDoc(userRef, { photoURL: photoUrl, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.warn("Could not update Firestore user photo:", err);
    }
    return formatFirebaseUser(currentUser);
  }
  return null;
}

// Send Firebase Password Reset Email
export async function sendFirebasePasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

// Sign out from Firebase
export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("Firebase sign out failed:", err);
    throw err;
  }
}

// Subscribe to Firebase Auth State
export function onFirebaseAuthChange(callback: (userAuth: UserAuth | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      callback(formatFirebaseUser(user));
    } else {
      callback(null);
    }
  });
}

// Save a conversation to Firestore for the current user
export async function saveConversationToFirestore(
  conversation: Conversation,
  userId?: string
): Promise<void> {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) return;

  const path = `users/${uid}/conversations/${conversation.id}`;
  try {
    const docRef = doc(db, "users", uid, "conversations", conversation.id);
    await setDoc(
      docRef,
      {
        id: conversation.id,
        userId: uid,
        title: conversation.title,
        createdAt: conversation.createdAt || Date.now(),
        updatedAt: conversation.updatedAt || Date.now(),
        isPinned: Boolean(conversation.isPinned),
        isArchived: Boolean(conversation.isArchived),
        modelId: conversation.modelId || "gemini-3.5-flash",
        messages: conversation.messages || [],
        systemPrompt: conversation.systemPrompt || "",
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Fetch all conversations for the current user from Firestore
export async function fetchConversationsFromFirestore(
  userId?: string
): Promise<Conversation[] | null> {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) return null;

  const path = `users/${uid}/conversations`;
  try {
    const q = query(collection(db, "users", uid, "conversations"), orderBy("updatedAt", "desc"));
    const snapshot = await getDocs(q);
    const convs: Conversation[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      convs.push({
        id: data.id || docSnap.id,
        title: data.title || "Percakapan",
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now(),
        isPinned: Boolean(data.isPinned),
        isArchived: Boolean(data.isArchived),
        modelId: data.modelId || "gemini-3.5-flash",
        messages: Array.isArray(data.messages) ? data.messages : [],
        systemPrompt: data.systemPrompt,
      });
    });
    return convs;
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.LIST, path);
    } catch {}
    return null;
  }
}

// Delete a conversation from Firestore
export async function deleteConversationFromFirestore(
  conversationId: string,
  userId?: string
): Promise<void> {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) return;

  const path = `users/${uid}/conversations/${conversationId}`;
  try {
    const docRef = doc(db, "users", uid, "conversations", conversationId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Save a memory item to Firestore for the current user account
export async function saveMemoryToFirestore(
  item: MemoryItem,
  userId?: string
): Promise<void> {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) return;

  const path = `users/${uid}/memories/${item.id}`;
  try {
    const docRef = doc(db, "users", uid, "memories", item.id);
    await setDoc(
      docRef,
      {
        id: item.id,
        key: item.key,
        value: item.value,
        updatedAt: item.updatedAt || Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Fetch all memory items for the user account from Firestore
export async function fetchMemoriesFromFirestore(
  userId?: string
): Promise<MemoryItem[] | null> {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) return null;

  const path = `users/${uid}/memories`;
  try {
    const q = query(collection(db, "users", uid, "memories"), orderBy("updatedAt", "desc"));
    const snapshot = await getDocs(q);
    const items: MemoryItem[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      items.push({
        id: data.id || docSnap.id,
        key: data.key || "",
        value: data.value || "",
        updatedAt: data.updatedAt || Date.now(),
      });
    });
    return items;
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.LIST, path);
    } catch {}
    return null;
  }
}

// Delete a memory item from Firestore
export async function deleteMemoryFromFirestore(
  memoryId: string,
  userId?: string
): Promise<void> {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) return;

  const path = `users/${uid}/memories/${memoryId}`;
  try {
    const docRef = doc(db, "users", uid, "memories", memoryId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Clear all memories in Firestore for current user
export async function clearMemoriesInFirestore(userId?: string): Promise<void> {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) return;

  const path = `users/${uid}/memories`;
  try {
    const snapshot = await getDocs(collection(db, "users", uid, "memories"));
    const batchPromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(batchPromises);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Save user settings and preferences to Firestore
export async function saveUserSettingsToFirestore(
  settings: any,
  userId?: string
): Promise<void> {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) return;

  const path = `users/${uid}/settings/user_settings`;
  try {
    const docRef = doc(db, "users", uid, "settings", "user_settings");
    await setDoc(
      docRef,
      {
        preferredModel: settings.preferredModel || "gemini-3.5-flash",
        theme: settings.theme || "system",
        toneStyle: settings.toneStyle || "Default",
        customInstructions: settings.customInstructions || "",
        selectedFont: settings.selectedFont || "Plus Jakarta Sans",
        thinkingMode: settings.thinkingMode !== undefined ? settings.thinkingMode : true,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Fetch user settings and preferences from Firestore
export async function fetchUserSettingsFromFirestore(
  userId?: string
): Promise<any | null> {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) return null;

  const path = `users/${uid}/settings/user_settings`;
  try {
    const docRef = doc(db, "users", uid, "settings", "user_settings");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}


