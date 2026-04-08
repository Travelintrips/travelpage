import OpenAI from "openai";

let openaiClient: OpenAI | null = null;

/**
 * Initialize OpenAI client with API key from environment
 */
export const initializeOpenAI = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn("OpenAI API key not found in environment variables");
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // Required for client-side usage
    });
  }

  return openaiClient;
};

/**
 * Get OpenAI client instance
 */
export const getOpenAIClient = () => {
  if (!openaiClient) {
    return initializeOpenAI();
  }
  return openaiClient;
};

/**
 * Chat completion with streaming support
 */
export const createChatCompletion = async (
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  }
) => {
  const client = getOpenAIClient();
  
  if (!client) {
    throw new Error("OpenAI client not initialized");
  }

  const response = await client.chat.completions.create({
    model: options?.model || "gpt-4o-mini",
    messages,
    temperature: options?.temperature || 0.7,
    max_tokens: options?.maxTokens || 1000,
    stream: options?.stream || false,
  });

  return response;
};

/**
 * Create embeddings for text
 */
export const createEmbedding = async (
  text: string,
  model: string = "text-embedding-3-small"
) => {
  const client = getOpenAIClient();
  
  if (!client) {
    throw new Error("OpenAI client not initialized");
  }

  const response = await client.embeddings.create({
    model,
    input: text,
  });

  return response.data[0].embedding;
};

/**
 * Generate text completion
 */
export const generateCompletion = async (
  prompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
) => {
  const messages = [{ role: "user" as const, content: prompt }];
  
  const response = await createChatCompletion(messages, options);
  
  return response.choices[0]?.message?.content || "";
};

/**
 * Stream chat completion
 */
export const streamChatCompletion = async (
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  onChunk: (chunk: string) => void,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
) => {
  const client = getOpenAIClient();
  
  if (!client) {
    throw new Error("OpenAI client not initialized");
  }

  const stream = await client.chat.completions.create({
    model: options?.model || "gpt-4o-mini",
    messages,
    temperature: options?.temperature || 0.7,
    max_tokens: options?.maxTokens || 1000,
    stream: true,
  });

  let fullResponse = "";

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      fullResponse += content;
      onChunk(content);
    }
  }

  return fullResponse;
};
