# Archi Query Master

Archi Query Master là một nền tảng AI RAG (Retrieval-Augmented Generation) định hướng modular giúp:
- Ingest và xử lý tài liệu (PDF → OCR → chunk → embedding).
- Truy vấn ngữ nghĩa qua vector search + top-K contextualization.
- Trừu tượng hóa gọi nhiều nhà cung cấp AI (Gemini, OpenAI, Ollama, Anthropic, Groq…).
- Hướng tới vận hành production: đa provider fallback, tối ưu chi phí, logging, mở rộng, bảo trì.

“Second pass” README này mở rộng chi tiết hơn so với bản đầu: bổ sung biến môi trường thực tế, mô tả kiến trúc RAG, chiến lược cost, provider selection, và cấu trúc mã nguồn dự kiến (từ tài liệu kiến trúc).

## Mục lục
1. Tầm nhìn & Triết lý thiết kế  
2. Kiến trúc RAG tổng quan  
3. Multi-Provider Strategy & Provider Manager  
4. Tính năng chính (Feature Set)  
5. Stack công nghệ chi tiết  
6. Cấu trúc thư mục & Định hướng tổ chức mã nguồn  
7. Biến môi trường (.env)  
8. Scripts & Quy trình phát triển  
9. Pipeline Ingestion Tài liệu (PDF → Embedding)  
10. Retrieval & Query Flow  
11. Prompt Composition & Generation  
12. Tối ưu chi phí & Fallback chiến lược  
13. Testing Strategy  
14. Production Hardening Checklist  
15. Bảo mật & Quản lý khóa  
16. Tích hợp vào hệ thống khác (Embedding / API)  
17. Roadmap gợi ý mở rộng  
18. Khắc phục sự cố (Troubleshooting)  
19. Tài liệu tham chiếu nội bộ  
20. Thiếu / Cần bổ sung (Ghi chú duy trì)  
21. License (Trạng thái)  

---

## 1. Tầm nhìn & Triết lý thiết kế
- Pluggable Providers: Thay đổi model hoặc nhà cung cấp không phá vỡ lớp nghiệp vụ.
- Cost-Aware: Ưu tiên mô hình free/fast cho truy vấn đơn giản, mô hình cao cấp cho reasoning.
- Observability-First: Có chỗ cho logging có cấu trúc, đo thời gian, token usage.
- Data Ownership: Hỗ trợ mô hình local (Ollama) để dùng offline / tăng quyền riêng tư.
- Evolvable Architecture: Tài liệu chia nhỏ (architecture, implementation, provider, improvements) cho phép mở rộng.

## 2. Kiến trúc RAG tổng quan
Workflow (từ AI_BACKEND_ARCHITECTURE.md):

1. Ingestion (offline / batch):
   - PDF → (OCR nếu cần) → Chuẩn hóa → Chunking → Embedding → Lưu vector DB.
2. Query (real-time):
   - User query → Embedding → Vector similarity search → Top-K chunks.
3. Generation:
   - Xây dựng prompt (query + context) → Gọi LLM (theo provider lựa chọn) → Streaming response (nếu hỗ trợ).

Trạng thái hiện tại (theo doc):
- ✅ Ingestion pipeline
- ✅ Query embedding + search
- 🔄 Generation (đa provider, context assembly)
  
## 3. Multi-Provider Strategy & Provider Manager
Logic chọn provider dựa trên:
- Default (VITE_DEFAULT_AI_PROVIDER).
- Loại tác vụ: reasoning sâu / tóm tắt / conversational.
- Chi phí / tốc độ: Ví dụ dùng Gemini Flash (free) trước, fallback OpenAI mini nếu cần chất lượng cao hơn.
- Fallback: Khi timeout / lỗi rate limit → thử provider khác (cấu trúc providerManager.ts).

Provider Interface (trừu tượng):
```
interface AiProvider {
  name: string;
  supportsStreaming: boolean;
  generate(opts: { prompt: string; system?: string; temperature?: number; ... }): AsyncIterable<string> | string;
  embed(texts: string[]): Promise<number[][]>;
  health?(): Promise<boolean>;
}
```
(Định nghĩa cụ thể xem trong providers/base.ts – theo mô tả kiến trúc.)

