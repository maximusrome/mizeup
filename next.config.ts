import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      // Redirect www to non-www
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.mizeup.com',
          },
        ],
        destination: 'https://mizeup.com/:path*',
        permanent: true,
      },
      // Redirect http to https
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'mizeup.com',
          },
        ],
        destination: 'https://mizeup.com/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
