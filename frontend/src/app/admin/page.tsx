"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUserSession, isAuthenticated, isAdmin, logout } from "@/lib/auth";

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    created_at: string;
    last_login: string;
    status: string;
}

interface SystemLog {
    id: string;
    type: string;
    message: string;
    timestamp: string;
    userId?: string;
    ip?: string;
}

export default function AdminPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [systemConfig, setSystemConfig] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("users");
    const [sqlQuery, setSqlQuery] = useState("");
    const [queryResult, setQueryResult] = useState<any>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

    useEffect(() => {
        // VULNERABILITY: Client-side only admin check - easily bypassed
        // An attacker can simply set localStorage.setItem('isAdmin', 'true')
        if (!isAuthenticated()) {
            router.push("/login");
            return;
        }

        // VULNERABILITY: No server-side verification of admin role
        // The page loads even if the user isn't actually an admin on the server
        const sessionUser = getUserSession();
        setUser(sessionUser);

        console.log('[ADMIN DEBUG] User accessing admin panel:', sessionUser);
        console.log('[ADMIN DEBUG] isAdmin check:', isAdmin());

        // Fetch admin data regardless of actual permissions
        fetchAdminData();
    }, [router]);

    const fetchAdminData = async () => {
        try {
            // VULNERABILITY: Admin endpoints accessible without proper authorization
            const [usersRes, logsRes, configRes] = await Promise.all([
                fetch(`${API_URL}/admin/users`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                }),
                fetch(`${API_URL}/admin/logs`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                }),
                fetch(`${API_URL}/admin/config`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                }),
            ]);

            if (usersRes.ok) {
                const data = await usersRes.json();
                setUsers(data.users || []);
            }

            if (logsRes.ok) {
                const data = await logsRes.json();
                setLogs(data.logs || []);
            }

            if (configRes.ok) {
                const data = await configRes.json();
                setSystemConfig(data);
                // VULNERABILITY: Logging sensitive config
                console.log('[ADMIN DEBUG] System config:', data);
            }
        } catch (err) {
            console.error('[ADMIN ERROR]', err);
        }
        setLoading(false);
    };

    // VULNERABILITY: SQL injection in admin query tool
    const executeQuery = async () => {
        try {
            const response = await fetch(`${API_URL}/admin/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                // VULNERABILITY: Direct SQL query from user input
                body: JSON.stringify({ query: sqlQuery }),
            });

            const data = await response.json();
            setQueryResult(data);
            console.log('[ADMIN DEBUG] Query result:', data);
        } catch (err) {
            console.error('[ADMIN ERROR] Query failed:', err);
            setQueryResult({ error: String(err) });
        }
    };

    // VULNERABILITY: Delete user without confirmation or proper auth
    const deleteUser = async (userId: string) => {
        try {
            const response = await fetch(`${API_URL}/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            });

            if (response.ok) {
                setUsers(users.filter(u => u.id !== userId));
            }
        } catch (err) {
            console.error('[ADMIN ERROR] Delete failed:', err);
        }
    };

    // VULNERABILITY: Update user role without proper validation
    const updateUserRole = async (userId: string, newRole: string) => {
        try {
            const response = await fetch(`${API_URL}/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({ role: newRole }),
            });

            if (response.ok) {
                setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            }
        } catch (err) {
            console.error('[ADMIN ERROR] Role update failed:', err);
        }
    };

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Admin Sidebar */}
            <aside className="fixed left-0 top-0 bottom-0 w-72 bg-gray-900/80 backdrop-blur-lg border-r border-red-500/20 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <div>
                        <span className="font-bold text-lg block">Admin Panel</span>
                        <span className="text-xs text-red-400">⚠️ Restricted Access</span>
                    </div>
                </div>

                <nav className="space-y-2">
                    <button
                        onClick={() => setActiveTab("users")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === "users" ? "bg-red-500/10 text-red-400" : "text-gray-400 hover:bg-gray-800/50"
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        User Management
                    </button>

                    <button
                        onClick={() => setActiveTab("logs")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === "logs" ? "bg-red-500/10 text-red-400" : "text-gray-400 hover:bg-gray-800/50"
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        System Logs
                    </button>

                    <button
                        onClick={() => setActiveTab("config")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === "config" ? "bg-red-500/10 text-red-400" : "text-gray-400 hover:bg-gray-800/50"
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        System Config
                    </button>

                    <button
                        onClick={() => setActiveTab("query")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === "query" ? "bg-red-500/10 text-red-400" : "text-gray-400 hover:bg-gray-800/50"
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                        </svg>
                        Database Query
                    </button>

                    <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800/50 transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                        </svg>
                        Back to Dashboard
                    </Link>
                </nav>

                <div className="absolute bottom-6 left-6 right-6">
                    <div className="glass-card p-4 mb-4 border-red-500/20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center text-white font-semibold">
                                {user?.name?.charAt(0) || 'A'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{user?.name || 'Admin'}</p>
                                <p className="text-xs text-red-400 truncate">{user?.role?.toUpperCase()}</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="btn-secondary w-full text-sm border-red-500/30 text-red-400 hover:bg-red-500/10">
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-72 p-8">
                <div className="max-w-6xl mx-auto">
                    {/* User Management Tab */}
                    {activeTab === "users" && (
                        <>
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h1 className="text-3xl font-bold mb-2">User Management</h1>
                                    <p className="text-gray-400">Manage all registered users</p>
                                </div>
                                <button className="btn-primary">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add User
                                </button>
                            </div>

                            <div className="glass-card overflow-hidden">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Role</th>
                                            <th>Status</th>
                                            <th>Last Login</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="text-center py-12 text-gray-500">
                                                    No users found
                                                </td>
                                            </tr>
                                        ) : (
                                            users.map((u) => (
                                                <tr key={u.id}>
                                                    <td>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                                                                {u.name?.charAt(0) || '?'}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium">{u.name}</div>
                                                                <div className="text-sm text-gray-400">{u.email}</div>
                                                                {/* VULNERABILITY: Exposing user IDs */}
                                                                <div className="text-xs text-gray-600">ID: {u.id}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {/* VULNERABILITY: Role can be changed without proper auth */}
                                                        <select
                                                            value={u.role}
                                                            onChange={(e) => updateUserRole(u.id, e.target.value)}
                                                            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                                                        >
                                                            <option value="user">User</option>
                                                            <option value="manager">Manager</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                                            {u.status || 'active'}
                                                        </span>
                                                    </td>
                                                    <td className="text-gray-400">{u.last_login || 'Never'}</td>
                                                    <td>
                                                        <div className="flex gap-2">
                                                            <button className="text-indigo-400 hover:text-indigo-300 text-sm">
                                                                Edit
                                                            </button>
                                                            {/* VULNERABILITY: Delete without confirmation */}
                                                            <button
                                                                onClick={() => deleteUser(u.id)}
                                                                className="text-red-400 hover:text-red-300 text-sm"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* System Logs Tab */}
                    {activeTab === "logs" && (
                        <>
                            <div className="mb-8">
                                <h1 className="text-3xl font-bold mb-2">System Logs</h1>
                                <p className="text-gray-400">View system activity and security events</p>
                            </div>

                            <div className="glass-card p-6 space-y-4 max-h-[600px] overflow-auto">
                                {logs.length === 0 ? (
                                    <p className="text-gray-500 text-center py-12">No logs available</p>
                                ) : (
                                    logs.map((log) => (
                                        <div key={log.id} className="flex items-start gap-4 p-4 bg-gray-800/30 rounded-lg">
                                            <div className={`w-2 h-2 rounded-full mt-2 ${log.type === 'error' ? 'bg-red-400' :
                                                    log.type === 'warning' ? 'bg-yellow-400' :
                                                        log.type === 'security' ? 'bg-orange-400' :
                                                            'bg-green-400'
                                                }`} />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-4 mb-1">
                                                    <span className={`text-xs font-mono uppercase ${log.type === 'error' ? 'text-red-400' :
                                                            log.type === 'warning' ? 'text-yellow-400' :
                                                                log.type === 'security' ? 'text-orange-400' :
                                                                    'text-green-400'
                                                        }`}>
                                                        {log.type}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{log.timestamp}</span>
                                                    {/* VULNERABILITY: Exposing IP addresses */}
                                                    {log.ip && <span className="text-xs text-gray-600">IP: {log.ip}</span>}
                                                </div>
                                                <p className="text-gray-300">{log.message}</p>
                                                {log.userId && (
                                                    <p className="text-xs text-gray-500 mt-1">User: {log.userId}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}

                    {/* System Config Tab */}
                    {activeTab === "config" && (
                        <>
                            <div className="mb-8">
                                <h1 className="text-3xl font-bold mb-2">System Configuration</h1>
                                <p className="text-gray-400">View and manage system settings</p>
                            </div>

                            <div className="glass-card p-6">
                                {/* VULNERABILITY: Exposing all system config including secrets */}
                                <pre className="text-sm text-gray-300 overflow-auto bg-gray-900/50 p-4 rounded-lg">
                                    {JSON.stringify(systemConfig, null, 2) || 'No configuration available'}
                                </pre>
                            </div>

                            <div className="mt-6 glass-card p-6">
                                <h3 className="font-semibold mb-4">Environment Variables</h3>
                                {/* VULNERABILITY: Exposing environment variables */}
                                <div className="space-y-2 font-mono text-sm">
                                    <div className="flex">
                                        <span className="text-gray-500 w-48">API_URL:</span>
                                        <span className="text-green-400">{API_URL}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="text-gray-500 w-48">NODE_ENV:</span>
                                        <span className="text-green-400">{process.env.NODE_ENV}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="text-gray-500 w-48">JWT_SECRET:</span>
                                        <span className="text-red-400">{process.env.JWT_SECRET || 'my-super-secret-jwt-key'}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="text-gray-500 w-48">DATABASE_URL:</span>
                                        <span className="text-red-400">{process.env.DATABASE_URL || 'postgresql://admin:***@db.example.com'}</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Database Query Tab - VULNERABILITY: SQL Injection */}
                    {activeTab === "query" && (
                        <>
                            <div className="mb-8">
                                <h1 className="text-3xl font-bold mb-2">Database Query Tool</h1>
                                <p className="text-gray-400">Execute raw SQL queries (Admin Only)</p>
                            </div>

                            <div className="glass-card p-6">
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2">SQL Query</label>
                                    <textarea
                                        value={sqlQuery}
                                        onChange={(e) => setSqlQuery(e.target.value)}
                                        className="input-field font-mono h-32"
                                        placeholder="SELECT * FROM users WHERE id = 1; -- Try SQL injection here"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">
                                        {/* VULNERABILITY: Hints about SQL injection */}
                                        💡 Examples: SELECT * FROM users; | SELECT * FROM projects; | DROP TABLE users; --
                                    </p>
                                </div>
                                <button onClick={executeQuery} className="btn-primary">
                                    Execute Query
                                </button>

                                {queryResult && (
                                    <div className="mt-6">
                                        <h4 className="text-sm font-medium mb-2">Query Result:</h4>
                                        <pre className="text-sm bg-gray-900/50 p-4 rounded-lg overflow-auto max-h-96">
                                            {JSON.stringify(queryResult, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>

                            {/* VULNERABILITY: Exposed database schema */}
                            <div className="mt-6 glass-card p-6">
                                <h3 className="font-semibold mb-4">Database Schema</h3>
                                <div className="text-sm font-mono text-gray-400">
                                    <p>• users (id, name, email, password_hash, role, created_at)</p>
                                    <p>• projects (id, name, description, owner_id, budget, status)</p>
                                    <p>• sessions (id, user_id, token, expires_at, ip_address)</p>
                                    <p>• api_keys (id, user_id, key, permissions, created_at)</p>
                                    <p>• audit_logs (id, user_id, action, details, timestamp)</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
