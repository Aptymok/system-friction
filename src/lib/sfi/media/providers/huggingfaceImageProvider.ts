import fs from 'node:fs/promises';

type HfImageResult = {
  ok: boolean;
  provider_used: 'huggingface';
  file_path?: string;
  content_type?: string;
  error?: string;
  status?: number;
};

function hfToken(): string | null {
  return process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || null;
}

function hfImageModel(): string {
  return process.env.HF_IMAGE_MODEL || 'black-forest-labs/FLUX.1-schnell';
}

function extensionFrom(contentType: string | null): string {
  if (!contentType) return 'png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  return 'png';
}

export async function renderHuggingFaceImage(params: {
  prompt: string;
  outputBasePath: string;
}): Promise<HfImageResult> {
  try {
    const token = hfToken();

    if (!token) {
      return {
        ok: false,
        provider_used: 'huggingface',
        error: 'hf_token_missing',
      };
    }

    const model = hfImageModel();
    const response = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        accept: 'image/png',
      },
      body: JSON.stringify({
        inputs: params.prompt,
        parameters: {
          num_inference_steps: 4,
          guidance_scale: 0,
        },
        options: {
          wait_for_model: true,
        },
      }),
    });

    const contentType = response.headers.get('content-type');

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        ok: false,
        provider_used: 'huggingface',
        status: response.status,
        error: text || `huggingface_router_failed_${response.status}`,
      };
    }

    if (contentType?.includes('application/json')) {
      const text = await response.text().catch(() => '');
      return {
        ok: false,
        provider_used: 'huggingface',
        status: response.status,
        error: text || 'huggingface_router_returned_json_not_image',
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = extensionFrom(contentType);
    const filePath = `${params.outputBasePath}.${ext}`;

    await fs.writeFile(filePath, buffer);

    return {
      ok: true,
      provider_used: 'huggingface',
      file_path: filePath,
      content_type: contentType ?? 'image/png',
    };
  } catch (error) {
    return {
      ok: false,
      provider_used: 'huggingface',
      error: error instanceof Error ? error.message : 'huggingface_router_fetch_failed',
    };
  }
}

