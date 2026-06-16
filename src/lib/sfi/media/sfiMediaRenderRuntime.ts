import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { renderHuggingFaceImage } from '@/lib/sfi/media/providers/huggingfaceImageProvider';
import { renderHuggingFaceVideo } from '@/lib/sfi/media/providers/huggingfaceVideoProvider';
import { renderGoogleVideo } from '@/lib/sfi/media/providers/googleVideoProvider';

type JsonRecord = Record<string, any>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' ? value as JsonRecord : {};
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function safeSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'sfi-media';
}

function xml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function publicUrl(file: string): string {
  return `/generated/sfi/${file}`;
}

function videoProviderOrder(setting: string) {
  if (setting === 'auto' || setting === 'huggingface') return ['huggingface', 'google', 'local'];
  if (setting === 'google') return ['google', 'huggingface', 'local'];
  if (setting === 'local') return ['local'];
  const parsed = setting.split(',').map((item) => item.trim()).filter(Boolean);
  return parsed.length ? parsed : ['local'];
}

async function writeTextFile(filePath: string, content: string) {
  await fs.writeFile(filePath, content, 'utf8');
}

async function writeWav(filePath: string, seconds = 8) {
  const sampleRate = 44100;
  const channels = 1;
  const bitsPerSample = 16;
  const samples = sampleRate * seconds;
  const dataSize = samples * channels * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28);
  buffer.writeUInt16LE(channels * bitsPerSample / 8, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, t / 1.2) * Math.min(1, (seconds - t) / 1.5);
    const carrier = Math.sin(2 * Math.PI * 82.41 * t);
    const pulse = Math.sin(2 * Math.PI * 2.2 * t) > 0 ? 0.55 : 0.25;
    const value = Math.round(carrier * pulse * envelope * 16000);
    buffer.writeInt16LE(value, 44 + i * 2);
  }

  await fs.writeFile(filePath, buffer);
}

async function renderVideoIfPossible(filePath: string) {
  const probe = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  if (probe.error || probe.status !== 0) {
    return {
      rendered: false,
      provider_used: 'local_ffmpeg',
      reason: 'ffmpeg_not_available',
      install_hint: 'Agregar ffmpeg.exe al PATH.',
    };
  }

  const args = [
    '-y',
    '-f', 'lavfi',
    '-i', 'color=c=black:s=1080x1920:d=12',
    '-f', 'lavfi',
    '-i', 'sine=frequency=82.41:duration=12',
    '-vf',
    "drawtext=text='SYSTEM FRICTION INSTITUTE':fontcolor=white:fontsize=52:x=(w-text_w)/2:y=760,drawtext=text='MEDIA RENDER ENGINE':fontcolor=0xD6B46A:fontsize=36:x=(w-text_w)/2:y=840,drawtext=text='OBSERVATION TO MATERIAL':fontcolor=white@0.7:fontsize=30:x=(w-text_w)/2:y=920",
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-pix_fmt', 'yuv420p',
    '-shortest',
    filePath,
  ];

  const result = spawnSync('ffmpeg', args, { encoding: 'utf8' });

  if (result.error || result.status !== 0) {
    return {
      rendered: false,
      provider_used: 'local_ffmpeg',
      reason: 'ffmpeg_render_failed',
      details: result.stderr || result.error?.message || 'unknown',
    };
  }

  return {
    rendered: true,
    provider_used: 'local_ffmpeg',
    reason: null,
  };
}

