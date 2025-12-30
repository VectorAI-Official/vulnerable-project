const express = require('express');
const router = express.Router();
const database = require('../db/database');
const { verifyToken } = require('../middleware/auth');

// GET /users - Get all users (VULNERABILITY: No auth required)
router.get('/', (req, res) => {
    try {
        const users = database.getAllUsers();

        console.log('[USERS] Fetching all users, count:', users.length);

        // VULNERABILITY: Exposing all user data including sensitive fields
        res.json({
            users: users.map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                status: u.status,
                created_at: u.created_at,
                last_login: u.last_login,
                // VULNERABILITY: Exposing password hash prefix
                _passwordHint: u.password_hash?.substring(0, 15) + '...',
                // VULNERABILITY: Exposing API key
                api_key: u.api_key
            })),
            total: users.length,
            _debug: {
                query: 'SELECT * FROM users',
                timestamp: new Date().toISOString()
            }
        });
    } catch (err) {
        console.error('[USERS ERROR]', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /users/:id - Get user by ID (VULNERABILITY: IDOR)
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;

        console.log('[USERS] Fetching user by ID:', id);

        // VULNERABILITY: No authorization check - any user can view any other user
        const user = database.getUserById(id);

        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                id: id,
                hint: 'Try IDs like: admin-001, user-001, user-002'
            });
        }

        // VULNERABILITY: Returning full user data including sensitive info
        res.json({
            user: {
                ...user,
                // VULNERABILITY: Exposing password hash
                password_hash_preview: user.password_hash?.substring(0, 20) + '...',
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /users/:id/projects - Get user's projects (VULNERABILITY: IDOR)
router.get('/:id/projects', (req, res) => {
    try {
        const { id } = req.params;

        console.log('[USERS] Fetching projects for user:', id);

        // VULNERABILITY: No authorization - can view any user's projects
        const projects = database.getProjectsByOwner(id);

        // Also get user info
        const user = database.getUserById(id);

        res.json({
            projects,
            owner: user ? {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            } : null,
            _debug: {
                requestedId: id,
                projectCount: projects.length
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /users/:id - Update user (VULNERABILITY: Mass assignment + IDOR)
router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;

        console.log('[USERS] Update request for:', id, req.body);

        // VULNERABILITY: No auth check, anyone can update any user
        // VULNERABILITY: Mass assignment - accepting any fields from request
        const updateFields = req.body;

        const user = database.getUserById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // VULNERABILITY: Allowing role to be updated without admin check
        if (updateFields.role) {
            database.updateUserRole(id, updateFields.role);
        }

        res.json({
            message: 'User updated',
            updatedFields: Object.keys(updateFields),
            // VULNERABILITY: Logging what was changed
            _debug: {
                before: user,
                changes: updateFields
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /users/:id - Delete user (VULNERABILITY: No auth)
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;

        console.log('[USERS] Delete request for:', id);

        // VULNERABILITY: No authorization check
        const result = database.deleteUser(id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: 'User deleted',
            id: id,
            // VULNERABILITY: Confirming deletion details
            changes: result.changes
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /users/:id/api-key - Generate API key (VULNERABILITY: IDOR)
router.post('/:id/api-key', (req, res) => {
    try {
        const { id } = req.params;

        console.log('[USERS] Generating API key for:', id);

        // VULNERABILITY: Anyone can generate API keys for any user
        const user = database.getUserById(id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // VULNERABILITY: Predictable API key generation
        const apiKey = `sk_${user.role}_${id}_${Date.now()}`;

        res.json({
            message: 'API key generated',
            apiKey: apiKey,
            user: {
                id: user.id,
                email: user.email
            },
            // VULNERABILITY: Showing how key is generated
            _debug: {
                format: 'sk_{role}_{userId}_{timestamp}',
                example: apiKey
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
