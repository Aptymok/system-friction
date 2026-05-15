import { getWorldSpectrum } from '@/lib/agents/world-spectrum';
import { getCulturalFeeling } from '@/lib/agents/cultural-feeling';

export async function generateDailyPrompt(userGoal: string) {
  const [world, culture] = await Promise.all([getWorldSpectrum(), getCulturalFeeling()]);
  const wsi = world.wsi ?? 0.5;
  const sentiment = culture.sentiment;
  const prompt = `Basado en WSI=${wsi.toFixed(2)} y sentimiento social=${sentiment.toFixed(2)}, 
    genera un plan diario para avanzar hacia: "${userGoal}". 
    Prioriza acciones que reduzcan fricción y aumenten coherencia.`;
  return { prompt, timestamp: new Date().toISOString() };
}