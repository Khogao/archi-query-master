
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QueryPanelProps {
  getSelectedFolderIds: () => string[];
}

export const QueryPanel: React.FC<QueryPanelProps> = ({ 
  getSelectedFolderIds 
}) => {
  const [chatInput, setChatInput] = useState('');
  const { toast } = useToast();

  const handleSearch = () => {
    if (!chatInput.trim()) return;
    
    // Get selected folders for search scope
    const selectedFolders = getSelectedFolderIds();
    
    toast({
      title: "Đang xử lý",
      description: selectedFolders.length > 0 
        ? `Đang tìm kiếm trong ${selectedFolders.length} thư mục đã chọn` 
        : "Đang tìm kiếm trong tất cả các tài liệu",
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
          />
          <Button onClick={handleSearch}>
            <Search className="mr-2 h-4 w-4" />
            Truy vấn
          </Button>
        </div>
        
        <div className="mt-4 text-sm text-gray-500">
          <p>
            {getSelectedFolderIds().length > 0 ? 
              `Tìm kiếm trong ${getSelectedFolderIds().length} thư mục đã chọn` : 
              "Tìm kiếm trong tất cả tài liệu"}
          </p>
        </div>
      </div>
    </div>
  );
};
