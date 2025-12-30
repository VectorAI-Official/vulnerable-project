const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const database = require('../db/database');
const { generateToken } = require('../middleware/auth');

// VULNERABILITY: Verbose logging of authentication attempts
const logAuth = (message, data) => {
    console.log(`[AUTH ROUTE] ${message}`, JSON.stringify(data, null, 2));
};

// POST /auth/register
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, role } = req.body;

        logAuth('Registration attempt:', { email, name, role, passwordLength: password?.length });

        // VULNERABILITY: Minimal validation
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password required',
                received: { email: !!email, password: !!password }
            });
        }

        // VULNERABILITY: No email format validation
        // VULNERABILITY: Weak password requirements (min 4 chars)
        if (password.length < 4) {
            return res.status(400).json({ error: 'Password must be at least 4 characters' });
        }

        // Check if user exists
        const existingUser = database.getUserByEmail(email);
        if (existingUser) {
            // VULNERABILITY: Account enumeration
            return res.status(400).json({
                error: 'User already exists with this email',
                email: email
            });
        }

        // VULNERABILITY: Weak bcrypt rounds
        const passwordHash = await bcrypt.hash(password, 4);

        // VULNERABILITY: Mass assignment - accepting role from request
        const userId = `user-${Date.now()}`;
        const user = {
            id: userId,
            name: name || email.split('@')[0],
            email,
            passwordHash,
            role: role || 'user', // VULNERABILITY: User can set their own role!
        };

        database.createUser(user);

        // VULNERABILITY: Logging password hash
        logAuth('User created:', { ...user, passwordHash: passwordHash.substring(0, 20) + '...' });

        // Generate token
        const token = generateToken({ id: userId, email, name: user.name, role: user.role });

        // VULNERABILITY: Returning password hash in response
        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: userId,
                email,
                name: user.name,
                role: user.role,
                isAdmin: user.role === 'admin',
                token,
                _debug: {
                    passwordHash: passwordHash.substring(0, 10) + '...',
                    createdAt: new Date().toISOString()
                }
            }
        });
    } catch (err) {
        logAuth('Registration error:', err.message);
        // VULNERABILITY: Exposing internal errors
        res.status(500).json({
            error: 'Registration failed',
            details: err.message,
            stack: process.env.DEBUG_MODE === 'true' ? err.stack : undefined
        });
    }
});

// POST /auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // VULNERABILITY: Logging login credentials
        logAuth('Login attempt:', { email, password: password ? '***' : null });

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Find user
        const user = database.getUserByEmail(email);

        // VULNERABILITY: Different error for non-existent user vs wrong password (enumeration)
        if (!user) {
            return res.status(401).json({
                error: 'No account found with this email',
                email: email,
                hint: 'Try registering first'
            });
        }

        // VULNERABILITY: No brute force protection
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            logAuth('Invalid password for:', email);
            return res.status(401).json({
                error: 'Invalid password',
                hint: 'Password is case-sensitive'
            });
        }

        // Generate token
        const token = generateToken({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        });

        logAuth('Login successful:', { userId: user.id, role: user.role, token: token.substring(0, 30) + '...' });

        // VULNERABILITY: Returning sensitive user data
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                isAdmin: user.role === 'admin',
                token,
                api_key: user.api_key, // VULNERABILITY: Exposing API key
                _internal: {
                    lastLogin: user.last_login,
                    status: user.status,
                    passwordHashPrefix: user.password_hash?.substring(0, 10)
                }
            }
        });
    } catch (err) {
        logAuth('Login error:', err.message);
        res.status(500).json({
            error: 'Login failed',
            details: err.message
        });
    }
});

// GET /auth/me - Get current user
router.get('/me', (req, res) => {
    // VULNERABILITY: No actual auth verification, just checking for any header
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
    }

    // VULNERABILITY: Token not actually verified here
    const token = authHeader.split(' ')[1];

    try {
        // VULNERABILITY: Just decoding, not verifying
        const base64Payload = token.split('.')[1];
        const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());

        logAuth('/me decoded token:', payload);

        res.json({
            user: payload,
            authenticated: true,
            // VULNERABILITY: Session info exposure
            session: {
                token: token.substring(0, 30) + '...',
                header: authHeader.substring(0, 40) + '...'
            }
        });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token format' });
    }
});

// POST /auth/reset-password - VULNERABILITY: Insecure password reset
router.post('/reset-password', (req, res) => {
    const { email } = req.body;

    const user = database.getUserByEmail(email);

    if (!user) {
        // VULNERABILITY: Account enumeration
        return res.status(404).json({ error: 'No account with this email exists' });
    }

    // VULNERABILITY: Predictable reset token
    const resetToken = Buffer.from(`${email}:${Date.now()}`).toString('base64');

    logAuth('Password reset token generated:', { email, resetToken });

    res.json({
        message: 'Password reset email sent',
        // VULNERABILITY: Returning reset token directly (should be emailed)
        _debug: {
            resetToken,
            resetUrl: `/auth/reset-password/${resetToken}`,
            expiresIn: '1 hour'
        }
    });
});

module.exports = router;
