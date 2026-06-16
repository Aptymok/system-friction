import fs from 'node:fs/promises';

type GoogleVideoResult = {
  ok: boolean;
  file_path?: string;
  error?: string;
  provider_used?: string;
  model?: string;
  fallback_used?: boolean;
};

type GoogleOperation = {
  name?: string;
  done?: boolean;
  error?: {
    message?: string;
  };
  response?: {
    generateVideoResponse?: {
      generatedSamples?: Array<{
        video?: {
          uri?: string;
        };
      }>;
    };
  };
};

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

function apiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
}

function numberEnv(key: string, fallback: number) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readText(response: Response) {
  return response.text().catch(() => '');
}

async function startGeneration(prompt: string, key: string) {
  const model = process.env.GOOGLE_VIDEO_MODEL || 'veo-3.1-fast-generate-preview';
  const parameters: Record<string, string> = {
    aspectRatio: process.env.GOOGLE_VIDEO_ASPECT_RATIO || '9:16',
    durationSeconds: process.env.GOOGLE_VIDEO_DURATION_SECONDS || '4',
    resolution: process.env.GOOGLE_VIDEO_RESOLUTION || '720p',
  };

  const personGeneration = process.env.GOOGLE_VIDEO_PERSON_GENERATION;
  if (personGeneration) parameters.personGeneration = personGeneration;

  const response = await fetch(`${BASE_URL}/models/${model}:predictLongRunning`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': key,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters,
    }),
  });

  if (!response.ok) {
    throw new Error(`google_veo_submit_${response.status}: ${await readText(response)}`);
  }

  const operation = (await response.json()) as GoogleOperation;
  if (!operation.name) {
    throw new Error(`google_veo_operation_missing:${JSON.stringify(operation).slice(0, 400)}`);
  }

  return { operation, model };
}

async function waitForOperation(operationName: string, key: string) {
  const timeoutMs = numberEnv('GOOGLE_VIDEO_TIMEOUT_MS', 360000);
  const pollMs = numberEnv('GOOGLE_VIDEO_POLL_MS', 10000);
  const started = Date.now();

  while (Date.now() - started <= timeoutMs) {
    const response = await fetch(`${BASE_URL}/${operationName}`, {
      headers: {
        'x-goog-api-key': key,
      },
    });

    if (!response.ok) {
      throw new Error(`google_veo_status_${response.status}: ${await readText(response)}`);
    }

    const operation = (await response.json()) as GoogleOperation;
    if (operation.error?.message) {
      throw new Error(`google_veo_failed:${operation.error.message}`);
    }

    if (operation.done) {
      const uri = operation.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      if (!uri) {
        throw new Error(`google_veo_video_uri_missing:${JSON.stringify(operation).slice(0, 400)}`);
      }

      return uri;
    }

    await sleep(pollMs);
  }

  throw new Error('google_veo_timeout');
}

async function downloadVideo(uri: string, key: string, outputPath: string) {
  const response = await fetch(uri, {
    headers: {
      'x-goog-api-key': key,
    },
  });

  if (!response.ok) {
    throw new Error(`google_veo_download_${response.status}: ${await readText(response)}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(outputPath, buffer);
}

export async function renderGoogleVideo(params: {
  prompt: string;
  outputBasePath: string;
}): Promise<GoogleVideoResult> {
  const key = apiKey();
  if (!key) {
    return { ok: false, provider_used: 'google:veo', error: 'google_api_key_missing' };
  }

  try {
    const { operation, model } = await startGeneration(params.prompt, key);
    const uri = await waitForOperation(operation.name || '', key);
    const outputPath = `${params.outputBasePath}.mp4`;
    await downloadVideo(uri, key, outputPath);

    return {
      ok: true,
      file_path: outputPath,
      provider_used: 'google:veo',
      model,
      fallback_used: false,
    };
  } catch (error) {
    return {
      ok: false,
      provider_used: 'google:veo',
      error: error instanceof Error ? error.message : 'google_veo_failed',
    };
  }
}
