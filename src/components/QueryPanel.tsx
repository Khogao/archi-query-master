
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QueryResults, ResultChunk } from '@/components/QueryResults';
import { searchSimilarChunks } from '@/utils/vectorUtils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AiModelType, EmbeddingModelType, PlatformType } from '@/hooks/useAiModel';

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
  const { toast } = useToast();

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

    try {
      // Perform vector search
      const searchResults = await searchSimilarChunks(
        chatInput,
        selectedEmbeddingModel,
        selectedFolders,
        5 // Limit to top 5 results
      );

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
    }
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
            <Search className="mr-2 h-4 w-4" />
            {isSearching ? 'Đang truy vấn...' : 'Truy vấn'}
          </Button>
        </div>
        
        <div className="mt-4 text-sm text-gray-500">
          <p>
            {getSelectedFolderIds().length > 0 ? 
              `Tìm kiếm trong ${getSelectedFolderIds().length} thư mục đã chọn` : 
              "Tìm kiếm trong tất cả tài liệu"}
          </p>
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
