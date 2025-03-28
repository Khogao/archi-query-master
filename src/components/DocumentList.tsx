
import React from 'react';
import { Button } from '@/components/ui/button';
import { FileX } from 'lucide-react';
import { DocumentItem } from '@/hooks/useDocuments';

interface DocumentListProps {
  documents: DocumentItem[];
  onDelete: (id: string) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({ 
  documents, 
  onDelete 
}) => {
  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Không có tài liệu nào trong thư mục này.
      </div>
    );
  }

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên tài liệu</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kích thước</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày thêm</th>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {documents.map((doc) => (
          <tr key={doc.id}>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{doc.name}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 uppercase">{doc.type}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.size}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.dateAdded}</td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <Button variant="ghost" size="sm" onClick={() => onDelete(doc.id)}>
                <FileX className="h-4 w-4 text-red-500" />
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
