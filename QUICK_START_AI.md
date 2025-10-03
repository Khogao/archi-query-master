# 🚀 QUICK START - AI RAG SETUP

## ⚡ **OPTION 1: GEMINI FREE (2 PHÚT - KHUYẾN NGHỊ)**

### **Bước 1: Lấy API Key (FREE, không cần thẻ)**
1. Mở: https://aistudio.google.com/app/apikey
2. Click **"Create API Key"**
3. Copy API key (dạng: `AIzaSyxxxxx...`)

### **Bước 2: Thêm vào .env file**
```bash
# Mở file .env và thay YOUR_GEMINI_API_KEY_HERE bằng key vừa lấy
VITE_GEMINI_API_KEY=AIzaSyxxxxx...  # <-- Thay đây
VITE_DEFAULT_AI_PROVIDER=gemini
```

### **Bước 3: Restart dev server**
```bash
# Tắt terminal hiện tại (Ctrl+C)
npm run dev
```

### **Bước 4: Test ngay!**
1. Mở browser: http://localhost:8080
2. Upload tài liệu (PDF/DOCX) từ folder:
   ```
   D:\OneDrive\Phi\Project mamagement tools\Thu tuc - Phap ly
   ```
3. Click tab **"AI Chat"**
4. Hỏi câu hỏi về tài liệu!

---

## 🏠 **OPTION 2: OLLAMA LOCAL (10 PHÚT - PRIVATE)**

### **Bước 1: Cài Ollama**
1. Download: https://ollama.com/download/windows
2. Chạy installer
3. Mở PowerShell mới, test:
   ```bash
   ollama --version
   ```

### **Bước 2: Tải model AI**
```bash
# Chọn 1 trong các model sau:

# qwen2:7b - KHUYẾN NGHỊ (tốt nhất cho tiếng Việt)
ollama pull qwen2:7b

# llama3.1:8b - Tốt cho tiếng Anh
ollama pull llama3.1:8b

# gemma2:9b - Cân bằng
ollama pull gemma2:9b
```

**Lưu ý:** Model ~4-5GB, tải mất ~5-10 phút

### **Bước 3: Chạy Ollama server**
```bash
# Mở PowerShell mới, chạy:
ollama serve
```

**Giữ terminal này mở!** Server chạy ở http://localhost:11434

### **Bước 4: Cấu hình .env**
```bash
# Uncomment và set:
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_OLLAMA_MODEL=qwen2:7b
VITE_DEFAULT_AI_PROVIDER=ollama
```

### **Bước 5: Restart dev server**
```bash
npm run dev
```

### **Bước 6: Test!**
Same như Option 1, upload và chat!

---

## 🎯 **TEST WORKFLOW**

### **1. Upload Documents:**
```
1. Click "Document Management" tab
2. Click "Upload Documents" 
3. Chọn files từ: D:\OneDrive\Phi\Project mamagement tools\Thu tuc - Phap ly
4. Chờ OCR + processing (5-30s per file)
5. Thấy danh sách documents
```

### **2. Ask Questions:**
```
1. Click "AI Chat" tab
2. Select provider: Gemini hoặc Ollama
3. Type câu hỏi, ví dụ:
   - "Tóm tắt các thủ tục pháp lý trong tài liệu"
   - "Giải thích quy trình xin phép xây dựng"
   - "Liệt kê các giấy tờ cần thiết"
4. Click "Ask" hoặc bật streaming
5. Xem kết quả với citations!
```

### **3. Test Vector Search (Traditional):**
```
1. Click "Query Panel" tab
2. Type: "thủ tục pháp lý"
3. Select folders
4. Click "Search"
5. Xem top-K relevant chunks
```

---

## 🔄 **SWITCH PROVIDERS**

Bạn có thể dùng nhiều providers cùng lúc!

### **Setup cả 2:**
```bash
# .env
VITE_GEMINI_API_KEY=AIzaSyxxxxx...
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_OLLAMA_MODEL=qwen2:7b
VITE_DEFAULT_AI_PROVIDER=gemini  # Mặc định
```

### **Switch trong UI:**
```
AI Chat tab -> Dropdown "Provider" -> Chọn Gemini/Ollama
```

---

## 📊 **PERFORMANCE COMPARISON**

| Provider | Speed | Quality | Cost | Vietnamese | Privacy |
|----------|-------|---------|------|------------|---------|
| **Gemini** | ⚡⚡⚡ (1-2s) | ⭐⭐⭐⭐⭐ | 🆓 FREE | ✅ Excellent | ⚠️ Cloud |
| **Ollama qwen2** | ⚡⚡ (3-8s) | ⭐⭐⭐⭐ | 🆓 FREE | ✅ Very Good | ✅ Local |
| **OpenAI** | ⚡⚡⚡ (1-2s) | ⭐⭐⭐⭐⭐ | 💰 Paid | ✅ Best | ⚠️ Cloud |

**Khuyến nghị:**
- **Development:** Gemini (nhanh, FREE, dễ setup)
- **Production (private data):** Ollama (local, secure)
- **Production (best quality):** OpenAI (nếu có budget)

---

## 🐛 **TROUBLESHOOTING**

### **Error: "Provider not initialized"**
```bash
# Check .env có API key chưa
# Restart dev server
npm run dev
```

### **Error: "Failed to fetch Ollama"**
```bash
# Check Ollama server đang chạy:
ollama serve

# Check URL trong .env:
VITE_OLLAMA_BASE_URL=http://localhost:11434
```

### **Error: "Model not found"**
```bash
# List models available:
ollama list

# Pull model:
ollama pull qwen2:7b
```

### **OCR chậm:**
```
Normal! PDF scanned mất 2-5s/page
Scanned documents cần Tesseract OCR
Text-based PDFs nhanh hơn (<1s/page)
```

### **No results in vector search:**
```
1. Check documents đã upload chưa
2. Check embeddings generated (console.log)
3. Try lower threshold (0.5 instead of 0.7)
4. Try broader query
```

---

## ✅ **CHECKLIST**

- [ ] API key added to .env
- [ ] Dev server restarted
- [ ] Documents uploaded successfully
- [ ] AI Chat tab visible
- [ ] Provider shows "online" (green)
- [ ] Question answered with sources
- [ ] Response makes sense
- [ ] Citations link to correct chunks

---

## 🎉 **SUCCESS!**

Nếu tất cả work, bạn đã có:
✅ Production-ready RAG system
✅ Multi-provider AI backend
✅ Real OCR for Vietnamese documents
✅ Persistent storage (offline-first)
✅ Vector search with embeddings
✅ AI chat with streaming

**Next steps:**
- Test với nhiều documents
- Compare providers
- Deploy to production
- Add more features!

---

**Need help?** Check:
- AI_BACKEND_ARCHITECTURE.md (detailed guide)
- AI_PROVIDER_IMPLEMENTATION.md (setup guide)
- CODEBASE_SCAN_REPORT.md (full overview)
