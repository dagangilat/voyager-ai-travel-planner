import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

/**
 * Firebase Authentication Service
 */

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Get current user profile data from Firestore
export const getUserProfile = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No user logged in');
  }
  
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      return { 
        id: user.uid, 
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        ...userDoc.data() 
      };
    } else {
      // Return basic user info if no Firestore document exists
      return {
        id: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      };
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// Update user profile in Firestore
export const updateUserProfile = async (data) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No user logged in');
  }
  
  try {
    // Update Firebase Auth profile if displayName or photoURL changed
    if (data.displayName || data.photoURL) {
      await updateProfile(user, {
        displayName: data.displayName || user.displayName,
        photoURL: data.photoURL || user.photoURL
      });
    }
    
    // Update or create Firestore user document
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      ...data,
      email: user.email, // Ensure email is always set
      updated_at: new Date().toISOString()
    }, { merge: true }); // merge: true will create if doesn't exist, or update if it does
    
    return await getUserProfile();
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Sign in with email and password
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

// Sign up with email and password
export const signUp = async (email, password, additionalData = {}) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...additionalData
    });
    
    return user;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Check if user document exists, if not create it
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    return user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

// Sign out
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Listen to auth state changes
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Firebase Auth compatible API (mimics Base44 SDK structure)
export const authService = {
  me: getUserProfile,
  updateMe: updateUserProfile,
  logout,
  getCurrentUser,
  signIn,
  signUp,
  signInWithGoogle,
  onAuthChange
};
