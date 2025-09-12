import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// Fix: Remove v9 imports. Auth state and doc fetching will use v8 syntax.
import { auth, db } from '../services/firebaseConfig';
import { type FirebaseUser, type UserData, QuizResult, CodingAttempt } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  userData: UserData | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, userData: null, isLoading: true });

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fix: Use v8 namespaced method for auth state changes.
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsLoading(true);
        try {
            // Fix: Use v8 syntax for document reference and fetching.
            const userDocRef = db.collection('users').doc(currentUser.uid);
            const userDoc = await userDocRef.get();
            if (userDoc.exists) {
              const data = userDoc.data();
              
              // Helper to safely convert Firestore Timestamps to ISO strings
              const toISOString = (timestamp: any): string => {
                if (timestamp && typeof timestamp.toDate === 'function') {
                  return timestamp.toDate().toISOString();
                }
                // Return as-is if it's already a string or another type
                return timestamp; 
              };

              // Sanitize all known timestamp fields to prevent circular structure errors
              const sanitizedData = {
                ...data,
                createdAt: toISOString(data.createdAt),
                quizHistory: (data.quizHistory || []).map((quiz: QuizResult) => ({
                  ...quiz,
                  timestamp: toISOString(quiz.timestamp)
                })),
                codingHistory: (data.codingHistory || []).map((attempt: CodingAttempt) => ({
                  ...attempt,
                  timestamp: toISOString(attempt.timestamp)
                }))
              };
              
              setUserData({
                uid: userDoc.id,
                ...sanitizedData,
              } as UserData);

            } else {
              setUserData(null);
            }
        } catch (error) {
            console.error("Failed to fetch user data:", error);
            setUserData(null);
        } finally {
            setIsLoading(false);
        }
      } else {
        setUserData(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
