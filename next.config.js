/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [{ source: '/', destination: '/' }];
  },
};

module.exports = nextConfig;
