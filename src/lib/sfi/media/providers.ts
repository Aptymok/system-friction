import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { renderGoogleVideo } from './providers/googleVideoProvider';
import { renderHuggingFaceVideo } from './providers/huggingfaceVideoProvider';

export type GeneratedExternalAsset = {
  buffer: Buffer;
  mime: string;
  provider: 'huggingface' | 'google';
  model: string;
};

export type GeneratedAsset = GeneratedExternalAsset & {
  type: 'image' | 'video';
};

const HF_ROUTER_URL = 'https://router.huggingface.co';
const GOOGLE_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

function withTimeout(ms = 120000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    done() {
      clearTimeout(timeout);
    },
  };
}

function readErrorText(response: Response) {
  return response.text().catch(() => '');
}

function hfToken() {
  return process.env.HUGGINGFACE_API_TOKEN || process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || '';
}

function googleKey() {
  return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
}

function hfImageModel() {
  return process.env.HF_IMAGE_MODEL || 'black-forest-labs/FLUX.1-schnell';
}

function hfVideoModel() {
  return process.env.HF_VIDEO_MODEL || 'Wan-AI/Wan2.1-T2V-1.3B';
}

function googleImageModel() {
  return process.env.GOOGLE_IMAGE_MODEL || 'imagen-3.0-generate-002';
}

function googleVideoModel() {
  return process.env.GOOGLE_VIDEO_MODEL || 'veo-2.0-generate-001';
}

function mimeFromResponse(response: Response, fallback: string) {
  return response.headers.get('content-type') || fallback;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    return cause ? `${error.message}: ${String(cause)}` : error.message;
  }

  return String(error);
}

function extractBase64Image(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as Record<string, any>;
  const candidates = [
    root.predictions?.[0]?.bytesBase64Encoded,
    root.predictions?.[0]?.image?.bytesBase64Encoded,
    root.predictions?.[0]?.image?.imageBytes,
    root.generatedImages?.[0]?.image?.imageBytes,
    root.images?.[0]?.bytesBase64Encoded,
    root.candidates?.[0]?.content?.parts?.find?.((part: any) => part?.inlineData?.data)?.inlineData?.data,
  ];

  return candidates.find((value) => typeof value === 'string' && value.length > 0) ?? null;
}

