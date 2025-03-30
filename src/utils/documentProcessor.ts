
import { VectorChunk } from './vectorUtils';
import { addChunksToVectorStore } from './vectorStoreUtils';

// Simulated OCR and text extraction since we can't use native Python libraries
// In a real implementation, you would use worker threads and proper libraries

/**
 * Constants for text extraction
 */
const CHUNK_SIZE = 500; // Size of text chunks in characters
const CHUNK_OVERLAP = 100; // Overlap between chunks to maintain context

/**
 * Progress callback type
 */
type ProgressCallback = (progress: number) => void;

/**
 * Process a document file (PDF or DOCX)
 */
export async function processDocument(
  file: File,
  folderId: string,
  documentName: string,
  onProgress: ProgressCallback,
  embeddingPipeline: any
): Promise<{ chunks: number }> {
  // Initial progress update
  onProgress(5);
  
  // Read the file
  const text = await extractTextFromFile(file, onProgress);
  
  onProgress(60);
  
  // Split text into chunks
  const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP);
  
  onProgress(70);
  
  // Generate embeddings and store chunks
  await processChunks(chunks, documentName, folderId, file.name, embeddingPipeline, onProgress);
  
  onProgress(100);
  
  return { chunks: chunks.length };
}

/**
 * Extract text from file (PDF or DOCX)
 */
async function extractTextFromFile(file: File, onProgress: ProgressCallback): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        onProgress(30);
        
        let text = '';
        
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          // PDF text extraction simulation
          // In real implementation, you'd use a PDF library
          text = simulatePdfTextExtraction(event.target?.result as ArrayBuffer);
        } else if (
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.name.toLowerCase().endsWith('.docx')
        ) {
          // DOCX text extraction simulation
          // In real implementation, you'd use a DOCX library
          text = simulateDocxTextExtraction(event.target?.result as ArrayBuffer);
        } else {
          throw new Error('Định dạng tệp không được hỗ trợ');
        }
        
        onProgress(50);
        resolve(text);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Lỗi khi đọc tệp tin'));
    };
    
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.toLowerCase().endsWith('.docx')) {
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error('Định dạng tệp không được hỗ trợ'));
    }
  });
}

/**
 * Simulate PDF text extraction
 * In a real implementation, you would use a PDF library like pdf.js
 */
function simulatePdfTextExtraction(buffer: ArrayBuffer): string {
  // Simulate PDF text extraction by generating random Vietnamese text
  // This is just for demo purposes
  const bufferView = new Uint8Array(buffer);
  
  // Generate random Vietnamese text based on file content
  // Use the first 100 bytes as a seed for consistency
  const seed = Array.from(bufferView.slice(0, 100)).reduce((acc, val) => acc + val, 0);
  
  return generateVietnameseText(seed, 10000);
}

/**
 * Simulate DOCX text extraction
 * In a real implementation, you would use a DOCX library
 */
function simulateDocxTextExtraction(buffer: ArrayBuffer): string {
  // Simulate DOCX text extraction by generating random Vietnamese text
  // This is just for demo purposes
  const bufferView = new Uint8Array(buffer);
  
  // Generate random Vietnamese text based on file content
  // Use the first 100 bytes as a seed for consistency
  const seed = Array.from(bufferView.slice(0, 100)).reduce((acc, val) => acc + val, 0);
  
  return generateVietnameseText(seed, 8000);
}

/**
 * Generate random Vietnamese-like text for demo purposes
 */
