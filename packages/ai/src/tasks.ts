import { generateText } from './router'
import { generatePollinationsImage } from './providers/pollinations'

export async function moderateContent(message: string, context?: string): Promise<{ isToxic: boolean, score: number, reason?: string }> {
  const prompt = `Analyze the following message for toxicity, hate speech, severe profanity, or harassment.
Message: "${message}"
Context: "${context || 'none'}"

Respond in strictly JSON format:
{
  "isToxic": boolean,
  "score": number (0 to 1),
  "reason": "string (optional)"
}`

  const response = await generateText({
    prompt,
    systemPrompt: 'You are a strict automated moderation system. Output ONLY JSON.',
    temperature: 0.1
  })

  try {
    return JSON.parse(response.trim().replace(/^```json/, '').replace(/```$/, ''))
  } catch (e) {
    return { isToxic: false, score: 0 }
  }
}

export async function recommendAnime(history: string[], preferences: string[]): Promise<string[]> {
  const prompt = `Based on the user's watch history: [${history.join(', ')}]
And preferences: [${preferences.join(', ')}]
Recommend 5 anime titles they might enjoy.
Respond strictly with a JSON array of strings.`

  const response = await generateText({
    prompt,
    systemPrompt: 'You are an anime recommendation engine. Output ONLY a JSON array of strings.',
    temperature: 0.5
  })

  try {
    return JSON.parse(response.trim().replace(/^```json/, '').replace(/```$/, ''))
  } catch (e) {
    return []
  }
}

export async function generateRoomName(animeTitle: string, episode?: number, mood?: string): Promise<string> {
  const prompt = `Generate a catchy, short (max 4 words) watch party room name for:
Anime: ${animeTitle}
Episode: ${episode || 'Any'}
Mood: ${mood || 'Hype'}

Respond with JUST the room name, no quotes, no explanation.`

  const response = await generateText({
    prompt,
    systemPrompt: 'You are a creative room name generator.',
    temperature: 0.8
  })

  return response.trim()
}

export async function summarizeEpisode(animeTitle: string, episode: number): Promise<string> {
  const prompt = `Provide a very brief (2 sentences) spoiler-free synopsis of episode ${episode} for the anime "${animeTitle}".`
  
  const response = await generateText({
    prompt,
    systemPrompt: 'You are an anime synopsis writer. Be concise and avoid major spoilers.',
    temperature: 0.3
  })

  return response.trim()
}

export async function checkCompatibility(user1History: string[], user2History: string[]): Promise<{ score: number, message: string }> {
  const prompt = `User 1 history: [${user1History.join(', ')}]
User 2 history: [${user2History.join(', ')}]

Calculate a compatibility score from 0 to 100 based on their shared taste in anime, and write a 1-sentence fun message about it.
Respond in strictly JSON format:
{ "score": number, "message": "string" }`

  const response = await generateText({
    prompt,
    systemPrompt: 'You are a matchmaking engine for anime fans. Output ONLY JSON.',
    temperature: 0.5
  })

  try {
    return JSON.parse(response.trim().replace(/^```json/, '').replace(/```$/, ''))
  } catch (e) {
    return { score: 50, message: "You both like anime!" }
  }
}

export async function generateIcebreaker(animeTitle: string): Promise<string> {
  const prompt = `Generate a fun, engaging icebreaker question for a watch party watching "${animeTitle}". It should spark discussion.
Respond with JUST the question.`

  const response = await generateText({
    prompt,
    systemPrompt: 'You are a party host.',
    temperature: 0.8
  })

  return response.trim()
}

export function generateImage(prompt: string, style?: string): string {
  const finalPrompt = style ? \`\${prompt} in \${style} style\` : prompt
  return generatePollinationsImage(finalPrompt)
}
