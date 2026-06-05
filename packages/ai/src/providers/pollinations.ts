export interface GeneratePollinationsImageOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
}

/**
 * Generates an image URL using the unofficial Pollinations AI text-to-image generator.
 *
 * @param promptOrOptions - The prompt string or an options object matching the generic interface.
 * @returns The URL of the generated image.
 */
export function generatePollinationsImage(prompt: string): string;
export function generatePollinationsImage(options: GeneratePollinationsImageOptions): string;
export function generatePollinationsImage(
  promptOrOptions: string | GeneratePollinationsImageOptions
): string {
  const prompt =
    typeof promptOrOptions === "string"
      ? promptOrOptions
      : promptOrOptions.prompt;
      
  const encodedPrompt = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encodedPrompt}`;
}
