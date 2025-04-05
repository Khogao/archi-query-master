import React, { useState } from 'react';
import { useAiModel, EmbeddingModelType } from '@/hooks/useAiModel';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SearchIcon, Loader2, BugIcon, WifiIcon } from 'lucide-react';
import { QueryResults, ResultChunk } from '@/components/QueryResults';
import { searchSimilarChunks } from '@/utils/vectorUtils';

interface QueryPanelProps {
  getSelectedFolderIds: () => string[];
  selectedModel: string;
  selectedEmbeddingModel: EmbeddingModelType;
  selectedPlatform: string;
}

export const QueryPanel: React.FC<QueryPanelProps> = ({
  getSelectedFolderIds,
  selectedModel,
  selectedEmbeddingModel,
  selectedPlatform
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResultChunk[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isTestingEmbedding, setIsTestingEmbedding] = useState(false);
  const [isTestingLocalhost, setIsTestingLocalhost] = useState(false);
  const { toast } = useToast();
  const { 
    embeddingPipeline, 
    loadEmbeddingModel, 
    callModel,
    isLoading 
  } = useAiModel();

  const handleSearch = async () => {
    // Check for empty query first to prevent unnecessary processing
    if (!query?.trim()) {
      toast({
        title: "Vui lòng nhập truy vấn",
        description: "Hãy nhập nội dung truy vấn để tìm kiếm thông tin",
        variant: "default",
      });
      return;
    }

    try {
      setIsSearching(true);
      setResults([]);

      // Get selected folders
      const selectedFolderIds = getSelectedFolderIds();
      if (selectedFolderIds.length === 0) {
        toast({
          title: "Chưa chọn thư mục",
          description: "Vui lòng chọn ít nhất một thư mục để tìm kiếm",
          variant: "default",
        });
        setIsSearching(false);
        return;
      }

      // Ensure we have an embedding model loaded
      if (!embeddingPipeline) {
        toast({
          title: "Đang tải model embedding",
          description: "Vui lòng đợi trong khi model embedding đang được tải...",
        });
        await loadEmbeddingModel(selectedEmbeddingModel);
      }

      try {
        // Search for similar chunks
        const searchResults = await searchSimilarChunks(
          query,
          selectedEmbeddingModel,
          selectedFolderIds,
          10 // Get top 10 results
        );

        // Convert to ResultChunk format
        const formattedResults: ResultChunk[] = searchResults.map(chunk => ({
          id: chunk.id,
          text: chunk.text,
          score: chunk.score || 0,
          documentName: chunk.documentName,
          folderId: chunk.folderId
        }));

        setResults(formattedResults);

        if (formattedResults.length === 0) {
          toast({
            title: "Không tìm thấy kết quả",
            description: "Không tìm thấy kết quả phù hợp với truy vấn của bạn",
            variant: "default",
          });
        } else {
          toast({
            title: "Tìm kiếm hoàn tất",
            description: `Đã tìm thấy ${formattedResults.length} kết quả phù hợp`,
          });
        }
      } catch (error) {
        console.error('Error in vector search:', error);
        
        // Fall back to basic text search if embedding search fails
        toast({
          title: "Dùng tìm kiếm văn bản thay thế",
          description: "Tìm kiếm vector gặp lỗi, đang sử dụng tìm kiếm văn bản cơ bản",
          variant: "default",
        });
        
        // Simple text search fallback (for demo purposes)
        const queryLower = query.toLowerCase();
        
        // Import inMemoryVectorStore directly
        const { inMemoryVectorStore } = await import('@/utils/vectorUtils');
        
        // Filter chunks that contain the query text
        const filteredChunks = inMemoryVectorStore
          .filter(chunk => {
            // Only include chunks from selected folders
            if (!selectedFolderIds.includes(chunk.folderId)) return false;
            
            // Check if chunk contains query text
            return chunk.text.toLowerCase().includes(queryLower);
          })
          .map(chunk => ({
            ...chunk,
            score: 0.5 // Default score for text search
          }));
        
        // Convert to ResultChunk format
        const formattedResults: ResultChunk[] = filteredChunks.map(chunk => ({
          id: chunk.id,
          text: chunk.text,
          score: chunk.score || 0,
          documentName: chunk.documentName,
          folderId: chunk.folderId
        }));
        
        setResults(formattedResults);
        
        if (formattedResults.length === 0) {
          toast({
            title: "Không tìm thấy kết quả",
            description: "Không tìm thấy kết quả phù hợp với truy vấn của bạn",
            variant: "default",
          });
        } else {
          toast({
            title: "Tìm kiếm hoàn tất (tìm kiếm cơ bản)",
            description: `Đã tìm thấy ${formattedResults.length} kết quả phù hợp`,
          });
        }
      }
    } catch (error) {
      console.error('Error searching for documents:', error);
      toast({
        title: "Lỗi khi tìm kiếm",
        description: error instanceof Error ? error.message : "Có lỗi xảy ra khi thực hiện tìm kiếm",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Handle the Test Embedding Query button click
  const handleTestEmbedding = async () => {
    setIsTestingEmbedding(true);
    const testQuery = 'quy chuẩn xây dựng là gì?';
    
    try {
      console.log('[TEST] --- Starting Test Embedding Query ---');
      console.log(`[TEST] Query: "${testQuery}"`);
      console.log(`[TEST] Embedding Model: ${selectedEmbeddingModel}`);
      
      // Get selected folders
      const selectedFolderIds = getSelectedFolderIds();
      console.log(`[TEST] Selected Folders: ${selectedFolderIds.length > 0 ? selectedFolderIds.join(', ') : 'None'}`);
      
      if (selectedFolderIds.length === 0) {
        console.log('[TEST] No folders selected, using all folders for testing');
      }
      
      // Ensure we have an embedding model loaded
      if (!embeddingPipeline) {
        console.log('[TEST] No embedding pipeline loaded, loading now...');
        await loadEmbeddingModel(selectedEmbeddingModel);
      } else {
        console.log('[TEST] Using existing embedding pipeline');
      }
      
      // Search for similar chunks
      console.log('[TEST] Calling searchSimilarChunks function...');
      const searchResults = await searchSimilarChunks(
        testQuery,
        selectedEmbeddingModel,
        selectedFolderIds.length > 0 ? selectedFolderIds : [],
        5 // Get top 5 results for test
      );
      
      console.log('[TEST] Search results:', searchResults);
      console.log('[TEST] --- Finished Test Embedding Query ---');
      
      toast({
        title: "Test Embedding completed",
        description: `Found ${searchResults.length} results. Check console for details.`,
      });
    } catch (error) {
      console.error('[TEST] Error during test:', error);
      console.log('[TEST] --- Test Failed ---');
      
      toast({
        title: "Test Embedding failed",
        description: error instanceof Error ? error.message : "Unknown error during test",
        variant: "destructive",
      });
    } finally {
      setIsTestingEmbedding(false);
    }
  };

  // Test if we can connect to localhost:11434 (Ollama default API endpoint)
  const handleTestLocalhost = async () => {
    setIsTestingLocalhost(true);
    try {
      console.log("Attempting to fetch http://localhost:11434...");
      
      // Attempt to fetch from localhost:11434
      const response = await fetch('http://localhost:11434');
      
      // If we get here, the fetch succeeded (even if it's a 404 or other error from the server)
      console.log("Fetch succeeded (or server responded)");
      
      toast({
        title: "Connection Test Result",
        description: "Fetch to localhost:11434 succeeded. Check console for details.",
      });
    } catch (error) {
      // Check if it's a network error (like connection refused)
      if (error instanceof TypeError && error.message.includes('NetworkError')) {
        console.log("Fetch failed: Network Error (Connection Refused?)");
        toast({
          title: "Connection Test Result",
          description: "Network Error (Connection Refused). Check console for details.",
          variant: "destructive",
        });
      } 
      // Check if it's a CORS error
      else if (error instanceof TypeError && error.message.includes('CORS')) {
        console.log("Fetch failed: CORS Error");
        toast({
          title: "Connection Test Result",
          description: "CORS Error. Check console for details.",
          variant: "destructive",
        });
      } 
      // Other errors
      else {
        console.log(`Fetch failed: ${error instanceof Error ? error.message : String(error)}`);
        toast({
          title: "Connection Test Result",
          description: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          variant: "destructive",
        });
      }
    } finally {
      setIsTestingLocalhost(false);
    }
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Truy vấn tài liệu</h2>
      
      <div className="space-y-4">
        <Textarea
          placeholder="Nhập câu hỏi hoặc từ khóa để tìm kiếm trong tài liệu..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-[100px]"
        />
        
        <div className="flex justify-end gap-2 flex-wrap">
          {/* Test Localhost Connection Button */}
          <Button 
            onClick={handleTestLocalhost}
            disabled={isTestingLocalhost}
            variant="outline"
            className="gap-2"
          >
            {isTestingLocalhost ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <WifiIcon className="h-4 w-4" />
                Test Localhost Connection
              </>
            )}
          </Button>
          
          {/* Test Embedding Query Button */}
          <Button 
            onClick={handleTestEmbedding}
            disabled={isTestingEmbedding || isLoading}
            variant="outline"
            className="gap-2"
          >
            {isTestingEmbedding ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <BugIcon className="h-4 w-4" />
                Test Embedding Query
              </>
            )}
          </Button>
          
          {/* Regular Search Button */}
          <Button 
            onClick={handleSearch} 
            disabled={isSearching || isLoading}
            className="gap-2"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <SearchIcon className="h-4 w-4" />
                Truy vấn
              </>
            )}
          </Button>
        </div>
      </div>
      
      <QueryResults 
        isLoading={isSearching} 
        results={results} 
        query={query}
      />
    </div>
  );
};
