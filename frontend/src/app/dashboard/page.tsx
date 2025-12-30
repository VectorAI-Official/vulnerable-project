"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUserSession, isAuthenticated, logout, isAdmin } from "@/lib/auth";

interface Project {
    id: string;
    name: string;
    description: string;
    status: string;
    owner: string;
    budget: number;
    created_at: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUserId, setSelectedUserId] = useState("");

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

    useEffect(() => {
        // VULNERABILITY: Client-side only auth check
        if (!isAuthenticated()) {
            console.log('[AUTH] No valid session, redirecting...');
            router.push("/login");
            return;
        }

        const sessionUser = getUserSession();
        setUser(sessionUser);

        // VULNERABILITY: Debug logging user session
        console.log('[DASHBOARD DEBUG] User session:', sessionUser);
        console.log('[DASHBOARD DEBUG] Auth token:', sessionUser?.token);

        fetchProjects(sessionUser?.id);
    }, [router]);

    // VULNERABILITY: IDOR - Can fetch any user's projects by changing userId
    const fetchProjects = async (userId: string) => {
        try {
            // VULNERABILITY: No server-side validation of userId ownership
            const response = await fetch(`${API_URL}/users/${userId}/projects`, {
                headers: {
                    // VULNERABILITY: Token in header but not validated properly on server
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setProjects(data.projects || []);
                console.log('[DASHBOARD DEBUG] Fetched projects:', data);
            } else {
                // VULNERABILITY: Show detailed error info
                const error = await response.json();
                console.error('[DASHBOARD ERROR] Full response:', error);
            }
        } catch (err) {
            console.error('[DASHBOARD ERROR]', err);
        }
        setLoading(false);
    };

    // VULNERABILITY: Search with potential injection
    const handleSearch = async () => {
        if (!searchQuery) return;

        try {
            // VULNERABILITY: User input directly in URL without sanitization
            const response = await fetch(`${API_URL}/projects/search?q=${searchQuery}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            const data = await response.json();
            setProjects(data.projects || []);
        } catch (err) {
            console.error('[SEARCH ERROR]', err);
        }
    };

    // VULNERABILITY: IDOR - View any user's projects
    const handleViewOtherUser = () => {
        if (selectedUserId) {
            console.log('[IDOR] Attempting to access user:', selectedUserId);
            fetchProjects(selectedUserId);
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
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 bottom-0 w-64 bg-gray-900/50 backdrop-blur-lg border-r border-gray-800 p-6">
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold">V</span>
                    </div>
                    <span className="font-bold text-lg">VulnApp</span>
                </div>

                <nav className="space-y-2">
                    <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-indigo-500/10 text-indigo-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z M14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z M4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z M14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        Dashboard
                    </Link>
                    <Link href="/projects" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800/50 transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        Projects
                    </Link>
                    <Link href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800/50 transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                    </Link>

                    {/* VULNERABILITY: Admin link visible based on client-side check only */}
                    {isAdmin() && (
                        <Link href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-lg text-yellow-400 hover:bg-yellow-500/10 transition">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Admin Panel
                        </Link>
                    )}
                </nav>

                <div className="absolute bottom-6 left-6 right-6">
                    <div className="glass-card p-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold">
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{user?.name || 'User'}</p>
                                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="btn-secondary w-full text-sm">
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-64 p-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
                            <p className="text-gray-400">Welcome back, {user?.name}!</p>
                        </div>
                        <button className="btn-primary">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New Project
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="glass-card p-6">
                            <div className="text-sm text-gray-400 mb-1">Total Projects</div>
                            <div className="text-3xl font-bold">{projects.length}</div>
                        </div>
                        <div className="glass-card p-6">
                            <div className="text-sm text-gray-400 mb-1">Active</div>
                            <div className="text-3xl font-bold text-green-400">
                                {projects.filter(p => p.status === 'active').length}
                            </div>
                        </div>
                        <div className="glass-card p-6">
                            <div className="text-sm text-gray-400 mb-1">Pending</div>
                            <div className="text-3xl font-bold text-yellow-400">
                                {projects.filter(p => p.status === 'pending').length}
                            </div>
                        </div>
                        <div className="glass-card p-6">
                            <div className="text-sm text-gray-400 mb-1">Total Budget</div>
                            <div className="text-3xl font-bold gradient-text">
                                ${projects.reduce((sum, p) => sum + (p.budget || 0), 0).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* VULNERABILITY: IDOR testing section */}
                    <div className="glass-card p-6 mb-8">
                        <h3 className="font-semibold mb-4">🔍 Search & Filter</h3>
                        <div className="flex gap-4 flex-wrap">
                            <div className="flex-1 min-w-64">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search projects..."
                                    className="input-field"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                            </div>
                            <button onClick={handleSearch} className="btn-secondary">
                                Search
                            </button>

                            {/* VULNERABILITY: IDOR - Direct user ID input */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    placeholder="User ID (try: admin-001)"
                                    className="input-field w-48"
                                />
                                <button onClick={handleViewOtherUser} className="btn-secondary">
                                    View User
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            {/* VULNERABILITY: Hint about IDOR */}
                            💡 Tip: Try viewing other user IDs like "admin-001", "user-002", "demo-user-123"
                        </p>
                    </div>

                    {/* Projects Table */}
                    <div className="glass-card overflow-hidden">
                        <div className="p-6 border-b border-gray-700">
                            <h3 className="font-semibold">Your Projects</h3>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Project</th>
                                    <th>Status</th>
                                    <th>Owner</th>
                                    <th>Budget</th>
                                    <th>Created</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {projects.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-gray-500">
                                            No projects found. Create your first project!
                                        </td>
                                    </tr>
                                ) : (
                                    projects.map((project) => (
                                        <tr key={project.id}>
                                            <td>
                                                <div>
                                                    <div className="font-medium">{project.name}</div>
                                                    <div className="text-sm text-gray-400">{project.description}</div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${project.status === 'active' ? 'badge-success' :
                                                        project.status === 'pending' ? 'badge-warning' :
                                                            project.status === 'completed' ? 'badge-info' :
                                                                'badge-danger'
                                                    }`}>
                                                    {project.status}
                                                </span>
                                            </td>
                                            <td>{project.owner}</td>
                                            <td>${(project.budget || 0).toLocaleString()}</td>
                                            <td className="text-gray-400">{project.created_at}</td>
                                            <td>
                                                <button className="text-indigo-400 hover:text-indigo-300">
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Debug Panel - VULNERABILITY: Exposed debug info */}
                    <div className="mt-8 glass-card p-6 opacity-50">
                        <h4 className="text-xs font-mono text-gray-500 mb-2">Debug Info (Development Only)</h4>
                        <pre className="text-xs text-gray-600 overflow-auto">
                            {JSON.stringify({
                                userId: user?.id,
                                token: user?.token?.substring(0, 20) + '...',
                                apiUrl: API_URL,
                                isAdmin: isAdmin(),
                            }, null, 2)}
                        </pre>
                    </div>
                </div>
            </main>
        </div>
    );
}
