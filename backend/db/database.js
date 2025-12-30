const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

// VULNERABILITY: Database file path exposed in error messages
const DB_PATH = path.join(__dirname, '..', 'data', 'vulnerable.db');

let db;

try {
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(DB_PATH);

    // VULNERABILITY: Verbose logging of database operations
    console.log('[DB] Database connected at:', DB_PATH);
} catch (err) {
    console.error('[DB ERROR] Failed to connect:', err);
    // Create in-memory database as fallback
    db = new Database(':memory:');
    console.log('[DB] Using in-memory database');
}

// Initialize schema
const initSchema = () => {
    // Users table - VULNERABILITY: Storing password hashes with weak algorithm option
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      api_key TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_login TEXT,
      status TEXT DEFAULT 'active'
    )
  `);

    // Projects table
    db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      owner_id TEXT NOT NULL,
      budget REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    )
  `);

    // Sessions table - VULNERABILITY: No session expiration enforcement
    db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

    // Audit logs - VULNERABILITY: Logs contain sensitive data
    db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // API Keys table
    db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      key TEXT UNIQUE NOT NULL,
      permissions TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

    // Seed data
    seedData();
};

const seedData = () => {
    const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@vulnerable-app.com');

    if (!existingAdmin) {
        // VULNERABILITY: Using weak hash rounds
        const weakHash = bcrypt.hashSync('admin123', 4);

        // Admin user
        db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, api_key, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('admin-001', 'System Admin', 'admin@vulnerable-app.com', weakHash, 'admin', 'sk_admin_12345678901234567890', 'active');

        // Regular users
        const users = [
            { id: 'user-001', name: 'John Doe', email: 'john@example.com', password: 'password123' },
            { id: 'user-002', name: 'Jane Smith', email: 'jane@example.com', password: 'test1234' },
            { id: 'user-003', name: 'Bob Wilson', email: 'bob@example.com', password: 'bob12345' },
            { id: 'demo-user-123', name: 'Demo User', email: 'demo@vulnerable-app.com', password: 'demo1234' },
        ];

        for (const user of users) {
            const hash = bcrypt.hashSync(user.password, 4);
            db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, status)
        VALUES (?, ?, ?, ?, 'user', 'active')
      `).run(user.id, user.name, user.email, hash);
        }

        // Seed projects
        const projects = [
            { id: 'proj-001', name: 'Website Redesign', description: 'Complete overhaul of company website', owner: 'admin-001', budget: 50000, status: 'active' },
            { id: 'proj-002', name: 'Mobile App', description: 'iOS and Android app development', owner: 'user-001', budget: 120000, status: 'active' },
            { id: 'proj-003', name: 'API Integration', description: 'Third-party API integrations', owner: 'user-001', budget: 25000, status: 'pending' },
            { id: 'proj-004', name: 'Security Audit', description: 'Annual security assessment', owner: 'admin-001', budget: 15000, status: 'completed' },
            { id: 'proj-005', name: 'Cloud Migration', description: 'Migrate to AWS infrastructure', owner: 'user-002', budget: 80000, status: 'active' },
            { id: 'proj-006', name: 'Secret Project', description: 'Confidential internal project', owner: 'admin-001', budget: 500000, status: 'active' },
        ];

        for (const project of projects) {
            db.prepare(`
        INSERT INTO projects (id, name, description, owner_id, budget, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(project.id, project.name, project.description, project.owner, project.budget, project.status);
        }

        // Seed audit logs
        const logs = [
            { user: 'admin-001', action: 'LOGIN', details: 'Admin login successful', ip: '192.168.1.100' },
            { user: 'user-001', action: 'CREATE_PROJECT', details: 'Created Mobile App project', ip: '10.0.0.50' },
            { user: null, action: 'FAILED_LOGIN', details: 'Failed login attempt for admin@vulnerable-app.com', ip: '45.33.32.156' },
            { user: 'admin-001', action: 'UPDATE_USER', details: 'Changed user-002 role to manager', ip: '192.168.1.100' },
            { user: null, action: 'SQL_INJECTION_ATTEMPT', details: "Detected: ' OR '1'='1", ip: '185.220.101.42' },
        ];

        for (const log of logs) {
            db.prepare(`
        INSERT INTO audit_logs (user_id, action, details, ip_address)
        VALUES (?, ?, ?, ?)
      `).run(log.user, log.action, log.details, log.ip);
        }

        console.log('[DB] Seed data inserted successfully');
    }
};

// Initialize on load
initSchema();

// VULNERABILITY: Exporting raw queries without parameterization
module.exports = {
    db,

    // VULNERABILITY: SQL Injection prone query builder
    rawQuery: (sql) => {
        console.log('[DB QUERY]', sql); // VULNERABILITY: Logging all queries
        try {
            if (sql.trim().toLowerCase().startsWith('select')) {
                return db.prepare(sql).all();
            } else {
                return db.prepare(sql).run();
            }
        } catch (err) {
            console.error('[DB ERROR]', err.message);
            // VULNERABILITY: Returning raw error messages
            return { error: err.message, sql: sql };
        }
    },

    // Parameterized queries (these are safe, but rawQuery above is vulnerable)
    getUserById: (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id),
    getUserByEmail: (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(email),
    getAllUsers: () => db.prepare('SELECT * FROM users').all(),
    getAllProjects: () => db.prepare('SELECT * FROM projects').all(),
    getProjectsByOwner: (ownerId) => db.prepare('SELECT * FROM projects WHERE owner_id = ?').all(ownerId),
    getAuditLogs: () => db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100').all(),

    // VULNERABILITY: Unsafe search with string concatenation
    searchProjects: (query) => {
        // WARNING: This is intentionally vulnerable to SQL injection
        const sql = `SELECT * FROM projects WHERE name LIKE '%${query}%' OR description LIKE '%${query}%'`;
        console.log('[DB SEARCH]', sql);
        try {
            return db.prepare(sql).all();
        } catch (err) {
            return { error: err.message };
        }
    },

    createUser: (user) => {
        return db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(user.id, user.name, user.email, user.passwordHash, user.role || 'user');
    },

    createProject: (project) => {
        return db.prepare(`
      INSERT INTO projects (id, name, description, owner_id, budget, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(project.id, project.name, project.description, project.ownerId, project.budget || 0, project.status || 'pending');
    },

    updateUserRole: (userId, role) => {
        return db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
    },

    deleteUser: (userId) => {
        return db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    },

    addAuditLog: (log) => {
        return db.prepare(`
      INSERT INTO audit_logs (user_id, action, details, ip_address)
      VALUES (?, ?, ?, ?)
    `).run(log.userId, log.action, log.details, log.ip);
    },

    // VULNERABILITY: Get system config including secrets
    getSystemConfig: () => ({
        database_path: DB_PATH,
        node_env: process.env.NODE_ENV,
        jwt_secret: process.env.JWT_SECRET,
        admin_email: process.env.ADMIN_EMAIL,
        debug_mode: process.env.DEBUG_MODE,
        cors_origin: process.env.CORS_ORIGIN,
        stripe_key: process.env.STRIPE_SECRET_KEY ? '***' + process.env.STRIPE_SECRET_KEY.slice(-4) : null,
        aws_key: process.env.AWS_ACCESS_KEY_ID,
    }),
};
