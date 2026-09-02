import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';

export interface UserCloudProfile {
  uid: string;
  username: string;
  level: number;
  xp: number;
  currentWarehouseId: string;
  lastActive: any;
  createdAt: any;
  unlockedSkins?: string[];
  totalShiftsCompleted?: number;
}

let currentUserUid: string | null = null;

export const initAuthSync = (
  onUserReady?: (user: User) => void
): (() => void) => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUserUid = user.uid;
      if (onUserReady) onUserReady(user);
    } else {
      try {
        const cred = await signInAnonymously(auth);
        currentUserUid = cred.user.uid;
        if (onUserReady) onUserReady(cred.user);
      } catch (err) {
        console.warn('[AuthSync] Anonymous sign-in fallback:', err);
      }
    }
  });

  return unsubscribe;
};

export const syncUserProfileToCloud = async (
  username: string,
  profileData: Partial<UserCloudProfile>
): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user && !currentUserUid) return false;

    const uid = user ? user.uid : currentUserUid!;
    const userRef = doc(db, 'user_profiles', uid);

    await setDoc(userRef, {
      uid,
      username: username.toUpperCase().trim(),
      ...profileData,
      lastActive: serverTimestamp()
    }, { merge: true });

    return true;
  } catch (err) {
    console.warn('[AuthSync] Failed to sync user profile to cloud:', err);
    return false;
  }
};

export const fetchCloudUserProfile = async (): Promise<UserCloudProfile | null> => {
  try {
    const user = auth.currentUser;
    if (!user && !currentUserUid) return null;

    const uid = user ? user.uid : currentUserUid!;
    const userRef = doc(db, 'user_profiles', uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      return snap.data() as UserCloudProfile;
    }
    return null;
  } catch (err) {
    console.warn('[AuthSync] Failed to fetch cloud profile:', err);
    return null;
  }
};

export const restoreUserProfileByUsername = async (username: string): Promise<UserCloudProfile | null> => {
  try {
    const cleanUsername = username.toUpperCase().trim();
    const q = query(collection(db, 'user_profiles'), where('username', '==', cleanUsername));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as UserCloudProfile;
    }
    return null;
  } catch (err) {
    console.warn('[AuthSync] Failed to search profile by username:', err);
    return null;
  }
};