async function writeLocalSvg(svgPath: string, params: {
  title: string;
  caseId: string;
  regime: string;
  objective: string;
}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <rect width="1600" height="900" fill="#000000"/>
  <g opacity="0.22" stroke="#ffffff" stroke-width="1">
    <line x1="160" y1="160" x2="1440" y2="740"/>
    <line x1="160" y1="740" x2="1440" y2="160"/>
    <line x1="800" y1="100" x2="800" y2="800"/>
  </g>
  <circle cx="800" cy="450" r="118" fill="none" stroke="#d6b46a" stroke-width="3"/>
  <circle cx="800" cy="450" r="8" fill="#d6b46a"/>
  <circle cx="520" cy="310" r="6" fill="#ffffff"/>
  <circle cx="1090" cy="610" r="6" fill="#ffffff"/>
  <circle cx="1040" cy="260" r="4" fill="#ffffff" opacity="0.55"/>
  <circle cx="420" cy="620" r="4" fill="#ffffff" opacity="0.55"/>
  <text x="120" y="110" fill="#d6b46a" font-size="24" font-family="Arial, sans-serif" letter-spacing="8">SYSTEM FRICTION INSTITUTE</text>
  <text x="120" y="735" fill="#ffffff" font-size="44" font-family="Arial, sans-serif">${xml(params.title)}</text>
  <text x="120" y="790" fill="#ffffff" opacity="0.62" font-size="24" font-family="Arial, sans-serif">case_id: ${xml(params.caseId)} · regime: ${xml(params.regime)} · objective: ${xml(params.objective)}</text>
</svg>`;

  await writeTextFile(svgPath, svg);
}

export async function buildSfiMediaRenderRuntime(input: JsonRecord = {}) {
  const root = process.cwd();
  const outputDir = path.join(root, 'public', 'generated', 'sfi');
  await fs.mkdir(outputDir, { recursive: true });

  const pipeline = asRecord(input.pipeline ?? input.result ?? input);
  const request = asRecord(input.request);
  const material = asRecord(pipeline.material);
  const proposal = asRecord(pipeline.proposal);
  const contrast = asRecord(pipeline.contrast);
  const atlas = asRecord(pipeline.atlasMemory?.memory ?? pipeline.atlasMemory);

  const provider = asString(input.provider ?? request.provider ?? process.env.IMAGE_PROVIDER ?? process.env.SFI_MEDIA_PROVIDER, 'local');
  const title = asString(material.title ?? proposal.title ?? request.text, 'SFI Generated Media');
  const caseId = asString(input.case_id ?? contrast.case_id ?? atlas.case_id ?? request.case_id, 'SFI-OP-001');
  const regime = asString(contrast.mihm_regime, 'unknown');
  const objective = asString(proposal.objective, 'institutional_traceability');

  const prompt = asString(
    input.prompt ?? material.video_prompt ?? material.video_shotlist ?? material.image_prompt,
    `System Friction Institute black field, thin white node lines, restrained gold focal node, institutional observatory interface, ${title}, no decorative excess`
  );

  const id = `media-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const slug = safeSlug(`${caseId}-${title}`);
  const base = `${slug}-${id}`;

  const localSvgFile = `${base}.svg`;
  const wavFile = `${base}.wav`;
  const jsonFile = `${base}.json`;
  const mdFile = `${base}.md`;
  const mp4File = `${base}.mp4`;

  const localSvgPath = path.join(outputDir, localSvgFile);
  const wavPath = path.join(outputDir, wavFile);
  const jsonPath = path.join(outputDir, jsonFile);
  const mdPath = path.join(outputDir, mdFile);
  const mp4Path = path.join(outputDir, mp4File);

  let imageFile = localSvgFile;
  let imageUrl = publicUrl(localSvgFile);
  let imageType = 'svg';
  let providerUsed = 'local_svg';
  let fallbackUsed = false;
  const warnings: string[] = [];

  // Generar imagen
  if (provider === 'huggingface' || provider === 'auto') {
    const hf = await renderHuggingFaceImage({
      prompt,
      outputBasePath: path.join(outputDir, base),
    });

    if (hf.ok && hf.file_path) {
      imageFile = path.basename(hf.file_path);
      imageUrl = publicUrl(imageFile);
      imageType = path.extname(hf.file_path).replace('.', '') || 'png';
      providerUsed = 'huggingface';
    } else {
      fallbackUsed = true;
      warnings.push(`huggingface_image_unavailable: ${hf.error ?? 'unknown'}`);
      await writeLocalSvg(localSvgPath, { title, caseId, regime, objective });
    }
  } else {
    await writeLocalSvg(localSvgPath, { title, caseId, regime, objective });
  }

  // Generar video
  let videoFile = mp4File;
  let videoUrl = publicUrl(mp4File);
  let videoRendered = false;
  let videoProviderUsed = 'none';
  let videoProviderKeyUsed = 'none';
  let videoProviderModel: string | null = null;
  const videoWarnings: string[] = [];

  const videoProviderSetting = asString(input.video_provider ?? request.video_provider ?? process.env.VIDEO_PROVIDER ?? process.env.SFI_VIDEO_PROVIDER ?? (provider === 'auto' ? 'auto' : 'local'), 'local');
  const providerOrder = videoProviderOrder(videoProviderSetting);

  for (const nextProvider of providerOrder) {
    if (videoRendered) break;

    if (nextProvider === 'huggingface') {
      const hfVideo = await renderHuggingFaceVideo({
        prompt,
        outputBasePath: path.join(outputDir, base),
      });
      if (hfVideo.ok && hfVideo.file_path) {
        videoFile = path.basename(hfVideo.file_path);
        videoUrl = publicUrl(videoFile);
        videoRendered = true;
        videoProviderUsed = hfVideo.provider_used ?? 'huggingface';
        videoProviderKeyUsed = 'huggingface';
        videoProviderModel = hfVideo.model ?? null;
      } else {
        videoWarnings.push(`huggingface_video_failed: ${hfVideo.error ?? 'unknown'}`);
      }
      continue;
    }

    if (nextProvider === 'google') {
      const googleVideo = await renderGoogleVideo({
        prompt,
        outputBasePath: path.join(outputDir, base),
      });
      if (googleVideo.ok && googleVideo.file_path) {
        videoFile = path.basename(googleVideo.file_path);
        videoUrl = publicUrl(videoFile);
        videoRendered = true;
        videoProviderUsed = googleVideo.provider_used ?? 'google:veo';
        videoProviderKeyUsed = 'google';
        videoProviderModel = googleVideo.model ?? null;
      } else {
        videoWarnings.push(`google_video_failed: ${googleVideo.error ?? 'unknown'}`);
      }
      continue;
    }

    if (nextProvider === 'local') {
      const videoResult = await renderVideoIfPossible(mp4Path);
      if (videoResult.rendered) {
        videoRendered = true;
        videoProviderUsed = videoResult.provider_used;
        videoProviderKeyUsed = 'local';
      } else {
        videoWarnings.push(`video_render_failed: ${videoResult.reason || 'unknown'}`);
      }
    }
  }

  const markdown = `# ${title}

case_id: ${caseId}

MIHM regime: ${regime}

Objective: ${objective}

Provider used: ${providerUsed}

## Material

${asString(material.body ?? material.report ?? material.atlas_block, 'Sin material textual disponible.')}

## Multimedia

- image: ${imageUrl}
- audio: ${publicUrl(wavFile)}
- video: ${videoRendered ? videoUrl : 'no generado'}
`;

  const payload = {
    media_id: id,
    status: 'rendered',
    case_id: caseId,
    title,
    objective,
    regime,
    provider_requested: provider,
    provider_used: providerUsed,
    fallback_used: fallbackUsed,
    warnings,
    created_at: new Date().toISOString(),
    assets: {
      image: { type: imageType, file: imageFile, url: imageUrl },
      audio: { type: 'wav', file: wavFile, url: publicUrl(wavFile), provider_used: 'local_wav' },
      video: {
        type: 'mp4',
        file: videoFile,
        url: videoRendered ? videoUrl : null,
        rendered: videoRendered,
        provider_used: videoProviderUsed,
        provider_model: videoProviderModel,
        fallback_used: videoRendered && videoProviderKeyUsed !== providerOrder[0],
        warnings: videoWarnings,
      },
      markdown: { type: 'md', file: mdFile, url: publicUrl(mdFile) },
      json: { type: 'json', file: jsonFile, url: publicUrl(jsonFile) },
    },
    source: {
      proposal_id: proposal.proposal_id ?? null,
      atlas_entry_id: atlas.atlas_entry_id ?? atlas.entry_id ?? null,
      observation_id: contrast.observation_id ?? null,
      vector_id: contrast.vector_id ?? null,
    },
  };

  await writeTextFile(mdPath, markdown);
  await writeWav(wavPath);
  await writeTextFile(jsonPath, JSON.stringify(payload, null, 2));

  return {
    ok: true,
    patch: 'SFI_MEDIA_RENDER_HF_LOCAL',
    media: payload,
    video: {
      rendered: videoRendered,
      provider_used: videoProviderUsed,
      warnings: videoWarnings,
    },
  };
}
