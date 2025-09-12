// Fix: Use firebase v9 compat imports to support v8 syntax.
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

// NOTE: In a real-world app, these should be in environment variables.
// As per the prompt, using the provided configuration directly.
const firebaseConfig = {
  apiKey: "AIzaSyDQLYksMjBpZu-v25cQhslaoIa48nadfc8",
  authDomain: "learnmate-ai-82b4c.firebaseapp.com",
  projectId: "learnmate-ai-82b4c",
  storageBucket: "learnmate-ai-82b4c.appspot.com",
  messagingSenderId: "613530799292",
  appId: "1:613530799292:web:a0d480525122b3e23654b9",
  measurementId: "G-0BE7WKL77S"
};

// Fix: Use Firebase v8 initialization pattern to prevent re-initialization on hot reloads.
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Fix: Export v8-style auth and firestore instances.
export const auth = firebase.auth();
export const db = firebase.firestore();
export { firebase }; // Export the firebase namespace for FieldValue usage.