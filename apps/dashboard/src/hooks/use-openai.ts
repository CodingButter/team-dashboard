'use client'

import { useState, useCallback, useRef } from 'react'
import OpenAI from 'openai'

export interface OpenAIConfig {
  apiKey: string
  model: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-3.5-turbo'
  maxTokens?: number
  temperature?: number
  stream?: boolean
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function'
  content: string
  name?: string
  function_call?: any
}

export interface StreamingResponse {
  content: string
  isComplete: boolean
  isError: boolean
  error?: string
}

export interface UseOpenAIReturn {
  sendMessage: (messages: ChatMessage[], config?: Partial<OpenAIConfig>) => Promise<void>
  sendStreamingMessage: (
    messages: ChatMessage[], 
    onChunk: (chunk: string) => void,
    config?: Partial<OpenAIConfig>
  ) => Promise<void>
  isLoading: boolean
  error: string | null
  clearError: () => void
  abortRequest: () => void
}

export function useOpenAI(defaultConfig: OpenAIConfig): UseOpenAIReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const openaiRef = useRef<OpenAI | null>(null)

  // Initialize OpenAI client
  const getClient = useCallback(() => {
    if (!openaiRef.current) {
      openaiRef.current = new OpenAI({
        apiKey: defaultConfig.apiKey,
        dangerouslyAllowBrowser: true // Required for client-side usage
      })
    }
    return openaiRef.current
  }, [defaultConfig.apiKey])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const abortRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
    }
  }, [])

  const sendMessage = useCallback(async (
    messages: ChatMessage[],
    config?: Partial<OpenAIConfig>
  ): Promise<void> => {
    const client = getClient()
    const finalConfig = { ...defaultConfig, ...config }
    
    setIsLoading(true)
    setError(null)
    
    abortControllerRef.current = new AbortController()

    try {
      const response = await client.chat.completions.create(
        {
          model: finalConfig.model,
          messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
          max_tokens: finalConfig.maxTokens,
          temperature: finalConfig.temperature,
          stream: false
        },
        {
          signal: abortControllerRef.current.signal
        }
      )

      if (response.choices[0]?.message?.content) {
        // Handle non-streaming response
        console.log('OpenAI response:', response.choices[0].message.content)
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Request aborted')
      } else {
        const errorMessage = err.message || 'Unknown error occurred'
        setError(errorMessage)
        console.error('OpenAI API error:', err)
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [defaultConfig, getClient])

  const sendStreamingMessage = useCallback(async (
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    config?: Partial<OpenAIConfig>
  ): Promise<void> => {
    const client = getClient()
    const finalConfig = { ...defaultConfig, ...config }
    
    setIsLoading(true)
    setError(null)
    
    abortControllerRef.current = new AbortController()

    try {
      const stream = await client.chat.completions.create(
        {
          model: finalConfig.model,
          messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
          max_tokens: finalConfig.maxTokens,
          temperature: finalConfig.temperature,
          stream: true
        },
        {
          signal: abortControllerRef.current.signal
        }
      )

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          onChunk(content)
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Streaming request aborted')
      } else {
        const errorMessage = err.message || 'Unknown error occurred'
        setError(errorMessage)
        console.error('OpenAI streaming error:', err)
        onChunk(`\n\n[Error: ${errorMessage}]`)
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [defaultConfig, getClient])

  return {
    sendMessage,
    sendStreamingMessage,
    isLoading,
    error,
    clearError,
    abortRequest
  }
}