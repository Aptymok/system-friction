/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    proxyClientMaxBodySize: '50mb',
  },
  serverExternalPackages: [
    'ffmpeg-static',
    'ffprobe-static',
    'sharp',
    'mammoth',
    'pdf-parse',
    'music-metadata',
  ],
  outputFileTracingIncludes: {
    '/api/studio/objects/[id]/analyze': [
      './node_modules/ffmpeg-static/**/*',
      './node_modules/ffprobe-static/**/*',
    ],
  },
  outputFileTracingExcludes: {
    '*': [
      'services/python/**',
      'services/python/**/*.py',
      'services/python/**/*.pyc',
      'services/python/__pycache__/**',
    ],
  },
  async rewrites() {
    return [{ source: '/', destination: '/' }];
  },
};

module.exports = nextConfig;
