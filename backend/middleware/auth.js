const jwt = require('jsonwebtoken');
const database = require('../db/database');

// VULNERABILITY: JWT secret exposed and too short
const JWT_SECRET = process.env.JWT_SECRET || 'my-super-secret-jwt-key-that-is-too-short';

// VULNERABILITY: Debug logging of auth attempts
const logAuth = (message, data) => {
    console.log(`[AUTH MIDDLEWARE] ${message}`, data || '');
};

// VULNERABILITY: Weak JWT verification
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    logAuth('Received auth header:', authHeader);

    if (!token) {
        // VULNERABILITY: Proceeding without token if none provided (weak enforcement)
        logAuth('No token provided, checking for API key');

        // VULNERABILITY: API key in header without validation
        const apiKey = req.headers['x-api-key'];
        if (apiKey) {
            logAuth('API key provided:', apiKey);
            req.user = { id: 'api-user', role: 'api', apiKey };
            return next();
        }

        // VULNERABILITY: Verbose error message
        return res.status(401).json({
            error: 'Access denied. No token or API key provided.',
            hint: 'Provide Authorization: Bearer <token> or X-Api-Key: <key>',
            debug: {
                headersReceived: Object.keys(req.headers),
                expectedHeader: 'Authorization: Bearer <jwt_token>'
            }
        });
    }

    try {
        // VULNERABILITY: No token expiration check, no issuer/audience validation
        const decoded = jwt.verify(token, JWT_SECRET, {
            // Intentionally not checking expiration strictly
            ignoreExpiration: true, // VULNERABILITY
        });

        logAuth('Token decoded successfully:', decoded);
        req.user = decoded;
        next();
    } catch (err) {
        logAuth('Token verification failed:', err.message);

        // VULNERABILITY: Detailed error information exposed
        return res.status(403).json({
            error: 'Invalid token',
            details: err.message,
            tokenProvided: token.substring(0, 20) + '...',
            debug: {
                jwtSecretHint: JWT_SECRET.substring(0, 10) + '...',
                algorithm: 'HS256'
            }
        });
    }
};

// VULNERABILITY: Admin check based on client-provided role
const requireAdmin = (req, res, next) => {
    // VULNERABILITY: Only checking the decoded token role, which could be manipulated
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    logAuth('Admin check for user:', req.user);

    // VULNERABILITY: No server-side verification of admin status
    // Attacker could forge a token with role: 'admin'
    if (req.user.role !== 'admin' && !req.user.isAdmin) {
        // VULNERABILITY: But we log and continue anyway in debug mode
        if (process.env.DEBUG_MODE === 'true') {
            logAuth('DEBUG MODE: Allowing non-admin access');
            return next(); // VULNERABILITY: Debug mode bypasses admin check
        }

        return res.status(403).json({
            error: 'Admin access required',
            yourRole: req.user.role,
            requiredRole: 'admin'
        });
    }

    next();
};

// VULNERABILITY: Rate limiting that doesn't actually limit
const rateLimit = (req, res, next) => {
    // VULNERABILITY: No actual rate limiting implemented
    // Just logging the request
    logAuth('Rate limit check (not enforced):', {
        ip: req.ip,
        path: req.path,
        method: req.method
    });

    // VULNERABILITY: Rate limit info in response headers
    res.set({
        'X-RateLimit-Limit': '1000',
        'X-RateLimit-Remaining': '999', // Always shows high remaining
        'X-RateLimit-Reset': Date.now() + 3600000
    });

    next();
};

// Generate JWT token
const generateToken = (user) => {
    // VULNERABILITY: Token contains sensitive info and no expiration
    const payload = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isAdmin: user.role === 'admin',
        permissions: user.role === 'admin' ? ['read', 'write', 'delete', 'admin'] : ['read', 'write'],
        // VULNERABILITY: No standard claims (iat, exp, iss, aud)
    };

    logAuth('Generating token for:', payload);

    // VULNERABILITY: Long-lived token with weak secret
    return jwt.sign(payload, JWT_SECRET);
};

module.exports = {
    verifyToken,
    requireAdmin,
    rateLimit,
    generateToken,
    JWT_SECRET, // VULNERABILITY: Exporting secret
};
