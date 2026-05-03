/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@hestia/config"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com", pathname: "/**" }]
  },
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
    serverActions: {
      bodySizeLimit: "6mb"
    }
  }
};

module.exports = nextConfig;
