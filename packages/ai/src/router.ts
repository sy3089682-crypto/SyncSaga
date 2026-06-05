import { generateCloudflareText } from './providers/cloudflare'
import { generateGroqText } from './providers/groq'
import { generateGeminiText } from './providers/gemini'

export interface AIProviderOptions {
  prompt: string
  systemPrompt?: string
  temperature?: number
}

/**
 * Smart router that attempts Cloudflare -> Groq -> Gemini.
 */
export async function generateText(options: AIProviderOptions): Promise<string> {
  let lastError: Error | unknown

  try {
    if (process.env.CLOUDFLARE_API_KEY && process.env.CLOUDFLARE_ACCOUNT_ID) {
      return await generateCloudflareText(options)
    }
  } catch (e) {
    console.warn('[AI Router] Cloudflare failed, falling back to Groq', e)
    lastError = e
  }

  try {
    if (process.env.GROQ_API_KEY) {
      return await generateGroqText(options)
    }
  } catch (e) {
    console.warn('[AI Router] Groq failed, falling back to Gemini', e)
    lastError = e
  }

  try {
    if (process.env.GEMINI_API_KEY) {
      return await generateGeminiText(options)
    }
  } catch (e) {
    console.error('[AI Router] Gemini failed. All providers exhausted.', e)
    lastError = e
  }

  throw new Error(`AI generation failed. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
}
