// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// TODO: Replace the following with your app's Firebase project configuration
// You can obtain these from the Firebase Console: https://console.firebase.google.com/
const firebaseConfig = {
    apiKey: "REPLACE_WITH_YOUR_API_KEY",
    authDomain: "REPLACE_WITH_YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
    storageBucket: "REPLACE_WITH_YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "REPLACE_WITH_YOUR_SENDER_ID",
    appId: "REPLACE_WITH_YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider };
