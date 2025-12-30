"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [stats, setStats] = useState({ users: 0, projects: 0, uptime: 0 });

  useEffect(() => {
    // VULNERABILITY: Logging sensitive info
    console.log('[DEBUG] API URL:', process.env.NEXT_PUBLIC_API_URL);
    console.log('[DEBUG] Firebase Config available');

    // Animate stats
    const interval = setInterval(() => {
      setStats(prev => ({
        users: Math.min(prev.users + 47, 12500),
        projects: Math.min(prev.projects + 23, 8400),
        uptime: Math.min(prev.uptime + 0.3, 99.9),
      }));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background orbs */}
      <div className="hero-orb hero-orb-1 animate-float"></div>
      <div className="hero-orb hero-orb-2 animate-float" style={{ animationDelay: '-3s' }}></div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">V</span>
            </div>
            <span className="text-xl font-bold">VulnApp</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-300 hover:text-white transition">Features</a>
            <a href="#pricing" className="text-gray-300 hover:text-white transition">Pricing</a>
            <a href="#about" className="text-gray-300 hover:text-white transition">About</a>
            {/* VULNERABILITY: Hidden admin link discoverable in source */}
            {/* <Link href="/admin">Admin Panel</Link> */}
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="btn-secondary">
              Sign In
            </Link>
            <Link href="/login?signup=true" className="btn-primary">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-8">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-sm text-gray-300">Now with AI-powered insights</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Manage Projects
              <span className="gradient-text block">Like Never Before</span>
            </h1>

            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              The all-in-one platform for teams to collaborate, track progress,
              and deliver exceptional results. Built for the modern workflow.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login?signup=true" className="btn-primary text-lg px-8 py-4">
                Start Free Trial
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <button className="btn-secondary text-lg px-8 py-4 flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Watch Demo
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="glass-card p-6 text-center">
              <div className="text-4xl font-bold gradient-text mb-2">{stats.users.toLocaleString()}+</div>
              <div className="text-gray-400">Active Users</div>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="text-4xl font-bold gradient-text mb-2">{stats.projects.toLocaleString()}+</div>
              <div className="text-gray-400">Projects Managed</div>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="text-4xl font-bold gradient-text mb-2">{stats.uptime.toFixed(1)}%</div>
              <div className="text-gray-400">Uptime</div>
            </div>
          </div>

          {/* Features Preview */}
          <div className="mt-32" id="features">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Powerful Features
            </h2>
            <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
              Everything you need to manage your projects efficiently
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: "📊",
                  title: "Real-time Analytics",
                  description: "Track project progress with live dashboards and insights"
                },
                {
                  icon: "🔒",
                  title: "Enterprise Security",
                  description: "Bank-grade encryption and compliance certifications"
                },
                {
                  icon: "🚀",
                  title: "Blazing Fast",
                  description: "Optimized performance with global CDN distribution"
                },
                {
                  icon: "👥",
                  title: "Team Collaboration",
                  description: "Real-time editing and communication tools built-in"
                },
                {
                  icon: "🔌",
                  title: "Integrations",
                  description: "Connect with 100+ tools you already use"
                },
                {
                  icon: "📱",
                  title: "Mobile Ready",
                  description: "Full-featured mobile apps for iOS and Android"
                }
              ].map((feature, index) => (
                <div key={index} className="glass-card p-8 hover:border-indigo-500/50 transition-all duration-300">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-6">
        <div className="max-w-7xl mx-auto text-center text-gray-500">
          <p>© 2024 VulnApp. All rights reserved.</p>
          {/* VULNERABILITY: Debug info in footer comment */}
          {/* API: http://localhost:3001, Admin: /admin, Debug: /api/debug */}
        </div>
      </footer>
    </div>
  );
}
