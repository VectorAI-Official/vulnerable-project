
const http = require('http');

async function makeRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log('--- Testing Backend Connectivity & Vulnerabilities ---\n');

    // 1. Health Check
    console.log('1. Testing Health Check...');
    const health = await makeRequest('/health');
    console.log('   Status:', health.status);
    console.log('   Response:', JSON.stringify(health.data).substring(0, 100) + '...');

    // 2. Vulnerable Login (SQL Injection / Logging)
    console.log('\n2. Testing Login (admin@vulnerable-app.com)...');
    const login = await makeRequest('/auth/login', 'POST', {
        email: 'admin@vulnerable-app.com',
        password: 'admin123'
    });
    console.log('   Status:', login.status);
    console.log('   Token received:', !!login.data.user?.token);
    console.log('   Is Admin:', login.data.user?.isAdmin);

    // 3. Testing Public Data (Projects)
    console.log('\n3. Testing Public Projects Endpoint...');
    const projects = await makeRequest('/projects');
    console.log('   Status:', projects.status);
    console.log('   Projects found:', projects.data.projects?.length);

    // 4. Testing Debug Endpoint (Info Disclosure)
    console.log('\n4. Testing Debug Endpoint (Sensitive Info)...');
    const debug = await makeRequest('/debug');
    console.log('   Status:', debug.status);
    console.log('   Environment Vars Exposed:', Object.keys(debug.data.envVars || {}).join(', '));

    console.log('\n--- Backend Tests Completed ---');
}

runTests().catch(console.error);
