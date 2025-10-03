/**
 * Real OCR Engine Implementation
 * Supports PDF.js for PDF text extraction and Tesseract.js for OCR
 */

import * as pdfjsLib from 'pdfjs-dist';
import { createWorker, Worker } from 'tesseract.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface OcrProgress {
  stage: 'loading' | 'processing' | 'ocr' | 'complete';
  progress: number;
  message: string;
}

export type OcrProgressCallback = (progress: OcrProgress) => void;

/**
 * Extract text from PDF using PDF.js
 */
export async function extractTextFromPDF(
  file: File,
  onProgress?: OcrProgressCallback
): Promise<string> {
  try {
    onProgress?.({
      stage: 'loading',
      progress: 10,
      message: 'Đang tải file PDF...'
    });

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const totalPages = pdf.numPages;
    let fullText = '';
    
    onProgress?.({
      stage: 'processing',
      progress: 20,
      message: `Đang xử lý ${totalPages} trang...`
    });

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Extract text from page
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
      
      // Update progress
      const progress = 20 + (pageNum / totalPages) * 60;
      onProgress?.({
        stage: 'processing',
        progress,
        message: `Đã xử lý ${pageNum}/${totalPages} trang`
      });
    }

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Hoàn thành trích xuất text từ PDF'
    });

    return fullText.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Lỗi khi trích xuất text từ PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from images in PDF using OCR (Tesseract.js)
 */
export async function extractTextFromPDFWithOCR(
  file: File,
  onProgress?: OcrProgressCallback
): Promise<string> {
  try {
    onProgress?.({
      stage: 'loading',
      progress: 5,
      message: 'Đang khởi tạo OCR engine...'
    });

    // Create Tesseract worker
    const worker = await createWorker('vie+eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const progress = 10 + (m.progress * 70);
          onProgress?.({
            stage: 'ocr',
            progress,
            message: `OCR đang xử lý: ${Math.round(m.progress * 100)}%`
          });
        }
      }
    });

    onProgress?.({
      stage: 'loading',
      progress: 10,
      message: 'Đang chuyển đổi PDF thành hình ảnh...'
    });

    // Convert PDF pages to images and OCR
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const totalPages = pdf.numPages;
    let fullText = '';

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      
      // Render page to canvas
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ 
        canvasContext: context, 
        viewport,
        canvas
      }).promise;
      
      // Convert canvas to image and OCR
      const imageData = canvas.toDataURL('image/png');
      const { data: { text } } = await worker.recognize(imageData);
      
      fullText += text + '\n\n';
      
      onProgress?.({
        stage: 'ocr',
        progress: 10 + (pageNum / totalPages) * 80,
        message: `Đã OCR ${pageNum}/${totalPages} trang`
      });
    }

    await worker.terminate();

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Hoàn thành OCR'
    });

    return fullText.trim();
  } catch (error) {
    console.error('Error performing OCR on PDF:', error);
    throw new Error(`Lỗi khi thực hiện OCR: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from DOCX files
 * Note: For proper DOCX support, consider using mammoth.js
 */
export async function extractTextFromDOCX(
  file: File,
  onProgress?: OcrProgressCallback
): Promise<string> {
  try {
    onProgress?.({
      stage: 'loading',
      progress: 20,
      message: 'Đang đọc file DOCX...'
    });

    // For now, we'll use a simple text extraction
    // In production, use mammoth.js or similar library
    const text = await file.text();
    
    onProgress?.({
      stage: 'processing',
      progress: 60,
      message: 'Đang xử lý nội dung...'
    });

    // Simple XML parsing for DOCX (basic implementation)
    const textContent = text
      .replace(/<[^>]*>/g, ' ') // Remove XML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Hoàn thành xử lý DOCX'
    });

    return textContent;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error(`Lỗi khi trích xuất text từ DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Smart document processor - tries text extraction first, falls back to OCR if needed
 */
export async function smartExtractText(
  file: File,
  onProgress?: OcrProgressCallback
): Promise<{ text: string; method: 'text' | 'ocr' }> {
  const fileType = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx';
  
  if (fileType === 'pdf') {
    try {
      // Try text extraction first
      const text = await extractTextFromPDF(file, onProgress);
      
      // Check if we got meaningful text
      if (text.length > 100) {
        return { text, method: 'text' };
      }
      
      // If text is too short, try OCR
      onProgress?.({
        stage: 'ocr',
        progress: 0,
        message: 'Text extraction không đủ, chuyển sang OCR...'
      });
      
      const ocrText = await extractTextFromPDFWithOCR(file, onProgress);
      return { text: ocrText, method: 'ocr' };
    } catch (error) {
      console.error('Error in smart extraction:', error);
      throw error;
    }
  } else {
    const text = await extractTextFromDOCX(file, onProgress);
    return { text, method: 'text' };
  }
}
