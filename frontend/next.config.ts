import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // VULNERABILITY: Exposing sensitive environment variables to the client
  env: {
    // These should NEVER be exposed to the client in production
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  },
  
  // VULNERABILITY: Allowing all external image sources
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // VULNERABILITY: Disabling security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // VULNERABILITY: Allowing embedding from any origin
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          // VULNERABILITY: Disabling XSS protection
          { key: 'X-XSS-Protection', value: '0' },
          // VULNERABILITY: Allowing all content sources
          { key: 'Content-Security-Policy', value: "default-src * 'unsafe-inline' 'unsafe-eval'" },
        ],
      },
    ];
  },

  // VULNERABILITY: Exposing source maps in production  
  productionBrowserSourceMaps: true,
};

export default nextConfig;
