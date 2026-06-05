export interface GenerateCloudflareTextOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
}

interface CloudflareApiResponse {
  success: boolean;
  result?: {
    response?: string;
  };
  errors?: Array<{ code: number; message: string }>;
}

/**
 * Generates text using Cloudflare's AI REST API.
 * Uses the @cf/meta/llama-3.1-8b-instruct model.
 *
 * @param options - Generation parameters including prompt, optional systemPrompt, and temperature.
 * @returns The generated text response.
 */
export async function generateCloudflareText(
  options: GenerateCloudflareTextOptions
): Promise<string> {
  const { prompt, systemPrompt, temperature } = options;

  const apiKey = process.env.CLOUDFLARE_API_KEY;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!apiKey || !accountId) {
    throw new Error(
      "Missing Cloudflare API credentials. Please set CLOUDFLARE_API_KEY and CLOUDFLARE_ACCOUNT_ID."
    );
  }

  const model = "@cf/meta/llama-3.1-8b-instruct";
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const payload = {
    messages,
    // Use the provided temperature or default to a reasonable fallback
    ...(temperature !== undefined && { temperature }),
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HTTP ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = (await response.json()) as CloudflareApiResponse;

    if (!data.success) {
      const errorDetails = data.errors
        ?.map((err) => `[${err.code}] ${err.message}`)
        .join(", ");
      throw new Error(`API reported failure: ${errorDetails || "Unknown"}`);
    }

    if (!data.result || typeof data.result.response !== "string") {
      throw new Error("Invalid response format from Cloudflare API");
    }

    return data.result.response;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Cloudflare AI generation failed: ${error.message}`);
    }
    throw new Error("Cloudflare AI generation failed due to an unknown error.");
  }
}
