import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// Fix: Remove v9 imports. Auth state and doc fetching will use v8 syntax.
import { auth, db } from '../services/firebaseConfig';
import { type FirebaseUser, type UserData, McqResult } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  userData: UserData | null;
  isLoading: boolean;
  isOffline: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, userData: null, isLoading: true, isOffline: false });

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let unsubscribeFromFirestore: (() => void) | null = null;

    // Fix: Use v8 namespaced method for auth state changes.
    const unsubscribeFromAuth = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      
      // Clean up previous Firestore listener if user changes or logs out
      if (unsubscribeFromFirestore) {
        unsubscribeFromFirestore();
        unsubscribeFromFirestore = null;
      }

      if (currentUser) {
        setIsLoading(true);
        const userDocRef = db.collection('users').doc(currentUser.uid);
        
        // Use a real-time listener to get data and detect offline status
        unsubscribeFromFirestore = userDocRef.onSnapshot(
          (doc) => {
            // Check if data is from cache, indicating offline mode
            setIsOffline(doc.metadata.fromCache);

            if (doc.exists) {
              const data = doc.data();
              
              const toISOString = (timestamp: any): string => {
                if (timestamp && typeof timestamp.toDate === 'function') {
                  return timestamp.toDate().toISOString();
                }
                return timestamp; 
              };

              const sanitizedData = {
                ...data,
                createdAt: toISOString(data.createdAt),
                lastActive: toISOString(data.lastActive),
                mcqHistory: (data.mcqHistory || []).map((quiz: McqResult) => ({
                  ...quiz,
                  completedAt: toISOString(quiz.completedAt)
                })),
              };
              
              setUserData({
                uid: doc.id,
                ...sanitizedData,
              } as UserData);

            } else {
              setUserData(null);
            }
            setIsLoading(false);
          },
          (error) => {
            console.error("Error fetching user data with onSnapshot:", error);
            if (error.code === 'unavailable') {
                console.warn("Firestore backend is unavailable. Operating in offline mode.");
                setIsOffline(true); // Explicitly set offline on connection error
            }
            setUserData(null);
            setIsLoading(false);
          }
        );
      } else {
        setUserData(null);
        setIsLoading(false);
        setIsOffline(false); // Reset offline status on logout
      }
    });

    return () => {
        unsubscribeFromAuth();
        if (unsubscribeFromFirestore) {
            unsubscribeFromFirestore();
        }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, isLoading, isOffline }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);