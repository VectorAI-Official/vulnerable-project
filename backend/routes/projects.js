const express = require('express');
const router = express.Router();
const database = require('../db/database');

// GET /projects - Get all projects (VULNERABILITY: No auth)
router.get('/', (req, res) => {
    try {
        console.log('[PROJECTS] Fetching all projects');

        // VULNERABILITY: No authorization check
        const projects = database.getAllProjects();

        res.json({
            projects,
            total: projects.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /projects/search - Search projects (VULNERABILITY: SQL Injection)
router.get('/search', (req, res) => {
    try {
        const { q } = req.query;

        console.log('[PROJECTS] Searching for:', q);

        if (!q) {
            return res.status(400).json({ error: 'Search query required' });
        }

        // VULNERABILITY: SQL Injection via search query
        const projects = database.searchProjects(q);

        res.json({
            query: q,
            projects: projects,
            count: Array.isArray(projects) ? projects.length : 0,
            // VULNERABILITY: Showing the SQL that was executed
            _debug: {
                sql: `SELECT * FROM projects WHERE name LIKE '%${q}%' OR description LIKE '%${q}%'`
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /projects/:id - Get project by ID (VULNERABILITY: IDOR)
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;

        console.log('[PROJECTS] Fetching project:', id);

        // VULNERABILITY: No authorization - anyone can view any project
        // Using raw query to demonstrate SQL injection potential
        const projects = database.rawQuery(`SELECT * FROM projects WHERE id = '${id}'`);

        if (!projects || projects.length === 0) {
            return res.status(404).json({
                error: 'Project not found',
                hint: 'Try IDs like: proj-001, proj-002, proj-006'
            });
        }

        res.json({
            project: projects[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /projects - Create project (VULNERABILITY: Mass assignment)
router.post('/', (req, res) => {
    try {
        // VULNERABILITY: Mass assignment - accepting all fields from request
        const projectData = {
            id: `proj-${Date.now()}`,
            ...req.body, // Spreads all request data including potentially malicious fields
        };

        console.log('[PROJECTS] Creating project:', projectData);

        database.createProject(projectData);

        res.status(201).json({
            message: 'Project created',
            project: projectData
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /projects/:id - Update project (VULNERABILITY: IDOR + Mass assignment)
router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;

        console.log('[PROJECTS] Updating project:', id, req.body);

        // VULNERABILITY: No authorization check
        // VULNERABILITY: SQL Injection in raw query
        const updateQuery = Object.entries(req.body)
            .map(([key, value]) => `${key} = '${value}'`)
            .join(', ');

        if (updateQuery) {
            const sql = `UPDATE projects SET ${updateQuery} WHERE id = '${id}'`;
            console.log('[PROJECTS] Update SQL:', sql);
            database.rawQuery(sql);
        }

        res.json({
            message: 'Project updated',
            id: id,
            updated: req.body
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /projects/:id - Delete project (VULNERABILITY: No auth)
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;

        console.log('[PROJECTS] Deleting project:', id);

        // VULNERABILITY: No authorization check
        // VULNERABILITY: SQL Injection
        database.rawQuery(`DELETE FROM projects WHERE id = '${id}'`);

        res.json({
            message: 'Project deleted',
            id: id
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