## 4. Tính năng chính (Feature Set)
- PDF Parsing + OCR fallback (tesseract.js).
- Chunking + Overlap để giữ ngữ cảnh.
- Embedding + vector search (Supabase pgvector hoặc tương đương – dự kiến).
- Multi-provider LLM generation (Gemini / OpenAI / Ollama / Anthropic / Groq).
- UI cấu hình provider (AIProviderSettings).
- RAG Query Engine: compose context → gọi model → stream.
- Cost analysis & lựa chọn chiến lược (documented).
- Upload improvements pipeline (giảm lỗi PDF, chuẩn hóa text).
- Testing đa tầng (unit / integration / provider contract / UI).

## 5. Stack công nghệ chi tiết
Frontend & UI:
- React 18, Vite, TypeScript
- Radix UI primitives + shadcn-ui
- Tailwind CSS + tailwind-merge + class-variance-authority
- React Query (quản lý async / cache)
- Form: react-hook-form + zod

AI & ML:
- openai
- @google/generative-ai
- @anthropic-ai/sdk
- groq-sdk
- @huggingface/transformers (embedding / local inference nhẹ)
- Ollama (qua REST local)

PDF & Text:
- pdfjs-dist
- tesseract.js (OCR)
- Normalization logic (nằm trong ingestion layer – xem pipeline docs)

Testing:
- Vitest
- @testing-library/react / jest-dom
- jsdom hoặc happy-dom

Data:
- Supabase (auth, storage, vector) – suy luận từ thư mục supabase
- Dexie (IndexedDB) – caching phía client (nếu cần offline)

## 6. Cấu trúc thư mục & Định hướng tổ chức mã nguồn
Theo sơ đồ trong AI_BACKEND_ARCHITECTURE.md (dự kiến):
```
src/
├─ services/
│  └─ ai/
│     ├─ providers/
│     │  ├─ base.ts
│     │  ├─ openai.ts
│     │  ├─ gemini.ts
│     │  ├─ ollama.ts
│     │  ├─ anthropic.ts
│     │  └─ groq.ts
│     ├─ ragEngine.ts
│     ├─ providerManager.ts
│     └─ types.ts
├─ hooks/
│  └─ useAIChat.ts
└─ components/
   ├─ AIProviderSettings.tsx
   └─ ...
supabase/
public/
```
Gợi ý bổ sung:
- services/ingestion/: parser, chunker, embedQueue
- services/retrieval/: vectorClient, rerank (nếu thêm)
- utils/: tokenCounting, textNormalization
- tests/: unit, integration, provider, e2e

## 7. Biến môi trường (.env)
Hiện hữu trong .env.example:
```
# OpenAI
VITE_OPENAI_API_KEY=sk-proj-xxxxx
VITE_OPENAI_MODEL=gpt-4o-mini

# Google Gemini
VITE_GEMINI_API_KEY=AIzaSyxxxxx
VITE_GEMINI_MODEL=gemini-1.5-flash-latest

# Ollama (local)
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_OLLAMA_MODEL=llama3.1

# Default
VITE_DEFAULT_AI_PROVIDER=gemini
```
Bổ sung (từ tài liệu kiến trúc – nếu cần mở rộng):
```
# Anthropic
VITE_ANTHROPIC_API_KEY=
VITE_ANTHROPIC_MODEL=claude-3-haiku-20240307

# Groq
VITE_GROQ_API_KEY=
VITE_GROQ_MODEL=llama-3.1-70b-versatile
```
Khuyến nghị thêm (tùy tương lai):
```
# Retrieval / Embedding (nếu dùng service bên ngoài)
VITE_EMBEDDING_MODEL=
VITE_VECTOR_NAMESPACE=
# Logging / Observability
VITE_LOG_LEVEL=info
# Feature flags
VITE_ENABLE_STREAMING=true
```
Lưu ý:
- Biến bắt đầu bằng VITE_ sẽ được expose ra frontend (không để khóa nhạy cảm server-only trong biến này nếu không cần backend riêng).
- Không commit khóa thật lên repo.

