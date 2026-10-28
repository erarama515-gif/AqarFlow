/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Re-write API requests to the backend during local dev so cookies & CORS
  // behave like production.
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010';
    return [{ source: '/api/:path*', destination: `${api}/api/:path*` }];
  },
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3011', 'localhost:3001'] },
  },
};
export default nextConfig;
