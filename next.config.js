/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [{ source: '/', destination: '/' }];
  },
  allowedDevOrigins: ['localhost', '192.168.1.137'],
};

module.exports = nextConfig;
