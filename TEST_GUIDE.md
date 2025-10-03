# 🧪 TEST GUIDE - PDF UPLOAD & AI RAG

## 🎯 **OBJECTIVE:**
Test toàn bộ workflow từ upload PDF → OCR → Vector Search → AI RAG Query

---

## ✅ **PREPARATION CHECKLIST:**

- [x] Dev server running (http://localhost:8080)
- [x] Gemini API key configured
- [x] PDF.js worker fixed (local worker)
- [x] Browser opened
- [ ] Test documents ready

---

## 📝 **TEST SCENARIO 1: UPLOAD PDF**

### **Input:**
- Folder: `D:\OneDrive\Phi\Project mamagement tools\Thu tuc - Phap ly`
- Files: Any PDF documents (quy chuẩn, thủ tục pháp lý, etc.)

### **Steps:**
```
1. Click tab "Quản lý tài liệu" (Document Management)
2. Click button "Tải lên tài liệu" (Upload Documents)
3. Browse to folder
4. Select 1-3 PDF files (start small)
5. Click "Open"
```

### **Expected Output:**
```
✅ Toast: "Đang tải file PDF..." (10%)
✅ Toast: "Đang xử lý X trang..." (20-80%)
✅ Toast: "Hoàn thành trích xuất text" (100%)
✅ Document appears in list with:
   - Name
   - Type (PDF)
   - Size (X MB)
   - Date (2023-10-XX)
✅ No errors in console (F12)
```

### **Performance Metrics:**
```
📄 Text PDF (10 pages): ~1-2 seconds
📄 Scanned PDF (10 pages): ~20-30 seconds
📄 Mixed PDF: Varies by content
```

### **Pass Criteria:**
- [ ] Upload completes without errors
- [ ] Progress bar shows correctly
- [ ] Document in list
- [ ] No console errors
- [ ] Toast shows success message

---

## 📝 **TEST SCENARIO 2: VECTOR SEARCH**

### **Input:**
- Query: "quy chuẩn xây dựng"
- Model: "Xenova/all-MiniLM-L6-v2"
- Top-K: 5

### **Steps:**
```
1. Click tab "Kiến trúc" (Query Panel)
2. Type query: "quy chuẩn xây dựng"
3. Select folders (if any)
4. Click "Search"
```

### **Expected Output:**
```
✅ Top-5 chunks displayed
✅ Each chunk shows:
   - Text content (500 chars)
   - Similarity score (0.6-0.9)
   - Source document name
   - Chunk index
✅ Results sorted by score (high to low)
✅ Results are relevant to query
```

### **Pass Criteria:**
- [ ] Search completes in < 2 seconds
- [ ] Results are relevant
- [ ] Scores are reasonable (> 0.5)
- [ ] Source citations work
- [ ] No errors

---

## 📝 **TEST SCENARIO 3: AI CHAT (RAG)**

### **Input:**
- Provider: Gemini
- Query: Vietnamese questions about documents
- Streaming: ON

### **Steps:**
```
1. Click tab "Trợ lý AI" (AI Chat)
2. Check provider = "Gemini"
3. Check status = "online" (green)
4. Enable "Stream" toggle
5. Type question (see examples below)
6. Click "Ask" or Enter
```

### **Test Questions:**

#### **Q1: Summarization**
```vietnamese
"Tóm tắt nội dung chính của các tài liệu về thủ tục pháp lý"
```

**Expected:**
- Summary of all documents
- Key points extracted
- Mentions specific procedures
- 3-5 paragraphs

#### **Q2: Specific Query**
```vietnamese
"Quy trình xin phép xây dựng gồm những bước nào?"
```

**Expected:**
- Step-by-step procedure
- Numbered or bulleted list
- Specific requirements
- Relevant citations

#### **Q3: Document Search**
```vietnamese
"Liệt kê các giấy tờ cần thiết cho dự án xây dựng"
```

**Expected:**
- List of required documents
- Clear enumeration
- Based on uploaded docs
- Source references

#### **Q4: Comparison**
```vietnamese
"So sánh quy định về chiều cao tối đa giữa các khu vực"
```

**Expected:**
- Comparison table/list
- Specific numbers/values
- Multiple sources cited
- Clear differences highlighted

#### **Q5: Explanation**
```vietnamese
"Giải thích chi tiết về thủ tục nghiệm thu công trình"
```

**Expected:**
- Detailed explanation
- Multiple paragraphs
- Technical terms explained
- Practical examples

### **Expected Behavior:**

#### **Streaming ON:**
```
✅ Typing indicator appears
✅ Words appear one by one
✅ Real-time response (like ChatGPT)
✅ Smooth animation
✅ Can see progress
```

#### **Streaming OFF:**
```
✅ Loading spinner
✅ Wait 2-5 seconds
✅ Full response appears at once
✅ Faster feel (but same actual time)
```

### **Response Quality:**
```
✅ Answer in Vietnamese
✅ Relevant to question
✅ Uses document context
✅ Shows citations/sources
✅ Well-formatted (paragraphs, lists)
✅ No hallucinations (only from docs)
```

### **Pass Criteria:**
- [ ] Provider shows "online"
- [ ] Response starts within 2-3 seconds
- [ ] Streaming works smoothly
- [ ] Answer is relevant and accurate
- [ ] Citations show correct sources
- [ ] No errors or timeouts
- [ ] Can ask follow-up questions

---

## 📝 **TEST SCENARIO 4: ERROR HANDLING**

### **Test 4A: No Documents**
```
1. Clear all documents (delete)
2. Try AI chat
Expected: "No documents found" or similar message
```

### **Test 4B: Invalid Query**
```
1. Type gibberish: "asdfghjkl"
2. Click Ask
Expected: "No relevant information found" or similar
```

### **Test 4C: API Key Error**
```
1. Remove API key from .env
2. Restart server
3. Try AI chat
Expected: "Provider not initialized" error
```

### **Test 4D: Network Error**
```
1. Disconnect internet
2. Try AI chat with Gemini
3. Try AI chat with Ollama (if installed)
Expected: Fallback or error message
```

---

## 📊 **PERFORMANCE BENCHMARKS**

### **Upload:**
```
📄 Small PDF (< 1 MB, 5 pages): 1-3 seconds
📄 Medium PDF (1-5 MB, 20 pages): 5-15 seconds
📄 Large PDF (5-20 MB, 100 pages): 30-60 seconds
📄 Scanned PDF: Add 2-5s per page for OCR
```

### **Vector Search:**
```
🔍 100 chunks: < 1 second
🔍 1,000 chunks: 1-2 seconds
🔍 10,000 chunks: 2-5 seconds
```

### **AI Response:**
```
🤖 Gemini (cloud): 1-3 seconds
🤖 Ollama (local): 3-10 seconds (depends on hardware)
🤖 OpenAI: 1-2 seconds
```

---

## 🐛 **COMMON ISSUES & FIXES**

### **Issue 1: "Provider offline"**
```bash
Fix:
1. Check API key in .env
2. Check internet connection
3. Refresh browser
4. Check console for errors
```

### **Issue 2: "No results found"**
```bash
Fix:
1. Check documents uploaded
2. Check embeddings generated (console.log)
3. Try broader query
4. Lower similarity threshold
```

### **Issue 3: "Upload hangs"**
```bash
Fix:
1. Check file size (< 20 MB recommended)
2. Check console for errors
3. Try smaller file first
4. Clear browser cache
```

### **Issue 4: "Slow OCR"**
```bash
Normal behavior!
- Scanned PDFs need OCR (2-5s/page)
- Text PDFs are fast (< 1s/page)
- Large files take longer
```

---

## ✅ **SUCCESS CRITERIA**

### **All tests pass if:**
- [x] PDF uploads without errors
- [x] OCR extracts text correctly
- [x] Documents appear in list
- [x] Vector search returns relevant results
- [x] AI chat responds appropriately
- [x] Streaming works smoothly
- [x] Citations show correct sources
- [x] Performance is acceptable
- [x] Error handling works
- [x] No console errors

---

## 📋 **TEST REPORT TEMPLATE**

```markdown
## Test Report - [Date]

### Environment:
- OS: Windows
- Browser: [Chrome/Edge/Firefox]
- Server: http://localhost:8080
- Provider: Gemini

### Test Results:

#### Scenario 1: Upload PDF
- Status: [PASS/FAIL]
- Time: [X seconds]
- Files: [X files, Y MB]
- Notes: [Any observations]

#### Scenario 2: Vector Search
- Status: [PASS/FAIL]
- Time: [X seconds]
- Results: [X relevant chunks]
- Notes: [Quality of results]

#### Scenario 3: AI Chat
- Status: [PASS/FAIL]
- Time: [X seconds]
- Questions: [X/5 answered correctly]
- Notes: [Response quality]

#### Scenario 4: Error Handling
- Status: [PASS/FAIL]
- Notes: [How errors were handled]

### Overall Assessment:
[PASS/FAIL] - [Summary of test session]

### Issues Found:
1. [Issue 1]
2. [Issue 2]

### Recommendations:
1. [Recommendation 1]
2. [Recommendation 2]
```

---

## 🎉 **AFTER SUCCESSFUL TEST**

**You now have:**
✅ Fully functional document upload
✅ Real OCR for Vietnamese
✅ Vector search working
✅ AI RAG system operational
✅ Multi-document support
✅ Streaming responses
✅ Source citations

**Next steps:**
1. Upload more documents
2. Test with real use cases
3. Fine-tune parameters
4. Consider Ollama for privacy
5. Deploy to production

---

**Happy Testing! 🚀**