## 8. Scripts & Quy trình phát triển
(package.json)
```
dev              → vite
build            → vite build
build:dev        → vite build --mode development
lint             → eslint .
preview          → vite preview
test             → vitest
test:ui          → vitest --ui
test:run         → vitest run
test:coverage    → vitest run --coverage
```
Quy trình gợi ý:
1. Sao chép `.env.example` → `.env`.
2. Cài đặt: `npm install`
3. Chạy dev: `npm run dev`
4. Test nhanh trước commit: `npm run lint && npm run test:run`.

## 9. Pipeline Ingestion Tài liệu
Các bước:
1. Upload: người dùng chọn file PDF.
2. Kiểm tra định dạng / kích thước / checksum (chống trùng).
3. Parse: pdfjs-dist → lấy text từng trang.
4. OCR fallback: nếu trang rỗng / tỷ lệ ký tự thấp → tesseract.js.
5. Clean: loại header/footer lặp, chuẩn hóa khoảng trắng, unify newline.
6. Chunking: theo token/char threshold (ví dụ 1000–1500 tokens) + overlap (100–150 tokens).
7. Hash chunk: tránh embed lại.
8. Embed batch: gửi theo lô giảm overhead HTTP.
9. Lưu vector: (Supabase pgvector hoặc adapter).
10. Index metadata: page, offset, file_id, thời gian ingest.

Cải tiến (tài liệu UPLOAD_IMPROVEMENTS.md & FIX_PDF_UPLOAD.md):
- Giảm lỗi PDF scan.
- Tối ưu kích thước batch embedding.
- Điều chỉnh overlap động theo mật độ ngữ nghĩa.

## 10. Retrieval & Query Flow
1. Nhận query người dùng.
2. Chuẩn hóa (lowercase nhẹ / remove noise? – không phá dấu tiếng Việt).
3. Embedding query → vector.
4. Vector search top-K (ví dụ k=5–8).
5. (Tùy chọn) Rerank / filter theo nguồn, thời gian.
6. Compose context (giới hạn tổng tokens).
7. Pass sang provider generate → stream token → hiển thị incremental.