function generateVietnameseText(seed: number, length: number): string {
  const vietnameseSentences = [
    "Theo quy định của pháp luật về xây dựng, hồ sơ thiết kế phải được thẩm định trước khi phê duyệt.",
    "Các công trình xây dựng phải tuân thủ quy chuẩn kỹ thuật quốc gia và tiêu chuẩn áp dụng.",
    "Chủ đầu tư có trách nhiệm tổ chức thẩm định thiết kế xây dựng theo quy định.",
    "Dự án đầu tư xây dựng công trình phải phù hợp với quy hoạch xây dựng.",
    "Nhà ở riêng lẻ có tổng diện tích sàn dưới 250m² không phải xin giấy phép xây dựng.",
    "Chứng chỉ hành nghề kiến trúc sư do Bộ Xây dựng cấp theo quy định của pháp luật.",
    "Công trình xây dựng phải đảm bảo an toàn cho người và tài sản trong quá trình sử dụng.",
    "Giấy phép xây dựng có thời hạn 12 tháng kể từ ngày cấp.",
    "Quy hoạch đô thị là việc tổ chức không gian đô thị và hệ thống công trình hạ tầng kỹ thuật.",
    "Hệ số sử dụng đất là tỷ lệ giữa tổng diện tích sàn và diện tích khu đất.",
    "Mật độ xây dựng thuần tối đa tùy thuộc vào loại đất và khu vực xây dựng.",
    "Chỉ giới xây dựng là đường giới hạn cho phép xây dựng công trình trên lô đất.",
    "Công trình phải đảm bảo yêu cầu về phòng cháy chữa cháy theo quy định hiện hành.",
    "Bản vẽ thiết kế kỹ thuật phải do người có chứng chỉ hành nghề phù hợp ký tên.",
    "Quy chuẩn về khoảng lùi công trình nhằm đảm bảo không gian và an toàn đô thị.",
    "Tiêu chuẩn thiết kế TCVN 2737 quy định về tải trọng và tác động cho các công trình xây dựng.",
    "Quy hoạch chi tiết tỷ lệ 1/500 phải thể hiện rõ tổ chức không gian kiến trúc cảnh quan.",
    "Thời hạn cấp giấy phép xây dựng không quá 30 ngày kể từ ngày nhận đủ hồ sơ hợp lệ.",
    "Chiều cao tối đa của công trình phụ thuộc vào quy hoạch và quy định của địa phương.",
    "Tầng hầm công trình không tính vào số tầng nhưng tính vào chiều cao công trình."
  ];
  
  let result = '';
  let seedValue = seed;
  
  while (result.length < length) {
    // Use the seed to select a sentence
    const index = seedValue % vietnameseSentences.length;
    result += vietnameseSentences[index] + ' ';
    
    // Change seed for next iteration
    seedValue = (seedValue * 9301 + 49297) % 233280;
  }
  
  return result.substring(0, length);
}

/**
 * Split text into overlapping chunks
 */
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  
  if (!text || text.length === 0) {
    return chunks;
  }
  
  let startIndex = 0;
  
  while (startIndex < text.length) {
    // Determine end index for this chunk
    let endIndex = startIndex + chunkSize;
    
    // If we're not at the end of the text, try to find a sentence or paragraph break
    if (endIndex < text.length) {
      // Look for paragraph break first
      const paragraphBreakIndex = text.indexOf('\n\n', endIndex - 100);
      if (paragraphBreakIndex !== -1 && paragraphBreakIndex < endIndex + 100) {
        endIndex = paragraphBreakIndex;
      } else {
        // Look for sentence break (period followed by space)
        const sentenceBreakIndex = text.indexOf('. ', endIndex - 50);
        if (sentenceBreakIndex !== -1 && sentenceBreakIndex < endIndex + 50) {
          endIndex = sentenceBreakIndex + 1; // Include the period
        }
      }
    } else {
      endIndex = text.length;
    }
    
    // Add this chunk
    chunks.push(text.substring(startIndex, endIndex).trim());
    
    // Move start index for next chunk, accounting for overlap
    startIndex = endIndex - overlap;
    
    // Make sure we're making progress
    if (startIndex >= text.length || startIndex <= 0) {
      break;
    }
  }
  
  return chunks;
}

/**
 * Process text chunks to generate embeddings and store them
 */
async function processChunks(
  chunks: string[],
  documentName: string,
  folderId: string,
  fileName: string,
  embeddingPipeline: any,
  onProgress: ProgressCallback
): Promise<void> {
  if (!embeddingPipeline) {
    throw new Error('Embedding pipeline not initialized');
  }
  
  const vectorChunks: VectorChunk[] = [];
  const startProgress = 70;
  const endProgress = 95;
  const progressPerChunk = (endProgress - startProgress) / chunks.length;
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    try {
      // Generate embedding for this chunk
      const result = await embeddingPipeline(chunk, { pooling: "mean", normalize: true });
      
      // Check if result has data property
      if (!result || !result.data) {
        console.error('Invalid embedding result:', result);
        throw new Error('Không thể tạo embedding cho đoạn văn bản');
      }
      
      // Convert to array of numbers
      const embedding = Array.from(result.data);
      
      // Create vector chunk
      vectorChunks.push({
        id: `${documentName}_${i}`,
        text: chunk,
        embedding: embedding,
        documentId: fileName,
        documentName: documentName,
        folderId: folderId
      });
      
      // Update progress
      onProgress(startProgress + (i + 1) * progressPerChunk);
    } catch (error) {
      console.error('Error generating embedding for chunk:', error);
      throw new Error('Lỗi khi tạo embedding: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }
  
  // Store chunks in vector store
  await addChunksToVectorStore(vectorChunks);
}
