# AI Backend Implementation

## Overview

This document describes the implementation of the AI backend for the Archi Query system. The backend supports multiple AI providers with fallback logic and provides a complete RAG (Retrieval-Augmented Generation) workflow.

## Architecture

The AI backend consists of the following components:

1. **Base AI Provider** - Abstract class defining the interface for all AI providers
2. **Provider Implementations** - Concrete implementations for OpenAI, Google Gemini, and Ollama
3. **RAG Engine** - Orchestrates the complete RAG workflow
4. **Provider Manager** - Manages multiple providers with fallback logic
5. **React Hook** - Provides easy access to AI functionality in React components
6. **AI Chat Component** - UI component for interacting with the AI system

## Provider Implementations

### OpenAI Provider
- Supports GPT-4o, GPT-4o-mini, GPT-3.5-turbo
- Requires API key from OpenAI platform
- Best quality for Vietnamese language processing

### Google Gemini Provider
- Supports Gemini 1.5 Flash, Gemini 1.5 Pro
- FREE tier available (15 requests/minute)
- Excellent Vietnamese language support

### Ollama Provider
- Local AI models (Llama 3.1, Qwen 2, Gemma 2, Mistral, etc.)
- Completely FREE and privacy-focused
- Runs locally without internet connection

## RAG Workflow

The RAG engine implements the following workflow:

1. **Query Embedding** - Generate embedding for the user query
2. **Vector Search** - Search for similar chunks in the vector database
3. **Context Building** - Build context from retrieved chunks
4. **AI Generation** - Generate response using the selected AI provider
5. **Streaming Support** - Optional streaming of responses

## Provider Manager

The provider manager provides:

- Registration of multiple AI providers
- Fallback logic when providers fail
- Health checking of providers
- Configuration management

## React Integration

The system provides:

- `useAIManager` hook for easy access to AI functionality
- `AIChat` component for chat interface
- Provider selection UI
- Real-time streaming responses

## Configuration

To configure the AI backend, set the following environment variables in your `.env` file:

```bash
# OpenAI (Paid - Best Quality)
VITE_OPENAI_API_KEY=your-openai-api-key
VITE_OPENAI_MODEL=gpt-4o-mini

# Google Gemini (FREE Tier Available)
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_GEMINI_MODEL=gemini-1.5-flash-latest

# Ollama (Local - FREE)
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_OLLAMA_MODEL=llama3.1

# Default Provider
VITE_DEFAULT_AI_PROVIDER=gemini
```

## Usage

1. **Install Ollama** (for local AI):
   ```bash
   # Download from https://ollama.com/download
   # Pull a model:
   ollama pull llama3.1
   ```

2. **Get API Keys**:
   - OpenAI: https://platform.openai.com/api-keys
   - Google Gemini: https://aistudio.google.com/app/apikey

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your API keys

4. **Run the Application**:
   ```bash
   npm run dev
   ```

## Fallback Logic

The system automatically falls back to alternative providers when one fails:
1. Primary provider (configured as default)
2. Gemini (if available)
3. OpenAI (if available)
4. Ollama (if running)

## Performance Monitoring

The system includes performance monitoring for:
- Query embedding generation
- Vector search
- AI generation
- Total query processing time

## Error Handling

The system provides comprehensive error handling for:
- Authentication errors
- Rate limiting
- Network connectivity issues
- Provider unavailability