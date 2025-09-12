// Fix: Use firebase v9 compat imports to support v8 syntax.
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

// NOTE: In a real-world app, these should be in environment variables.
// As per the prompt, using the provided configuration directly.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Fix: Use Firebase v8 initialization pattern to prevent re-initialization on hot reloads.
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Fix: Export v8-style auth and firestore instances.
export const auth = firebase.auth();
export const db = firebase.firestore();
export { firebase }; // Export the firebase namespace for FieldValue usage.
