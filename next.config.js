/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        'services/python/**',
        'services/python/**/*.py',
        'services/python/**/*.pyc',
        'services/python/__pycache__/**',
      ],
    },
  },
  async rewrites() {
    return [{ source: '/', destination: '/' }];
  },
};

module.exports = nextConfig;
