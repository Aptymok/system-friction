/** @type {import('next').NextConfig} */
const mediaRuntimeFiles = [
  './node_modules/ffmpeg-static/**/*',
  './node_modules/ffprobe-static/**/*',
];

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
    // Next route tracing keys use glob matching. The previous unescaped [id]
    // pattern could be interpreted as a character class and omit the binaries.
    '/api/studio/objects/*/analyze': mediaRuntimeFiles,
    '/api/studio/objects/\\[id\\]/analyze': mediaRuntimeFiles,
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
