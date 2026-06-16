import fs from 'node:fs/promises';

type VideoResult = {
  ok: boolean;
  file_path?: string;
  error?: string;
  provider_used?: string;
  model?: string;
  fallback_used?: boolean;
  content_type?: string;
};

type FalQueueStart = {
  request_id?: string;
  status?: string;
  response_url?: string;
};

type FalQueueResult = {
  video?: {
    url?: string;
  };
};

const HF_HUB_URL = 'https://huggingface.co';
const HF_ROUTER_URL = 'https://router.huggingface.co';
const DEFAULT_MODELS = [
  'Wan-AI/Wan2.2-TI2V-5B',
  'Wan-AI/Wan2.2-T2V-A14B',
  'Lightricks/LTX-Video-0.9.7-distilled',
  'tencent/HunyuanVideo',
];

function hfToken(): string | null {
  return process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || null;
}

function csv(value: string | undefined, fallback: string[]) {
  const parsed = value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return parsed?.length ? parsed : fallback;
}

function hfVideoModels() {
  return Array.from(new Set([...csv(process.env.HF_VIDEO_MODELS || process.env.HF_VIDEO_MODEL, []), ...DEFAULT_MODELS]));
}

function numberEnv(key: string, fallback: number) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mediaExtension(contentType: string | null) {
  if (contentType?.includes('webm')) return 'webm';
  if (contentType?.includes('quicktime')) return 'mov';
  return 'mp4';
}

async function readText(response: Response) {
  return response.text().catch(() => '');
}

async function resolveFalProviderId(model: string, token: string) {
  const response = await fetch(`${HF_HUB_URL}/api/partners/fal-ai/models`, {
    headers: {
      authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`hf_fal_mapping_${response.status}: ${await readText(response)}`);
  }

  const mapping = await response.json();
  const entry = mapping?.['text-to-video']?.[model];
  const providerId = typeof entry?.providerId === 'string' ? entry.providerId : null;

  if (!providerId) {
    throw new Error(`hf_fal_model_not_mapped:${model}`);
  }

  return providerId;
}

async function submitFalQueue(prompt: string, model: string, token: string) {
  const providerId = await resolveFalProviderId(model, token);
  const url = `${HF_ROUTER_URL}/fal-ai/${providerId}?_subdomain=queue`;
  const payload: Record<string, unknown> = {
    prompt,
    num_frames: numberEnv('HF_VIDEO_NUM_FRAMES', 24),
  };

  const steps = numberEnv('HF_VIDEO_NUM_INFERENCE_STEPS', 0);
  const guidance = Number(process.env.HF_VIDEO_GUIDANCE_SCALE);
  const negativePrompt = process.env.HF_VIDEO_NEGATIVE_PROMPT;

  if (steps > 0) payload.num_inference_steps = steps;
  if (Number.isFinite(guidance)) payload.guidance_scale = guidance;
  if (negativePrompt) payload.negative_prompt = negativePrompt.split('|').map((item) => item.trim()).filter(Boolean);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`hf_fal_submit_${response.status}: ${await readText(response)}`);
  }

  const queue = (await response.json()) as FalQueueStart;
  if (!queue.request_id || !queue.response_url) {
    throw new Error(`hf_fal_queue_malformed:${JSON.stringify(queue).slice(0, 400)}`);
  }

  return { queue, providerId, submitUrl: url };
}

async function waitForFalResult(queue: FalQueueStart, submitUrl: string, token: string) {
  const timeoutMs = numberEnv('HF_VIDEO_TIMEOUT_MS', 180000);
  const pollMs = numberEnv('HF_VIDEO_POLL_MS', 1000);
  const started = Date.now();
  const parsedSubmitUrl = new URL(submitUrl);
  const baseUrl = `${parsedSubmitUrl.protocol}//${parsedSubmitUrl.host}/fal-ai`;
  const modelPath = new URL(queue.response_url || '').pathname;
  const query = parsedSubmitUrl.search;
  const statusUrl = `${baseUrl}${modelPath}/status${query}`;
  const resultUrl = `${baseUrl}${modelPath}${query}`;
  let status = queue.status || 'IN_QUEUE';

  while (status !== 'COMPLETED') {
    if (Date.now() - started > timeoutMs) {
      throw new Error(`hf_fal_timeout:${status}`);
    }

    await sleep(pollMs);

    const response = await fetch(statusUrl, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`hf_fal_status_${response.status}: ${await readText(response)}`);
    }

    const body = await response.json();
    status = typeof body?.status === 'string' ? body.status : status;

    if (status === 'FAILED' || status === 'ERROR') {
      throw new Error(`hf_fal_failed:${JSON.stringify(body).slice(0, 400)}`);
    }
  }

  const response = await fetch(resultUrl, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`hf_fal_result_${response.status}: ${await readText(response)}`);
  }

  return (await response.json()) as FalQueueResult;
}

async function downloadVideo(url: string, outputBasePath: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`hf_fal_video_download_${response.status}: ${await readText(response)}`);
  }

  const contentType = response.headers.get('content-type');
  const outputPath = `${outputBasePath}.${mediaExtension(contentType)}`;
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(outputPath, buffer);

  return { outputPath, contentType: contentType || 'video/mp4' };
}

export async function renderHuggingFaceVideo(params: {
  prompt: string;
  outputBasePath: string;
}): Promise<VideoResult> {
  const token = hfToken();
  if (!token) {
    return { ok: false, provider_used: 'huggingface', error: 'hf_token_missing' };
  }

  const models = hfVideoModels();
  const errors: string[] = [];

  for (const model of models) {
    try {
      const { queue, submitUrl } = await submitFalQueue(params.prompt, model, token);
      const result = await waitForFalResult(queue, submitUrl, token);
      const videoUrl = result.video?.url;

      if (!videoUrl) {
        throw new Error(`hf_fal_missing_video_url:${JSON.stringify(result).slice(0, 400)}`);
      }

      const downloaded = await downloadVideo(videoUrl, params.outputBasePath);
      return {
        ok: true,
        file_path: downloaded.outputPath,
        content_type: downloaded.contentType,
        provider_used: 'huggingface:fal-ai',
        model,
        fallback_used: false,
      };
    } catch (error) {
      errors.push(`${model}: ${error instanceof Error ? error.message : 'hf_video_failed'}`);
    }
  }

  return {
    ok: false,
    provider_used: 'huggingface',
    error: errors.join(' | ') || 'hf_video_failed',
  };
}
