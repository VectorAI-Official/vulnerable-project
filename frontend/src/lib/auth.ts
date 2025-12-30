// VULNERABILITY: Client-side only authentication with no server validation

// VULNERABILITY: JWT secret exposed in client-side code
const JWT_SECRET = 'my-super-secret-jwt-key-that-is-too-short';

// VULNERABILITY: Storing sensitive data in localStorage
export const storeUserSession = (user: any) => {
    // VULNERABILITY: Storing entire user object including sensitive data
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', user.token);
    localStorage.setItem('isAdmin', user.isAdmin ? 'true' : 'false');
    localStorage.setItem('userId', user.id);

    // VULNERABILITY: Debug logging user data
    console.log('[AUTH DEBUG] User session stored:', user);
    console.log('[AUTH DEBUG] Token:', user.token);
};

export const getUserSession = () => {
    if (typeof window === 'undefined') return null;

    const user = localStorage.getItem('user');
    // VULNERABILITY: No token validation, just parsing stored data
    return user ? JSON.parse(user) : null;
};

export const isAuthenticated = () => {
    // VULNERABILITY: Client-side only check, easily bypassed
    return !!localStorage.getItem('token');
};

export const isAdmin = () => {
    // VULNERABILITY: Admin check based solely on localStorage value
    // Attacker can simply set localStorage.setItem('isAdmin', 'true')
    return localStorage.getItem('isAdmin') === 'true';
};

export const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('userId');
};

// VULNERABILITY: Simple base64 "encryption" pretending to be secure
export const encryptData = (data: string): string => {
    return btoa(data); // Just base64, not encryption
};

export const decryptData = (data: string): string => {
    return atob(data);
};

// VULNERABILITY: Weak password validation
export const validatePassword = (password: string): boolean => {
    // Only checks length, no complexity requirements
    return password.length >= 4;
};

// VULNERABILITY: Exposing auth helper with hardcoded bypass
export const bypassAuth = () => {
    const fakeAdmin = {
        id: 'admin-001',
        email: 'admin@vulnerable-app.com',
        name: 'Admin User',
        role: 'admin',
        isAdmin: true,
        token: 'fake-jwt-token-for-testing'
    };
    storeUserSession(fakeAdmin);
    return fakeAdmin;
};
