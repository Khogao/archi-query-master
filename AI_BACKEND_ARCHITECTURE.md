# 🤖 AI Backend Architecture - RAG System

## 📋 Table of Contents
1. [RAG Workflow Overview](#rag-workflow-overview)
2. [AI Provider Options](#ai-provider-options)
3. [Architecture Design](#architecture-design)
4. [Implementation Plan](#implementation-plan)
5. [Cost Analysis](#cost-analysis)
6. [Recommendations](#recommendations)

---

## 🔄 RAG Workflow Overview

### What is RAG (Retrieval-Augmented Generation)?

RAG combines **document retrieval** with **AI generation** to answer questions based on your documents.

```
┌─────────────────────────────────────────────────────────────┐
│                     RAG WORKFLOW                            │
└─────────────────────────────────────────────────────────────┘

1. DOCUMENT INGESTION (Offline)
   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
   │ PDF/DOCX │ -> │   OCR    │ -> │ Chunking │ -> │ Embedding│
   └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                           │
                                                           ▼
                                                    ┌──────────┐
                                                    │ Vector DB│
                                                    └──────────┘

2. QUERY PROCESSING (Real-time)
   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
   │User Query│ -> │ Embedding│ -> │  Search  │ -> │ Top-K    │
   └──────────┘    └──────────┘    │ (Cosine) │    │ Chunks   │
                                    └──────────┘    └──────────┘

3. GENERATION (Real-time)
   ┌──────────┐    ┌──────────┐    ┌──────────┐
   │ Context  │ -> │   LLM    │ -> │ Response │
   │ + Query  │    │ (AI Model)│    │          │
   └──────────┘    └──────────┘    └──────────┘
```

### Current Implementation Status:
- ✅ **Step 1**: Document Ingestion (OCR + Chunking + Embedding)
- ✅ **Step 2**: Query Processing (Embedding + Vector Search)
- ❌ **Step 3**: Generation (Need AI Model) ← **YOU ARE HERE**

---

## 🤖 AI Provider Options

### 🏠 **Option 1: Local AI (FREE, Privacy-focused)**

#### 1.1. **Ollama** (⭐ RECOMMENDED for Local)
```
Pros:
✅ Completely free
✅ Privacy - data stays on your machine
✅ Easy installation & management
✅ Support nhiều models: Llama 3, Mistral, Gemma, Qwen
✅ API compatible với OpenAI
✅ Vietnamese support (Qwen, Llama 3)
✅ No internet required after download

Cons:
❌ Requires good GPU/CPU (8GB RAM minimum)
❌ Slower than cloud APIs
❌ Limited model size (3B-13B parameters optimal)

Models:
- llama3.1:8b (Best general, Vietnamese OK)
- qwen2:7b (Best Vietnamese)
- gemma2:9b (Fast, good quality)
- mistral:7b (Good reasoning)

Installation:
1. Download from ollama.com
2. Run: ollama pull llama3.1
3. API endpoint: http://localhost:11434
```

#### 1.2. **LM Studio**
```
Pros:
✅ User-friendly GUI
✅ Model marketplace
✅ OpenAI-compatible API

Cons:
❌ Heavier than Ollama
❌ Limited model selection
```

#### 1.3. **Hugging Face Transformers.js** (Already Using)
```
Pros:
✅ Already integrated in project
✅ Runs in browser (WebGPU)
✅ Good for embeddings

Cons:
❌ Limited for text generation (small models only)
❌ Slow in browser
```

---

### ☁️ **Option 2: Cloud AI (Paid, High-quality)**

#### 2.1. **OpenAI GPT** (⭐ BEST Quality)
```
Models:
- GPT-4o: $2.50/1M input, $10/1M output (Best quality)
- GPT-4o-mini: $0.15/1M input, $0.60/1M output (Good balance)
- GPT-3.5-turbo: $0.50/1M input, $1.50/1M output (Cheapest)

Pros:
✅ Best quality for Vietnamese
✅ Reliable, fast
✅ Great documentation
✅ Streaming support

Cons:
❌ Most expensive
❌ Requires API key ($5 minimum)
❌ Data sent to OpenAI servers

Usage Estimate:
- 1000 queries/month: ~$2-5
- 10,000 queries/month: ~$20-50
```

#### 2.2. **Google Gemini** (⭐ BEST Free Tier)
```
Models:
- Gemini 1.5 Flash: FREE (15 RPM, 1M TPM)
- Gemini 1.5 Pro: FREE (2 RPM, 32K TPM)
- Paid: $0.075/1M input, $0.30/1M output

Pros:
✅ FREE tier generous (60 requests/minute)
✅ Excellent Vietnamese support
✅ Fast response
✅ Long context (2M tokens)
✅ Good for RAG

Cons:
❌ Rate limits on free tier
❌ Newer, less documentation than OpenAI

Usage Estimate:
- Free tier: ~900 queries/month
- Paid: ~$1-3/1000 queries
```

#### 2.3. **Anthropic Claude** (⭐ BEST Reasoning)
```
Models:
- Claude 3.5 Sonnet: $3/1M input, $15/1M output
- Claude 3 Haiku: $0.25/1M input, $1.25/1M output

Pros:
✅ Best reasoning & analysis
✅ Safety-focused
✅ Good Vietnamese
✅ Large context (200K tokens)

Cons:
❌ No free tier
❌ More expensive than others
❌ Waitlist for API access
```

#### 2.4. **Groq** (⭐ FASTEST)
```
Models:
- Llama 3.1 70B: FREE (30 RPM)
- Mixtral 8x7B: FREE (30 RPM)

Pros:
✅ EXTREMELY fast (800 tokens/sec)
✅ FREE tier very generous
✅ Open-source models
✅ Good quality

Cons:
❌ Vietnamese not as good as GPT/Gemini
❌ Rate limits
```

---

## 🏗️ Architecture Design

### Multi-Provider Architecture

```typescript
┌─────────────────────────────────────────────────────────┐
│                   Frontend (React)                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │            AI Provider Manager                    │  │
│  │  - Provider selection                            │  │
│  │  - API key management                            │  │
│  │  - Fallback logic                                │  │
│  └──────────────────────────────────────────────────┘  │
│                          │                               │
│         ┌────────────────┼────────────────┐             │
│         ▼                ▼                ▼             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐         │
│  │  OpenAI  │    │  Gemini  │    │  Ollama  │         │
│  │ Provider │    │ Provider │    │ Provider │         │
│  └──────────┘    └──────────┘    └──────────┘         │
│         │                │                │             │
│         └────────────────┼────────────────┘             │
│                          ▼                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │         RAG Query Engine                         │  │
│  │  1. Embed query                                  │  │
│  │  2. Search vector DB                             │  │
│  │  3. Retrieve top-K chunks                        │  │
│  │  4. Build context prompt                         │  │
│  │  5. Call AI provider                             │  │
│  │  6. Stream response                              │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### File Structure

```
src/
├── services/
│   └── ai/
│       ├── providers/
│       │   ├── base.ts           # Abstract provider interface
│       │   ├── openai.ts         # OpenAI implementation
│       │   ├── gemini.ts         # Google Gemini implementation
│       │   ├── ollama.ts         # Ollama implementation
│       │   ├── anthropic.ts      # Claude implementation
│       │   └── groq.ts           # Groq implementation
│       ├── ragEngine.ts          # RAG query engine
│       ├── providerManager.ts   # Provider selection & fallback
│       └── types.ts              # TypeScript types
├── hooks/
│   └── useAIChat.ts              # React hook for AI chat
└── components/
    └── AIProviderSettings.tsx    # UI for provider selection
```

---

## 📝 Implementation Plan

### Phase 1: Core Infrastructure (Day 1)
```
✅ Create AI provider interface
✅ Implement OpenAI provider
✅ Implement Gemini provider
✅ Implement Ollama provider
✅ Create RAG query engine
✅ Add environment variables
```

### Phase 2: Integration (Day 2)
```
✅ Create useAIChat hook
✅ Integrate with existing vector search
✅ Add provider selection UI
✅ Add API key management
✅ Add streaming support
```

### Phase 3: Testing & Polish (Day 3)
```
✅ Test all providers
✅ Add error handling
✅ Add retry logic
✅ Add cost tracking
✅ Add response caching
✅ Add fallback mechanism
```

---

## 💰 Cost Analysis

### Scenario: 1000 queries/month, avg 500 tokens input + 200 tokens output

| Provider | Model | Cost/1000 queries | Free Tier | Speed | Quality |
|----------|-------|------------------|-----------|-------|---------|
| **Ollama** | llama3.1:8b | **$0** | Unlimited | Slow (5-10s) | Good |
| **Gemini** | 1.5 Flash | **$0** (free tier) | 900/month | Fast (1-2s) | Excellent |
| **OpenAI** | GPT-4o-mini | $1.50 | No | Fast (1-2s) | Excellent |
| **OpenAI** | GPT-4o | $15 | No | Medium (2-4s) | Best |
| **Groq** | Llama 3.1 70B | **$0** (free tier) | 900/month | Fastest (0.5s) | Good |
| **Anthropic** | Haiku | $2 | No | Fast (1-2s) | Very Good |

### Cost Projection (1 year, 10K queries/month)

```
Low Usage (1K/month):
- Ollama: $0 ✅
- Gemini Free: $0 ✅
- Groq Free: $0 ✅
- OpenAI GPT-4o-mini: $18/year
- OpenAI GPT-4o: $180/year

Medium Usage (10K/month):
- Ollama: $0 ✅
- Gemini Paid: $12/year
- Groq: Need paid plan
- OpenAI GPT-4o-mini: $180/year
- OpenAI GPT-4o: $1,800/year

High Usage (100K/month):
- Ollama: $0 ✅ (if hardware sufficient)
- Gemini Paid: $120/year
- OpenAI GPT-4o-mini: $1,800/year
- OpenAI GPT-4o: $18,000/year
```

---

## ⭐ Recommendations

### **For Development (Learning Phase)**
```
1. Start with: Gemini 1.5 Flash (FREE)
   ✅ No cost
   ✅ Great quality
   ✅ Fast
   ✅ Easy setup

2. Backup: Ollama llama3.1:8b (LOCAL)
   ✅ Privacy
   ✅ Offline capability
   ✅ No API limits
```

### **For Production (Small Scale)**
```
1. Primary: Gemini 1.5 Flash (FREE tier)
2. Fallback: Ollama (LOCAL)
3. Premium: OpenAI GPT-4o-mini (if budget allows)

Strategy:
- Free tier users → Gemini/Ollama
- Paid users → OpenAI GPT-4o-mini
- Enterprise → OpenAI GPT-4o
```

### **For Production (Large Scale)**
```
1. Primary: OpenAI GPT-4o-mini ($180/10K queries)
2. Fallback: Gemini 1.5 Flash (Paid tier)
3. Local: Ollama for offline/privacy-sensitive users

Strategy:
- Load balance between providers
- Cache common queries
- Use cheaper models for simple questions
- Use GPT-4o only for complex reasoning
```

---

## 🔧 Technical Implementation

### Environment Variables (.env)

```bash
# OpenAI
VITE_OPENAI_API_KEY=sk-proj-xxx
VITE_OPENAI_MODEL=gpt-4o-mini

# Google Gemini
VITE_GEMINI_API_KEY=AIzaSyxxx
VITE_GEMINI_MODEL=gemini-1.5-flash-latest

# Anthropic Claude
VITE_ANTHROPIC_API_KEY=sk-ant-xxx
VITE_ANTHROPIC_MODEL=claude-3-haiku-20240307

# Groq
VITE_GROQ_API_KEY=gsk_xxx
VITE_GROQ_MODEL=llama-3.1-70b-versatile

# Ollama (Local)
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_OLLAMA_MODEL=llama3.1

# Default Provider
VITE_DEFAULT_AI_PROVIDER=gemini  # gemini | openai | ollama | anthropic | groq
```

### API Keys - How to Get

```bash
1. OpenAI:
   - Visit: https://platform.openai.com/api-keys
   - Sign up (need credit card)
   - Minimum $5 deposit
   - Get API key

2. Google Gemini:
   - Visit: https://aistudio.google.com/app/apikey
   - Sign in with Google account
   - Click "Get API Key"
   - FREE (no credit card required) ✅

3. Anthropic:
   - Visit: https://console.anthropic.com/
   - Sign up (waitlist)
   - Request API access

4. Groq:
   - Visit: https://console.groq.com/
   - Sign up (free)
   - Get API key
   - FREE tier available ✅

5. Ollama:
   - Download: https://ollama.com/download
   - Install locally
   - Run: ollama pull llama3.1
   - No API key needed ✅
```

---

## 🚀 Quick Start Guide

### Step 1: Install Ollama (Local AI)
```bash
# Windows/Mac/Linux
1. Download from https://ollama.com/download
2. Install
3. Open terminal:
   ollama pull llama3.1
   ollama serve

# Test
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.1",
  "prompt": "Hello!"
}'
```

### Step 2: Get Gemini API Key (FREE)
```bash
1. Visit https://aistudio.google.com/app/apikey
2. Click "Get API Key"
3. Copy key
4. Add to .env:
   VITE_GEMINI_API_KEY=your_key_here
```

### Step 3: Install Dependencies
```bash
npm install openai @google/generative-ai @anthropic-ai/sdk
```

### Step 4: Run Project
```bash
npm run dev
```

---

## 🎯 Next Steps

I will now implement:

1. ✅ **Base provider interface** - Abstract class for all providers
2. ✅ **OpenAI provider** - GPT-4o-mini implementation
3. ✅ **Gemini provider** - Gemini 1.5 Flash implementation
4. ✅ **Ollama provider** - Local llama3.1 implementation
5. ✅ **RAG engine** - Query processing & context building
6. ✅ **Provider manager** - Selection & fallback logic
7. ✅ **React hook** - useAIChat for easy integration
8. ✅ **UI components** - Settings panel for provider selection

---

## 📚 Additional Resources

- Ollama: https://ollama.com/
- Gemini API: https://ai.google.dev/
- OpenAI API: https://platform.openai.com/docs/
- RAG Tutorial: https://www.pinecone.io/learn/retrieval-augmented-generation/

---

**Ready to implement! 🚀**

See `AI_PROVIDER_IMPLEMENTATION.md` for detailed code implementation.
