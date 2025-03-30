
import React from 'react';
import { Separator } from "@/components/ui/separator";
import { FileText, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export interface ResultChunk {
  id: string;
  text: string;
  score: number;
  documentName: string;
  folderId: string;
}

interface QueryResultsProps {
  isLoading: boolean;
  results: ResultChunk[];
  query: string;
}

export const QueryResults: React.FC<QueryResultsProps> = ({ 
  isLoading, 
  results, 
  query 
}) => {
  if (isLoading) {
    return (
      <div className="mt-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
          <span className="text-gray-700">Đang xử lý truy vấn...</span>
          <Progress value={45} className="h-1 mt-4 w-full max-w-xs" />
        </div>
      </div>
    );
  }

  if (results.length === 0 && query) {
    return (
      <div className="mt-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-700">Không tìm thấy kết quả phù hợp</h3>
        <p className="text-gray-500 mt-2">Vui lòng thử truy vấn khác hoặc chọn thêm thư mục để tìm kiếm.</p>
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  // Format a score as a percentage
  const formatScore = (score: number) => {
    return `${(score * 100).toFixed(1)}%`;
  };

  // Highlight query terms in result text
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    // Split query into words and create a regex pattern
    const words = query.trim().split(/\s+/).map(word => 
      word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // Escape regex special chars
    
    const pattern = new RegExp(`(${words.join('|')})`, 'gi');
    
    // Split by pattern and wrap matches in highlight spans
    const parts = text.split(pattern);
    
    return parts.map((part, i) => {
      if (pattern.test(part)) {
        return <span key={i} className="bg-yellow-100 px-0.5 rounded">{part}</span>;
      }
      return part;
    });
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium mb-4">Kết quả tìm kiếm ({results.length})</h3>
      <div className="space-y-4">
        {results.map((result) => (
          <div key={result.id} className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                <span className="font-medium">{result.documentName}</span>
              </div>
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                Tương đồng: {formatScore(result.score)}
              </span>
            </div>
            <Separator className="my-2" />
            <p className="text-gray-800 whitespace-pre-line">
              {highlightMatch(result.text, query)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