async function fileBackedGeneration(
  prefix: string,
  generate: (outputBasePath: string) => Promise<{ ok: boolean; file_path?: string; content_type?: string; error?: string; model?: string }>,
) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  const outputBasePath = path.join(tempDir, 'asset');

  try {
    const result = await generate(outputBasePath);
    if (!result.ok || !result.file_path) {
      throw new Error(result.error || `${prefix}_failed`);
    }

    const buffer = await fs.readFile(result.file_path);
    return {
      buffer,
      mime: result.content_type || 'application/octet-stream',
      model: result.model,
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function generateImageWithHF(prompt: string): Promise<GeneratedExternalAsset> {
  const token = hfToken();
  if (!token) throw new Error('huggingface_token_missing');

  const model = hfImageModel();
  const timeout = withTimeout(Number(process.env.HF_IMAGE_TIMEOUT_MS) || 120000);

  try {
    const response = await fetch(`${HF_ROUTER_URL}/hf-inference/models/${model}`, {
      method: 'POST',
      signal: timeout.signal,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        accept: 'image/png',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          num_inference_steps: 4,
          guidance_scale: 0,
        },
        options: {
          wait_for_model: true,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`huggingface_image_${response.status}: ${await readErrorText(response)}`);
    }

    const mime = mimeFromResponse(response, 'image/png');
    if (mime.includes('application/json')) {
      throw new Error(`huggingface_image_returned_json: ${await readErrorText(response)}`);
    }

    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      mime,
      provider: 'huggingface',
      model,
    };
  } finally {
    timeout.done();
  }
}

export async function generateVideoWithHF(prompt: string): Promise<GeneratedExternalAsset> {
  const previousModels = process.env.HF_VIDEO_MODELS;
  if (!previousModels && process.env.HF_VIDEO_MODEL) {
    process.env.HF_VIDEO_MODELS = process.env.HF_VIDEO_MODEL;
  } else if (!previousModels) {
    process.env.HF_VIDEO_MODELS = hfVideoModel();
  }

  try {
    const generated = await fileBackedGeneration('sfi-hf-video-', (outputBasePath) => renderHuggingFaceVideo({ prompt, outputBasePath }));
    return {
      buffer: generated.buffer,
      mime: generated.mime === 'application/octet-stream' ? 'video/mp4' : generated.mime,
      provider: 'huggingface',
      model: generated.model || hfVideoModel(),
    };
  } finally {
    if (previousModels === undefined) {
      delete process.env.HF_VIDEO_MODELS;
    } else {
      process.env.HF_VIDEO_MODELS = previousModels;
    }
  }
}

export async function generateImageWithGoogle(prompt: string): Promise<GeneratedExternalAsset> {
  const key = googleKey();
  if (!key) throw new Error('google_api_key_missing');

  const model = googleImageModel();
  const timeout = withTimeout(Number(process.env.GOOGLE_IMAGE_TIMEOUT_MS) || 120000);

  try {
    const response = await fetch(`${GOOGLE_BASE_URL}/models/${model}:predict`, {
      method: 'POST',
      signal: timeout.signal,
      headers: {
        'x-goog-api-key': key,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: process.env.GOOGLE_IMAGE_ASPECT_RATIO || '1:1',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`google_image_${response.status}: ${await readErrorText(response)}`);
    }

    const payload = await response.json();
    const base64 = extractBase64Image(payload);
    if (!base64) {
      throw new Error(`google_image_missing_base64:${JSON.stringify(payload).slice(0, 400)}`);
    }

    return {
      buffer: Buffer.from(base64, 'base64'),
      mime: 'image/png',
      provider: 'google',
      model,
    };
  } finally {
    timeout.done();
  }
}

export async function generateVideoWithGoogle(prompt: string): Promise<GeneratedExternalAsset> {
  const previousModel = process.env.GOOGLE_VIDEO_MODEL;
  if (!previousModel) process.env.GOOGLE_VIDEO_MODEL = googleVideoModel();

  try {
    const generated = await fileBackedGeneration('sfi-google-video-', (outputBasePath) => renderGoogleVideo({ prompt, outputBasePath }));
    return {
      buffer: generated.buffer,
      mime: generated.mime === 'application/octet-stream' ? 'video/mp4' : generated.mime,
      provider: 'google',
      model: generated.model || googleVideoModel(),
    };
  } finally {
    if (previousModel === undefined) {
      delete process.env.GOOGLE_VIDEO_MODEL;
    } else {
      process.env.GOOGLE_VIDEO_MODEL = previousModel;
    }
  }
}

export async function generateAsset(input: { type: 'image' | 'video'; prompt: string; caseId: string }): Promise<GeneratedAsset> {
  if (input.type === 'image') {
    const errors: string[] = [];
    try {
      return { type: 'image', ...(await generateImageWithHF(input.prompt)) };
    } catch (hfError) {
      errors.push(`huggingface: ${errorMessage(hfError)}`);
      console.warn('[sfi-media] huggingface image failed; trying google', errorMessage(hfError));
    }

    try {
      return { type: 'image', ...(await generateImageWithGoogle(input.prompt)) };
    } catch (googleError) {
      errors.push(`google: ${errorMessage(googleError)}`);
      throw new Error(errors.join(' | '));
    }
  }

  const errors: string[] = [];
  try {
    return { type: 'video', ...(await generateVideoWithHF(input.prompt)) };
  } catch (hfError) {
    errors.push(`huggingface: ${errorMessage(hfError)}`);
    console.warn('[sfi-media] huggingface video failed; trying google', errorMessage(hfError));
  }

  try {
    return { type: 'video', ...(await generateVideoWithGoogle(input.prompt)) };
  } catch (googleError) {
    errors.push(`google: ${errorMessage(googleError)}`);
    throw new Error(errors.join(' | '));
  }
}
