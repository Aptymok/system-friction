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
  experimental: { proxyClientMaxBodySize: '50mb' },
  serverExternalPackages: ['ffmpeg-static','ffprobe-static','sharp','mammoth','pdf-parse','music-metadata'],
  outputFileTracingIncludes: {
    '/api/studio/objects/*/analyze/audio': mediaRuntimeFiles,
    '/api/studio/objects/\\[id\\]/analyze/audio': mediaRuntimeFiles,
    '/api/studio/objects/*/analyze/video': mediaRuntimeFiles,
    '/api/studio/objects/\\[id\\]/analyze/video': mediaRuntimeFiles,
  },
  outputFileTracingExcludes: { '*': ['services/python/**','services/python/**/*.py','services/python/**/*.pyc','services/python/__pycache__/**'] },
  async redirects() {
    return [
      { source: '/root/predictions/new', destination: '/root/predictions#new-prediction', permanent: false },
      { source: '/root/prospect-radar', destination: '/root/commercial#prospect-radar', permanent: false },
      { source: '/root/development', destination: '/root/readiness', permanent: true },
      { source: '/root/continuity', destination: '/root/readiness', permanent: true },
      { source: '/root/contracts', destination: '/root/readiness', permanent: true },
      { source: '/root/total-proof', destination: '/root/readiness', permanent: true },
      { source: '/root/cognitive-twin/system', destination: '/root/cognitive-twin', permanent: true },
      { source: '/root/cognitive-twin/lineage', destination: '/root/cognitive-twin', permanent: true },
      { source: '/root/cognitive-twin/journal', destination: '/root/cognitive-twin', permanent: true },
      { source: '/root/agents/passports', destination: '/root/agents', permanent: true },
    ];
  },
  async rewrites() { return [{ source: '/', destination: '/' }]; },
};

module.exports = nextConfig;
