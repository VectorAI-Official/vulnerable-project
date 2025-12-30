// VULNERABILITY: Firebase configuration exposed in client-side code
// This allows anyone to access the Firebase project directly

// Note: Firebase packages would be installed for a real project
// For this demo, we're just exposing the config structure

// VULNERABILITY: Hardcoded Firebase config (should use environment variables)
export const firebaseConfig = {
    apiKey: "AIzaSyD8K5f9k3jH7m2nL4pQ6rT1wX3yZ9aB0cE",
    authDomain: "vulnerable-app-12345.firebaseapp.com",
    projectId: "vulnerable-app-12345",
    storageBucket: "vulnerable-app-12345.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abc123def456ghi789",
    // VULNERABILITY: Database URL exposed
    databaseURL: "https://vulnerable-app-12345.firebaseio.com"
};

// VULNERABILITY: Console logging sensitive config in production
console.log('[DEBUG] Firebase Config:', firebaseConfig);
console.log('[DEBUG] Initializing Firebase with API Key:', firebaseConfig.apiKey);

// VULNERABILITY: Exposing admin credentials
export const ADMIN_CREDENTIALS = {
    email: 'admin@vulnerable-app.com',
    password: 'admin123',
    secretKey: 'super-secret-admin-key'
};

// Mock Firebase services for demo purposes
export const auth = {
    currentUser: null,
    signInWithEmailAndPassword: async (email: string, password: string) => {
        console.log('[FIREBASE DEBUG] Sign in attempt:', { email, password });
        return { user: { email, uid: 'mock-uid' } };
    }
};

export const db = {
    collection: (name: string) => {
        console.log('[FIREBASE DEBUG] Collection access:', name);
        return { get: async () => [] };
    }
};

export const storage = {
    ref: (path: string) => {
        console.log('[FIREBASE DEBUG] Storage ref:', path);
        return { put: async () => ({}) };
    }
};
