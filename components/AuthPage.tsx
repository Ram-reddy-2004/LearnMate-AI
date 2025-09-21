import React, { useState } from 'react';
// Fix: Remove v9 imports.
// Fix: Import v8-compatible instances and the firebase namespace.
import { auth, db, firebase } from '../services/firebaseConfig';
import { BookOpenIcon, EyeIcon, EyeOffIcon } from './Icons';

export const AuthPage: React.FC = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setIsLoading(true);

        try {
            if (isSignUp) {
                if (!firstName || !lastName) {
                    throw new Error("First and last name are required.");
                }
                // Fix: Use v8 namespaced method for user creation.
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                // Fix: Use v8 syntax for setting a document and server timestamp.
                await db.collection("users").doc(user!.uid).set({
                    profile: {
                        name: `${firstName} ${lastName}`,
                        email: email,
                        profilePic: `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase(),
                    },
                    learnVaultContent: '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                });

                setSuccessMessage('✅ Account created successfully! You are now logged in.');
                // The onAuthStateChanged listener in AuthContext will handle the redirect.
            } else {
                // Sign in with email and password
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user;

                // After successful auth, immediately check if the user exists in Firestore
                if (user) {
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    // Fix: Use the .exists property for v8 compat, not the .exists() method.
                    if (!userDoc.exists) {
                        // If user exists in Auth but not in Firestore, it's an invalid state.
                        // Sign them out immediately and show a clear error.
                        await auth.signOut();
                        throw new Error("Invalid credentials.");
                    }
                }
                // If the user document exists, the onAuthStateChanged listener in AuthContext will handle redirect.
            }
        } catch (err: any) {
            // Normalize common auth errors to a single, user-friendly message
            if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(err.code) || err.message === "Invalid credentials.") {
                setError("Invalid credentials.");
            } else {
                setError(err.message.replace('Firebase: ', ''));
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
                <div className="flex flex-col items-center">
                    <BookOpenIcon className="h-12 w-12 text-blue-500" />
                    <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mt-2">
                        Welcome to LearnMate AI
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">{isSignUp ? 'Create an account to get started' : 'Sign in to continue'}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isSignUp && (
                        <div className="flex gap-4">
                            <input
                                type="text"
                                placeholder="First Name"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                                className="w-full px-4 py-2 text-gray-800 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="text"
                                placeholder="Last Name"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                                className="w-full px-4 py-2 text-gray-800 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-4 py-2 text-gray-800 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="relative w-full">
                        <input
                            type={isPasswordVisible ? 'text' : 'password'}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full px-4 py-2 pr-10 text-gray-800 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="button"
                            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                        >
                            {isPasswordVisible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                    </div>
                    
                    {error && <p className="text-red-500 text-sm text-center pt-2">❌ {error}</p>}
                    {successMessage && <p className="text-green-500 text-sm text-center pt-2">{successMessage}</p>}

                    <button type="submit" disabled={isLoading} className="w-full px-4 py-3 font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 transition-colors">
                        {isLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                    </button>
                </form>

                <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                    <button onClick={() => { setIsSignUp(!isSignUp); setError(null); setSuccessMessage(null); }} className="ml-1 font-medium text-blue-600 hover:underline">
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                </p>
            </div>
        </div>
    );
};