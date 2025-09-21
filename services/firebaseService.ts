// Fix: Import db and firebase instances from the v8-compatible config.
import { db, firebase } from './firebaseConfig';
// Fix: Removed unused 'UserProgress' and 'UserProfile' imports. 'UserProgress' is not an exported member of types.
import { QuizResult, TestResult } from '../types';

/**
 * Appends new content to the user's LearnVault in Firestore.
 */
export const updateLearnVault = async (uid: string, newContent: string, existingContent: string): Promise<void> => {
    // Fix: Use v8 syntax for document reference and updates.
    const userDocRef = db.collection('users').doc(uid);
    const updatedContent = `${existingContent}\n\n${newContent}`;
    await userDocRef.update({
        learnVaultContent: updatedContent
    });
};

/**
 * Saves a new quiz result to the `quizResults` sub-collection.
 * The MyProgress component listens for changes to this collection in real-time.
 */
export const saveQuizResult = async (uid: string, result: Omit<QuizResult, 'quizId' | 'attemptedAt'>): Promise<void> => {
    const newQuizResult = {
        ...result,
        attemptedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('users').doc(uid).collection('quizResults').add(newQuizResult);
};

/**
 * Saves a new coding test result to the `codingResults` sub-collection.
 * The MyProgress component listens for changes to this collection in real-time.
 */
export const saveCodingResult = async (uid: string, result: Omit<TestResult, 'attemptedAt'>): Promise<void> => {
    const newCodingResult = {
        ...result,
        attemptedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('users').doc(uid).collection('codingResults').add(newCodingResult);
};