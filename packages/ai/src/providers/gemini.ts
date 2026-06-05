export interface GenerateGeminiTextParams {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
}

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role?: string;
  parts: GeminiPart[];
}

interface GeminiRequest {
  contents: GeminiContent[];
  systemInstruction?: GeminiContent;
  generationConfig?: {
    temperature?: number;
  };
}

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: {
        text?: string;
      }[];
    };
  }[];
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateGeminiText({
  prompt,
  systemPrompt,
  temperature,
}: GenerateGeminiTextParams): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const requestBody: GeminiRequest = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
  };

  if (systemPrompt !== undefined) {
    requestBody.systemInstruction = {
      parts: [{ text: systemPrompt }],
    };
  }

  if (temperature !== undefined) {
    requestBody.generationConfig = {
      temperature,
    };
  }

  const backoffs = [500, 1000, 2000];
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= backoffs.length; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as GeminiResponse;
        const errorMessage = errorData.error?.message ?? response.statusText;

        if (response.status === 429) {
          throw new Error(`Quota exceeded or rate limited: ${errorMessage}`);
        }

        throw new Error(`Gemini API error (${response.status}): ${errorMessage}`);
      }

      const data = (await response.json()) as GeminiResponse;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (typeof text !== 'string') {
        throw new Error('Invalid response format from Gemini API: Missing text content');
      }

      return text;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < backoffs.length) {
        await sleep(backoffs[attempt]);
        continue;
      }
    }
  }

  throw lastError;
}
