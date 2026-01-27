/**
 * AI Configuration
 *
 * Centralized configuration for all AI providers and models
 * Uses environment variables for API keys and model selection
 */

import type { AIProviderConfig } from '../services/ai/ai-provider.types';

/**
 * Default model configurations for each provider
 */
const DEFAULT_MODELS = {
  anthropic: 'claude-3-5-sonnet-20241022',
  openai: 'gpt-4o',
  google: 'gemini-2.0-flash-exp',
} as const;

/**
 * Default base URLs for each provider
 */
const DEFAULT_BASE_URLS = {
  anthropic: 'https://api.anthropic.com',
  openai: 'https://api.openai.com/v1',
  google: 'https://generativelanguage.googleapis.com',
} as const;

/**
 * Get AI configuration from environment variables
 * Returns a config compatible with AIProviderConfig
 */
export function getAIConfig(): AIProviderConfig {
  // Read provider from environment
  const provider = (process.env.AI_PROVIDER || 'anthropic') as AIProviderConfig['type'];

  // Select appropriate API key based on provider
  let apiKey = '';
  switch (provider) {
    case 'anthropic':
      // Check if using 智谱AI (bigmodel) endpoint, use 智谱AI key if available
      if (process.env.AI_BASE_URL?.includes('bigmodel')) {
        apiKey = process.env.ZHIPU_API_KEY || process.env.ANTHROPIC_API_KEY || '';
      } else {
        apiKey = process.env.ANTHROPIC_API_KEY || '';
      }
      break;
    case 'openai':
      // Check if using 智谱AI (bigmodel) endpoint, use 智谱AI key if available
      if (process.env.AI_BASE_URL?.includes('bigmodel')) {
        apiKey = process.env.ZHIPU_API_KEY || process.env.OPENAI_API_KEY || '';
      } else {
        apiKey = process.env.OPENAI_API_KEY || '';
      }
      break;
    case 'google':
      apiKey = process.env.GOOGLE_API_KEY || '';
      break;
  }

  // Validate API key
  if (!apiKey) {
    throw new Error(
      `AI API key for provider '${provider}' not configured. ` +
      `Please set ${provider.toUpperCase()}_API_KEY in your .env file.`
    );
  }

  // Get base URL from environment or use default
  const envBaseUrl = process.env.AI_BASE_URL;
  const baseURL = envBaseUrl || DEFAULT_BASE_URLS[provider];

  // Debug logging
  let apiKeySource = `${provider.toUpperCase()}_API_KEY`;
  if (process.env.AI_BASE_URL?.includes('bigmodel')) {
    apiKeySource = process.env.ZHIPU_API_KEY ? 'ZHIPU_API_KEY' : `${provider.toUpperCase()}_API_KEY`;
  }

  console.log('[AI Config] Environment variables:', {
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_MODEL: process.env.AI_MODEL,
    AI_BASE_URL: process.env.AI_BASE_URL,
    envBaseUrl,
    finalBaseURL: baseURL,
    DEFAULT_BASE_URLS: DEFAULT_BASE_URLS[provider],
    apiKeySource,
    apiKeyLength: apiKey.length,
  });

  // Get model from environment or use default
  const envModel = process.env.AI_MODEL;
  const model = envModel || DEFAULT_MODELS[provider];

  return {
    type: provider,
    apiKey,
    model,
    baseURL,
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4096', 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    timeout: parseInt(process.env.AI_TIMEOUT || '60000', 10),
    retryAttempts: parseInt(process.env.AI_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.AI_RETRY_DELAY || '1000', 10),
  };
}

/**
 * Get AI configuration for a specific session type
 * Overrides default settings based on agent type
 */
export function getSessionAIConfig(agentType: 'build' | 'plan' | 'general'): AIProviderConfig {
  const baseConfig = getAIConfig();

  // Override settings based on agent type
  switch (agentType) {
    case 'build':
      return {
        ...baseConfig,
        temperature: 0.3, // Lower temperature for code generation
        maxTokens: 8192,   // Higher token limit for code
      };

    case 'plan':
      return {
        ...baseConfig,
        temperature: 0.5, // Medium temperature for planning
        maxTokens: 4096,
      };

    case 'general':
    default:
      return {
        ...baseConfig,
        temperature: 0.7, // Higher temperature for creative responses
        maxTokens: 4096,
      };
  }
}

/**
 * Validate AI configuration
 */
export function validateAIConfig(config: AIProviderConfig): void {
  if (!config.apiKey) {
    throw new Error('AI API key is required');
  }

  if (!config.model) {
    throw new Error('AI model is required');
  }

  if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
    throw new Error('Temperature must be between 0 and 2');
  }

  if (config.maxTokens !== undefined && config.maxTokens < 1) {
    throw new Error('Max tokens must be greater than 0');
  }
}

/**
 * Note: Do not export singleton instance as it will execute
 * before .env is loaded. Always use getAIConfig() or getSessionAIConfig()
 * to get fresh configuration with current environment variables.
 */
