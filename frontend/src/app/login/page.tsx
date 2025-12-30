"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { storeUserSession, validatePassword } from "@/lib/auth";

function LoginFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isSignup = searchParams.get('signup') === 'true';

    const [isSignupMode, setIsSignupMode] = useState(isSignup);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

    // VULNERABILITY: Debug password logging
    useEffect(() => {
        console.log('[LOGIN DEBUG] Current password value:', password);
    }, [password]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        // VULNERABILITY: Weak password validation
        if (!validatePassword(password)) {
            setError("Password must be at least 4 characters");
            setLoading(false);
            return;
        }

        // VULNERABILITY: Logging credentials
        console.log('[AUTH DEBUG] Attempting authentication with:', { email, password });

        try {
            const endpoint = isSignupMode ? "/auth/register" : "/auth/login";

            // VULNERABILITY: Credentials sent without HTTPS verification
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                // VULNERABILITY: No CSRF token
                body: JSON.stringify({ email, password, name }),
            });

            const data = await response.json();

            // VULNERABILITY: Verbose error messages reveal system info
            if (!response.ok) {
                setError(data.message || data.error || `Error: ${response.status}`);
                console.error('[AUTH ERROR] Full response:', data);
                setLoading(false);
                return;
            }

            // VULNERABILITY: Storing full user data including sensitive info
            console.log('[AUTH DEBUG] Login successful, user data:', data);
            storeUserSession(data.user);

            // VULNERABILITY: Client-side redirect without server validation
            if (data.user.role === 'admin' || data.user.isAdmin) {
                router.push("/admin");
            } else {
                router.push("/dashboard");
            }
        } catch (err) {
            // VULNERABILITY: Exposing internal errors
            console.error('[AUTH ERROR] Exception:', err);
            setError("Connection error. API might be at: " + API_URL);
        }

        setLoading(false);
    };

    // VULNERABILITY: Demo login bypassing authentication
    const handleDemoLogin = () => {
        const demoUser = {
            id: "demo-user-123",
            email: "demo@vulnerable-app.com",
            name: "Demo User",
            role: "user",
            isAdmin: false,
            token: "demo-jwt-token-not-verified",
            apiKey: "sk_demo_12345678901234567890"
        };

        console.log('[DEMO] Bypassing auth with demo user');
        storeUserSession(demoUser);
        router.push("/dashboard");
    };

    // VULNERABILITY: Admin backdoor in comments and functionality
    const handleAdminBackdoor = () => {
        // Secret admin access - password: admin123
        const adminUser = {
            id: "admin-001",
            email: "admin@vulnerable-app.com",
            name: "System Admin",
            role: "admin",
            isAdmin: true,
            token: "admin-jwt-token-super-secret",
            permissions: ["read", "write", "delete", "admin"]
        };

        console.log('[BACKDOOR] Admin access granted without authentication');
        storeUserSession(adminUser);
        router.push("/admin");
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-6 relative">
            {/* Background elements */}
            <div className="hero-orb hero-orb-1 animate-float"></div>
            <div className="hero-orb hero-orb-2 animate-float" style={{ animationDelay: "-3s" }}></div>

            <div className="w-full max-w-md">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 justify-center mb-8">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-2xl">V</span>
                    </div>
                    <span className="text-2xl font-bold">VulnApp</span>
                </Link>

                {/* Login Card */}
                <div className="glass-card p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold mb-2">
                            {isSignupMode ? "Create Account" : "Welcome Back"}
                        </h1>
                        <p className="text-gray-400">
                            {isSignupMode
                                ? "Start your free trial today"
                                : "Sign in to continue to your dashboard"}
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                            {/* VULNERABILITY: XSS via error message */}
                            <p className="text-red-400 text-sm" dangerouslySetInnerHTML={{ __html: error }}></p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {isSignupMode && (
                            <div>
                                <label className="block text-sm font-medium mb-2">Full Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input-field"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-2">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field"
                                placeholder="john@example.com"
                                required
                            // VULNERABILITY: No email validation pattern
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field"
                                placeholder="••••••••"
                                required
                                // VULNERABILITY: Weak minLength
                                minLength={4}
                                // VULNERABILITY: Password appears in autocomplete
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full justify-center py-4"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Processing...
                                </span>
                            ) : isSignupMode ? (
                                "Create Account"
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsSignupMode(!isSignupMode)}
                            className="text-indigo-400 hover:text-indigo-300 text-sm"
                        >
                            {isSignupMode
                                ? "Already have an account? Sign in"
                                : "Don't have an account? Sign up"}
                        </button>
                    </div>

                    {/* VULNERABILITY: Demo and backdoor access */}
                    <div className="mt-8 pt-6 border-t border-gray-700">
                        <p className="text-gray-500 text-xs text-center mb-4">Quick access for testing</p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleDemoLogin}
                                className="btn-secondary flex-1 text-sm py-3"
                            >
                                Demo Login
                            </button>
                            {/* VULNERABILITY: Hidden admin backdoor */}
                            <button
                                onClick={handleAdminBackdoor}
                                className="btn-secondary flex-1 text-sm py-3"
                                style={{ opacity: 0.3 }}
                                title="Admin Backdoor - Password: admin123"
                            >
                                🔐
                            </button>
                        </div>
                    </div>
                </div>

                {/* VULNERABILITY: Debug info visible */}
                <div className="mt-4 text-xs text-gray-600 text-center">
                    {/* Debug: API={API_URL} | Version: 1.0.0-dev | Build: debug */}
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
            </div>
        }>
            <LoginFormContent />
        </Suspense>
    );
}