## 11. Prompt Composition & Generation
Cấu trúc prompt (gợi ý):
```
System: Vai trò, phong cách trả lời, ngôn ngữ (vi/en)
Context: <Concatenate normalized top-K chunks with source tags>
User: <Original user query>
Guidelines: Nếu không chắc, nói rõ.
```
Tối ưu:
- Gắn metadata: [Doc:filename.pdf#page=12]
- Tránh vượt context window: cắt bớt chunk dài / tóm tắt trung gian.

## 12. Tối ưu chi phí & Fallback chiến lược
Theo bảng cost trong tài liệu:
- Default: Gemini Flash (miễn phí / nhanh).
- Local offline: Ollama (llama3.1:8b).
- Nâng chất lượng: OpenAI GPT-4o-mini.
- Reasoning sâu: Claude Sonnet (khi cần logic phức tạp).
Fallback logic (ví dụ):
1. Primary provider generate.
2. Nếu timeout / rate limit → chuyển sang provider thứ hai.
3. Log metric (latency, success ratio per provider) giúp tương lai adaptive routing.

Cache:
- Embedding dedup bằng hashing chunk.
- Response caching cho câu hỏi lặp (lưu ý invalidation khi corpus thay đổi).

## 13. Testing Strategy
- Unit:
  - Provider adapter mock (OpenAI/Gemini…).
  - Chunking / normalization utils.
- Integration:
  - Query → retrieval → prompt assembly (mock model).
  - Ingestion partial pipeline test.
- Contract:
  - Interface provider không đổi signature (snapshot types hoặc test runtime).
- UI:
  - AIProviderSettings, Upload form, Chat panel.
- Performance (tùy chọn):
  - Thời gian embed batch vs single.
- Coverage:
  - `npm run test:coverage`.

## 14. Production Hardening Checklist
| Hạng mục | Mức độ | Ghi chú |
|----------|--------|--------|
| Structured Logging | Cao | JSON logs gắn trace ID |
| Retry & Backoff | Cao | Provider 429/5xx |
| Rate Limiting | Cao | Per user / IP |
| Token Usage Accounting | Trung | Log input/output tokens |
| Secrets Mgmt | Cao | Không phơi API key raw client nếu không cần |
| Streaming Partial Fail Handling | Trung | Cancel mid-stream |
| Healthcheck Endpoint | Trung | Ping vector store + provider HEAD |
| Alerting | Trung | Error rate threshold |
| Vector Migration Plan | Thấp | Khi đổi schema embeddings |
| Model Version Pinning | Cao | Tránh drift chất lượng |

## 15. Bảo mật & Quản lý khóa
- Biến VITE_ là public → Chỉ để khóa model free/không nhạy cảm (Gemini free). Khóa trả phí nên đi qua backend proxy (nếu bổ sung backend).
- Không commit .env.
- Thêm secure storage (nếu có backend) để quay vòng (rotate) keys.
- Giảm rủi ro prompt injection: lọc user input, tách system instructions rõ ràng.

## 16. Tích hợp vào hệ thống khác (Embedding / API)
Pattern:
- Backend module: expose hàm `answerQuestion(query, options)` trả về stream.
- UI embed: tách component ChatPanel + ProviderSelector.
- API gợi ý:
  - POST /api/ingest {file_id}
  - POST /api/query {query, topK?}
  - GET  /api/sources
- Auth: Supabase JWT hoặc custom token → map user_id trong logging / rate limit.

## 17. Roadmap gợi ý mở rộng
- Conversation Memory Summarization (giảm chiều dài ngữ cảnh).
- Hybrid Retrieval (keyword + vector).
- Reranking (LLM hoặc cross-encoder).
- Feedback Loop (thumbs up/down → cải thiện rerank).
- Adaptive Provider Routing (ML policy).
- Cost Dashboard UI.
- Differential Embedding Update (chỉ re-embed thay đổi).

## 18. Khắc phục sự cố (Troubleshooting)
| Vấn đề | Nguyên nhân | Khắc phục |
|--------|-------------|-----------|
| Lỗi 401 khi gọi model | Sai API key | Kiểm tra .env & reload |
| Rỗng nội dung PDF | File scan ảnh | Bật OCR fallback |
| Kết quả lạc đề | Chunk quá nhỏ / context thiếu | Tăng CHUNK_SIZE hoặc top-K |
| Chậm | Batch embedding nhỏ / provider free quá tải | Tăng batch size / fallback provider |
| Token over-limit | Quá nhiều chunk | Rút gọn / tóm tắt chunk dài |
| Không stream | Provider không hỗ trợ hoặc flag tắt | Kiểm tra supportsStreaming & config |

## 19. Tài liệu tham chiếu nội bộ
- AI_BACKEND_ARCHITECTURE.md
- AI_BACKEND_IMPLEMENTATION.md
- AI_PROVIDER_IMPLEMENTATION.md
- AI_IMPLEMENTATION_SUMMARY.md
- IMPLEMENTATION_SUMMARY.md
- QUICK_START_AI.md
- INTEGRATION_GUIDE.md
- PRODUCTION_FEATURES.md
- UPLOAD_IMPROVEMENTS.md
- FIX_PDF_UPLOAD.md
- TEST_GUIDE.md
- CODEBASE_SCAN_REPORT.md

## 20. Thiếu / Cần bổ sung (Ghi chú duy trì)
- Chưa có LICENSE.
- Nên thống nhất package manager (npm vs bun lockfile).
- Thêm tài liệu chi tiết src/ (khi cấu trúc ổn định).
- Xem xét thêm CHANGELOG.md nếu release versioned.

## 21. License (Trạng thái)
Chưa khai báo. Khuyến nghị thêm MIT hoặc Apache-2.0 để mở rộng sử dụng cộng đồng.

---

Last Updated: (cập nhật khi commit)  
Maintainer: @Khogao  
