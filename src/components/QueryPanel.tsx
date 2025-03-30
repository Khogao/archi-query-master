
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QueryResults, ResultChunk } from '@/components/QueryResults';
import { searchSimilarChunks } from '@/utils/vectorUtils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { AiModelType, EmbeddingModelType, PlatformType, useAiModel } from '@/hooks/useAiModel';

interface QueryPanelProps {
  getSelectedFolderIds: () => string[];
  selectedModel: AiModelType;
  selectedEmbeddingModel: EmbeddingModelType;
  selectedPlatform: PlatformType;
}

export const QueryPanel: React.FC<QueryPanelProps> = ({ 
  getSelectedFolderIds,
  selectedModel,
  selectedEmbeddingModel,
  selectedPlatform
}) => {
  const [chatInput, setChatInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<ResultChunk[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchProgress, setSearchProgress] = useState(0);
  const { toast } = useToast();
  const { 
    callModel, 
    isLoading, 
    isModelLoaded,
    loadModel,
    checkRamForModel,
    isLargeModel
  } = useAiModel(selectedModel, selectedPlatform, selectedEmbeddingModel);

  // Handle RAM check when component loads
  React.useEffect(() => {
    if (isLargeModel(selectedModel)) {
      checkRamForModel(selectedModel);
    }
  }, [selectedModel]);

  const handleSearch = async () => {
    if (!chatInput.trim()) return;
    
    // Get selected folders for search scope
    const selectedFolders = getSelectedFolderIds();
    setSearchQuery(chatInput);
    
    toast({
      title: "Đang xử lý",
      description: selectedFolders.length > 0 
        ? `Đang tìm kiếm trong ${selectedFolders.length} thư mục đã chọn` 
        : "Đang tìm kiếm trong tất cả các tài liệu",
    });

    setIsSearching(true);
    setResults([]);
    setSearchProgress(10); // Start progress

    try {
      // Simulate progress steps
      const updateProgress = () => {
        setSearchProgress(prev => {
          const increment = Math.floor(Math.random() * 15) + 5; // Random increment between 5-20
          return Math.min(prev + increment, 90); // Cap at 90% until complete
        });
      };
      
      // Set up progress updates
      const progressInterval = setInterval(updateProgress, 300);
      
      // Perform vector search
      const searchResults = await searchSimilarChunks(
        chatInput,
        selectedEmbeddingModel,
        selectedFolders,
        5 // Limit to top 5 results
      );

      clearInterval(progressInterval);
      setSearchProgress(100); // Complete progress

      // Map the vector chunks to result chunks with score
      const formattedResults: ResultChunk[] = searchResults.map(chunk => ({
        id: chunk.id,
        text: chunk.text,
        score: chunk.score || 0, // Provide a default value if score is undefined
        documentName: chunk.documentName,
        folderId: chunk.folderId
      }));

      setResults(formattedResults);

      if (formattedResults.length === 0) {
        toast({
          title: "Không tìm thấy kết quả",
          description: "Không tìm thấy tài liệu phù hợp với truy vấn của bạn",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Tìm kiếm hoàn tất",
          description: `Đã tìm thấy ${formattedResults.length} kết quả phù hợp`,
        });
        
        // If model is loaded, we could optionally generate an answer
        if (isModelLoaded) {
          // Prepare context from search results
          const context = formattedResults
            .map(r => `[${r.documentName}]: ${r.text}`)
            .join('\n\n');
          
          // Define prompt with context and query
          const prompt = `Dựa trên các đoạn trích sau đây:
          
${context}

Hãy trả lời câu hỏi sau một cách ngắn gọn: "${chatInput}"`;
          
          // Call the model asynchronously (we don't wait for this)
          callModel(prompt).then(response => {
            if (response) {
              console.log("Model response:", response);
              // Could display this in the UI if wanted
            }
          });
        }
      }
    } catch (error) {
      console.error('Error searching documents:', error);
      toast({
        title: "Lỗi tìm kiếm",
        description: "Đã xảy ra lỗi khi tìm kiếm tài liệu",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
      // Reset progress after a delay
      setTimeout(() => setSearchProgress(0), 500);
    }
  };

  const handleLoadModel = async () => {
    // Check RAM requirements first
    checkRamForModel(selectedModel);
    
    // Load the selected model
    await loadModel(selectedModel);
    
    toast({
      title: "Model đã sẵn sàng",
      description: `Model ${selectedModel} đã được tải và sẵn sàng sử dụng`,
    });
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Truy vấn thông tin</h2>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="mb-4 text-gray-600">Đặt câu hỏi về các quy định kiến trúc, quy hoạch hoặc pháp lý xây dựng:</p>
        <div className="flex gap-2">
          <Input 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ví dụ: Thủ tục nộp hồ sơ quy hoạch 1/500 ở Quận 12 TPHCM?"
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang truy vấn...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Truy vấn
              </>
            )}
          </Button>
        </div>
        
        {isSearching && searchProgress > 0 && (
          <div className="mt-2">
            <Progress value={searchProgress} className="h-2" />
            <p className="text-xs text-gray-500 mt-1">Đang tìm kiếm: {searchProgress}%</p>
          </div>
        )}
        
        <div className="mt-4 text-sm text-gray-500">
          <div className="flex justify-between items-center">
            <p>
              {getSelectedFolderIds().length > 0 ? 
                `Tìm kiếm trong ${getSelectedFolderIds().length} thư mục đã chọn` : 
                "Tìm kiếm trong tất cả tài liệu"}
            </p>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLoadModel}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Đang tải...
                </>
              ) : (
                'Tải model về máy'
              )}
            </Button>
          </div>
          
          <p className="mt-1">
            Model: {selectedModel} | Platform: {selectedPlatform} | Embedding: {selectedEmbeddingModel.split('/').pop()}
          </p>
        </div>

        {/* Results display */}
        <QueryResults 
          isLoading={isSearching} 
          results={results}
          query={searchQuery}
        />
      </div>
    </div>
  );
};
