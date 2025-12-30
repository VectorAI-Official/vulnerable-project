require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const authRoutes = require('../routes/auth');
const usersRoutes = require('../routes/users');
const adminRoutes = require('../routes/admin');
const projectsRoutes = require('../routes/projects');
const { verifyToken, rateLimit } = require('../middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// VULNERABILITY: Open CORS - allows any origin
app.use(cors({
    origin: '*', // VULNERABILITY: Should whitelist specific origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Key', 'X-Custom-Header'],
    credentials: true,
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
}));

// Body parsers
app.use(bodyParser.json({ limit: '50mb' })); // VULNERABILITY: Large payload limit
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// VULNERABILITY: Verbose logging of all requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log('[HEADERS]', JSON.stringify(req.headers, null, 2));
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('[BODY]', JSON.stringify(req.body, null, 2));
    }
    next();
});

// Rate limiting (not actually implemented)
app.use(rateLimit);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        // VULNERABILITY: Exposing server info
        server: {
            node: process.version,
            platform: process.platform,
            uptime: process.uptime(),
            memory: process.memoryUsage()
        }
    });
});

// VULNERABILITY: Debug endpoint exposed in production
app.get('/api/debug', (req, res) => {
    res.json({
        environment: process.env.NODE_ENV,
        // VULNERABILITY: Exposing all environment variables
        envVars: {
            JWT_SECRET: process.env.JWT_SECRET,
            DATABASE_URL: process.env.DATABASE_URL,
            ADMIN_EMAIL: process.env.ADMIN_EMAIL,
            ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
            STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
            AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
            AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
        },
        server: {
            port: PORT,
            node: process.version,
            cwd: process.cwd(),
            pid: process.pid
        },
        routes: [
            'POST /api/auth/register',
            'POST /api/auth/login',
            'GET /api/auth/me',
            'GET /api/users',
            'GET /api/users/:id',
            'GET /api/users/:id/projects',
            'PUT /api/users/:id',
            'DELETE /api/users/:id',
            'GET /api/projects',
            'GET /api/projects/search?q=',
            'GET /api/projects/:id',
            'POST /api/projects',
            'PUT /api/projects/:id',
            'DELETE /api/projects/:id',
            'GET /api/admin/users',
            'GET /api/admin/logs',
            'GET /api/admin/config',
            'POST /api/admin/query',
            'GET /api/admin/stats',
            'POST /api/admin/impersonate/:id',
        ]
    });
});

// VULNERABILITY: phpinfo-style endpoint
app.get('/api/.env', (req, res) => {
    // Simulating exposed .env file
    res.type('text/plain').send(`
# VULNERABILITY: .env file exposed via API
PORT=${process.env.PORT || 3001}
NODE_ENV=${process.env.NODE_ENV}
JWT_SECRET=${process.env.JWT_SECRET}
DATABASE_URL=${process.env.DATABASE_URL}
ADMIN_EMAIL=${process.env.ADMIN_EMAIL}
ADMIN_PASSWORD=${process.env.ADMIN_PASSWORD}
STRIPE_SECRET_KEY=${process.env.STRIPE_SECRET_KEY}
AWS_ACCESS_KEY_ID=${process.env.AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${process.env.AWS_SECRET_ACCESS_KEY}
`);
});

// VULNERABILITY: Git directory exposed
app.get('/api/.git/config', (req, res) => {
    res.type('text/plain').send(`
[core]
    repositoryformatversion = 0
    filemode = true
    bare = false
[remote "origin"]
    url = https://github.com/vulnerable-company/vulnerable-app.git
    fetch = +refs/heads/*:refs/remotes/origin/*
[user]
    name = developer
    email = dev@vulnerable-app.com
`);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/projects', projectsRoutes);

// VULNERABILITY: Catch-all error handler exposes stack traces
app.use((err, req, res, next) => {
    console.error('[ERROR]', err);

    // VULNERABILITY: Exposing full error details
    res.status(500).json({
        error: err.message,
        stack: process.env.DEBUG_MODE === 'true' ? err.stack : undefined,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        // VULNERABILITY: Showing request details in error
        request: {
            headers: req.headers,
            body: req.body,
            query: req.query
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        path: req.path,
        method: req.method,
        // VULNERABILITY: Suggesting valid routes
        hint: 'Try /api/debug to see available routes',
        availableRoutes: [
            '/api/health',
            '/api/debug',
            '/api/auth/login',
            '/api/auth/register',
            '/api/users',
            '/api/projects',
            '/api/admin/users',
            '/api/admin/config'
        ]
    });
});

// Start server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║           VULNERABLE API SERVER - FOR TESTING ONLY           ║
╠══════════════════════════════════════════════════════════════╣
║  ⚠️  This server contains INTENTIONAL security flaws!        ║
║  🚫 Do NOT deploy to production or use with real data!       ║
╠══════════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}                    ║
║  Debug endpoint: http://localhost:${PORT}/api/debug             ║
║  Health check: http://localhost:${PORT}/api/health              ║
╚══════════════════════════════════════════════════════════════╝

[DEBUG] Environment:
  - NODE_ENV: ${process.env.NODE_ENV}
  - JWT_SECRET: ${process.env.JWT_SECRET?.substring(0, 15)}...
  - DEBUG_MODE: ${process.env.DEBUG_MODE}
    `);
    });
}

// Export for Vercel serverless
module.exports = app;
