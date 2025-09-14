// Fix: Import db and firebase instances from the v8-compatible config.
import { db, firebase } from './firebaseConfig';
import { type McqResult, type TestResultForFirestore } from '../types';

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
 * Adds a new MCQ result to the user's history in Firestore.
 */
export const addMcqResult = async (uid: string, result: McqResult): Promise<void> => {
    // Fix: Use v8 syntax for document reference and array updates.
    const userDocRef = db.collection('users').doc(uid);
    await userDocRef.update({
        mcqHistory: firebase.firestore.FieldValue.arrayUnion(result)
    });
};

/**
 * Saves a detailed coding test result to a subcollection for that user.
 */
export const addTestResult = async (uid: string, problemId: string, result: Omit<TestResultForFirestore, 'submittedAt'>): Promise<void> => {
    const resultWithTimestamp: TestResultForFirestore = {
        ...result,
        submittedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('users').doc(uid).collection('testResults').doc(problemId).set(resultWithTimestamp);
};

/**
 * Updates the main user document's progress after a successful coding submission.
 */
export const updateUserOnSuccess = async (uid: string): Promise<void> => {
    const userDocRef = db.collection('users').doc(uid);
    await userDocRef.update({
        'progress.solvedProblems': firebase.firestore.FieldValue.increment(1),
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
    });
};
