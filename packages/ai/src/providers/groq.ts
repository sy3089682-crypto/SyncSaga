export interface GenerateGroqTextParams {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
}

export interface TranscribeGroqAudioParams {
  audio: Blob;
  fileName?: string;
  language?: string;
  prompt?: string;
  temperature?: number;
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIChatRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
}

interface OpenAIChatResponse {
  id?: string;
  choices?: {
    index?: number;
    message?: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }[];
  error?: {
    message?: string;
    type?: string;
    code?: string | number;
  };
}

interface OpenAIAudioResponse {
  text?: string;
  error?: {
    message?: string;
    type?: string;
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateGroqText({
  prompt,
  systemPrompt,
  temperature,
}: GenerateGroqTextParams): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set');
  }

  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const messages: OpenAIMessage[] = [];
  if (systemPrompt !== undefined) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const requestBody: OpenAIChatRequest = {
    model: 'llama-3.3-70b-versatile',
    messages,
  };

  if (temperature !== undefined) {
    requestBody.temperature = temperature;
  }

  const backoffs = [500, 1000, 2000];
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= backoffs.length; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as OpenAIChatResponse;
        const errorMessage = errorData.error?.message ?? response.statusText;

        if (response.status === 429) {
          throw new Error(`Quota exceeded or rate limited: ${errorMessage}`);
        }

        throw new Error(`Groq API error (${response.status}): ${errorMessage}`);
      }

      const data = (await response.json()) as OpenAIChatResponse;
      const text = data.choices?.[0]?.message?.content;

      if (typeof text !== 'string') {
        throw new Error('Invalid response format from Groq API: Missing text content');
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

export async function transcribeGroqAudio({
  audio,
  fileName = 'audio.mp3',
  language,
  prompt,
  temperature,
}: TranscribeGroqAudioParams): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set');
  }

  const url = 'https://api.groq.com/openai/v1/audio/transcriptions';

  const formData = new FormData();
  formData.append('file', audio, fileName);
  formData.append('model', 'whisper-large-v3');

  if (language !== undefined) {
    formData.append('language', language);
  }
  if (prompt !== undefined) {
    formData.append('prompt', prompt);
  }
  if (temperature !== undefined) {
    formData.append('temperature', temperature.toString());
  }
  formData.append('response_format', 'json');

  const backoffs = [500, 1000, 2000];
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= backoffs.length; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as OpenAIAudioResponse;
        const errorMessage = errorData.error?.message ?? response.statusText;

        if (response.status === 429) {
          throw new Error(`Quota exceeded or rate limited: ${errorMessage}`);
        }

        throw new Error(`Groq API error (${response.status}): ${errorMessage}`);
      }

      const data = (await response.json()) as OpenAIAudioResponse;
      const text = data.text;

      if (typeof text !== 'string') {
        throw new Error('Invalid response format from Groq API: Missing text content');
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
