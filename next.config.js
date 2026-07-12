/** @type {import('next').NextConfig} */
const path = require('node:path');

function tracingPath(filePath) {
  if (typeof filePath !== 'string' || !filePath) return null;
  const relative = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  return relative.startsWith('.') ? relative : `./${relative}`;
}

const ffmpegPath = tracingPath(require('ffmpeg-static'));
const ffprobePath = tracingPath(require('ffprobe-static').path);
const mediaRuntimeFiles = [ffmpegPath, ffprobePath].filter(Boolean);

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
    '/api/studio/objects/*/analyze/audio': mediaRuntimeFiles,
    '/api/studio/objects/\\[id\\]/analyze/audio': mediaRuntimeFiles,
    '/api/studio/objects/*/analyze/video': mediaRuntimeFiles,
    '/api/studio/objects/\\[id\\]/analyze/video': mediaRuntimeFiles,
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
