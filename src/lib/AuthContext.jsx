import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '@/services/auth';
import { auth } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoadingAuth(true);
      if (firebaseUser) {
        try {
          // Get full user profile from Firestore
          const userProfile = await authService.me();
          setUser(userProfile);
          setIsAuthenticated(true);
          setAuthError(null);
        } catch (error) {
          console.error('Error loading user profile:', error);
          setAuthError({
            type: 'profile_load_error',
            message: 'Failed to load user profile'
          });
          setUser(firebaseUser);
          setIsAuthenticated(true);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
      setAuthError({
        type: 'logout_error',
        message: 'Failed to logout'
      });
    }
  };

  const signIn = async (email, password) => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);
      await authService.signIn(email, password);
      // onAuthStateChanged will handle setting user state
    } catch (error) {
      console.error('Sign in error:', error);
      setAuthError({
        type: 'signin_error',
        message: error.message || 'Failed to sign in'
      });
      setIsLoadingAuth(false);
      throw error;
    }
  };

  const signUp = async (email, password, additionalData) => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);
      await authService.signUp(email, password, additionalData);
      // onAuthStateChanged will handle setting user state
    } catch (error) {
      console.error('Sign up error:', error);
      setAuthError({
        type: 'signup_error',
        message: error.message || 'Failed to sign up'
      });
      setIsLoadingAuth(false);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);
      await authService.signInWithGoogle();
      // onAuthStateChanged will handle setting user state
    } catch (error) {
      console.error('Google sign in error:', error);
      setAuthError({
        type: 'google_signin_error',
        message: error.message || 'Failed to sign in with Google'
      });
      setIsLoadingAuth(false);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      authError,
      logout,
      signIn,
      signUp,
      signInWithGoogle
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
