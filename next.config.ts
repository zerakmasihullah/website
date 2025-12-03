import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'order.oscarlimerick.com',
        pathname: '/storage/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/storage/**',
      },
    ],
    unoptimized: true, // Disable image optimization for external images
  },
  // Production optimizations
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // Environment variables validation
  // Note: NEXT_PUBLIC_API_URL should be set in production environment
  // This default uses the online backend for both local and production
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://order.oscarlimerick.com/api',
  },
};

export default nextConfig;
