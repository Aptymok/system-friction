import { MakerMIHM } from '@/agents/maker-mihm'

export async function generateDailyPrompt(userGoal: string) {
  const promptData = await MakerMIHM.generateDailyPrompt('system', [userGoal])
  const prompt = `${promptData.context} ${promptData.instruction}`
  return { prompt, timestamp: new Date().toISOString() }
}