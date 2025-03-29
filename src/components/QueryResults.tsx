
import React from 'react';
import { Separator } from "@/components/ui/separator";
import { FileText } from 'lucide-react';

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
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-t-blue-500 border-b-blue-500 rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-700">Đang xử lý truy vấn...</span>
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

  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium mb-4">Kết quả tìm kiếm ({results.length})</h3>
      <div className="space-y-4">
        {results.map((result) => (
          <div key={result.id} className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <FileText className="h-4 w-4 mr-1" />
              <span>{result.documentName}</span>
              <span className="mx-2">•</span>
              <span>Điểm tương đồng: {result.score.toFixed(2)}</span>
            </div>
            <p className="text-gray-800 whitespace-pre-line">{result.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
