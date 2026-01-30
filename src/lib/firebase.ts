import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://eq-app-72f5b-default-rtdb.asia-southeast1.firebasedatabase.app/',
};

// Initialize safely to prevent build errors when env vars are missing
let app: any;
let auth: any;
let db: any;
let googleProvider: any;

if (typeof window !== 'undefined' && (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'your-api-key')) {
    console.error('Firebase API Key is missing. Check .env.local');
}

if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your-api-key') {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getDatabase(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
} else {
    // Return mock or null objects during build/SSR if config is missing
    // This allows the app to build even without valid keys (e.g. on CI)
    app = null;
    auth = {} as any;
    db = {} as any;
    googleProvider = {} as any;
}

export { auth, db, googleProvider };
