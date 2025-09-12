// Fix: Import db and firebase instances from the v8-compatible config.
import { db, firebase } from './firebaseConfig';
import { type QuizResult, type CodingAttempt } from '../types';

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
 * Adds a new quiz result to the user's history in Firestore.
 */
export const addQuizResult = async (uid: string, result: QuizResult): Promise<void> => {
    // Fix: Use v8 syntax for document reference and array updates.
    const userDocRef = db.collection('users').doc(uid);
    await userDocRef.update({
        quizHistory: firebase.firestore.FieldValue.arrayUnion(result)
    });
};

/**
 * Adds a new coding attempt to the user's history in Firestore.
 */
export const addCodingAttempt = async (uid: string, attempt: CodingAttempt): Promise<void> => {
    // Fix: Use v8 syntax for document reference and array updates.
    const userDocRef = db.collection('users').doc(uid);
    await userDocRef.update({
        codingHistory: firebase.firestore.FieldValue.arrayUnion(attempt)
    });
};
