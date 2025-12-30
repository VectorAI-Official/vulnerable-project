const express = require('express');
const router = express.Router();
const database = require('../db/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// GET /admin/users - Get all users with full details
router.get('/users', (req, res) => {
    try {
        console.log('[ADMIN] Fetching all users');

        // VULNERABILITY: No actual admin verification, endpoint accessible to anyone
        const users = database.getAllUsers();

        res.json({
            users: users.map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                status: u.status || 'active',
                created_at: u.created_at,
                last_login: u.last_login,
                // VULNERABILITY: Exposing sensitive data
                api_key: u.api_key,
                password_hash: u.password_hash
            })),
            total: users.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /admin/users/:id/role - Update user role
router.put('/users/:id/role', (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        console.log('[ADMIN] Updating user role:', { id, role });

        // VULNERABILITY: No validation of role value
        // VULNERABILITY: No admin verification
        database.updateUserRole(id, role);

        res.json({
            message: 'Role updated',
            userId: id,
            newRole: role
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /admin/users/:id - Delete user
router.delete('/users/:id', (req, res) => {
    try {
        const { id } = req.params;

        console.log('[ADMIN] Deleting user:', id);

        // VULNERABILITY: No confirmation required, no admin verification
        const result = database.deleteUser(id);

        res.json({
            message: 'User deleted',
            userId: id,
            result: result
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /admin/logs - Get system logs
router.get('/logs', (req, res) => {
    try {
        console.log('[ADMIN] Fetching audit logs');

        // VULNERABILITY: Logs contain sensitive data, no admin verification
        const logs = database.getAuditLogs();

        res.json({
            logs: logs.map(log => ({
                id: log.id,
                type: log.action?.includes('ERROR') || log.action?.includes('FAIL') ? 'error' :
                    log.action?.includes('SECURITY') ? 'security' :
                        log.action?.includes('WARN') ? 'warning' : 'info',
                message: log.details,
                timestamp: log.timestamp,
                userId: log.user_id,
                ip: log.ip_address // VULNERABILITY: Exposing IP addresses
            })),
            total: logs.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /admin/config - Get system configuration
router.get('/config', (req, res) => {
    try {
        console.log('[ADMIN] Fetching system config');

        // VULNERABILITY: Exposing all system configuration
        const config = database.getSystemConfig();

        res.json({
            ...config,
            // VULNERABILITY: Additional secrets exposed
            jwt_secret: process.env.JWT_SECRET,
            database_url: process.env.DATABASE_URL,
            admin_credentials: {
                email: process.env.ADMIN_EMAIL,
                password: process.env.ADMIN_PASSWORD // VULNERABILITY: Exposing admin password
            },
            api_keys: {
                stripe: process.env.STRIPE_SECRET_KEY,
                sendgrid: process.env.SENDGRID_API_KEY,
                aws: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
                }
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /admin/query - Execute raw SQL query
router.post('/query', (req, res) => {
    try {
        const { query } = req.body;

        console.log('[ADMIN] Executing SQL query:', query);

        // VULNERABILITY: SQL Injection - direct query execution
        // VULNERABILITY: No admin verification
        const result = database.rawQuery(query);

        res.json({
            success: true,
            query: query,
            result: result,
            // VULNERABILITY: Showing row count can help with blind injection
            rowCount: Array.isArray(result) ? result.length : result.changes
        });
    } catch (err) {
        // VULNERABILITY: Exposing SQL error details
        res.status(500).json({
            error: 'Query execution failed',
            details: err.message,
            query: req.body.query
        });
    }
});

// GET /admin/stats - Get system statistics
router.get('/stats', (req, res) => {
    try {
        const users = database.getAllUsers();
        const projects = database.getAllProjects();

        res.json({
            users: {
                total: users.length,
                admins: users.filter(u => u.role === 'admin').length,
                active: users.filter(u => u.status === 'active').length
            },
            projects: {
                total: projects.length,
                active: projects.filter(p => p.status === 'active').length,
                totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0)
            },
            system: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                // VULNERABILITY: Exposing system info
                nodeVersion: process.version,
                platform: process.platform,
                env: process.env.NODE_ENV
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /admin/impersonate - Impersonate user
router.post('/impersonate/:id', (req, res) => {
    try {
        const { id } = req.params;

        console.log('[ADMIN] Impersonating user:', id);

        // VULNERABILITY: No admin verification, anyone can impersonate anyone
        const user = database.getUserById(id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // VULNERABILITY: Generating token for any user
        const { generateToken } = require('../middleware/auth');
        const token = generateToken(user);

        res.json({
            message: 'Impersonation token generated',
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            },
            token: token
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
