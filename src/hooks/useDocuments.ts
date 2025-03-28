
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface DocumentItem {
  id: string;
  name: string;
  type: 'pdf' | 'docx';
  size: string;
  dateAdded: string;
  folderId: string;
}

export interface Folder {
  id: string;
  name: string;
}

export const useDocuments = () => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<DocumentItem[]>([
    { id: '1', name: 'Quy chuẩn thiết kế 01-2021', type: 'pdf', size: '2.4 MB', dateAdded: '2023-10-15', folderId: 'arch' },
    { id: '2', name: 'Thông tư 16-2019 Quy hoạch xây dựng', type: 'pdf', size: '3.8 MB', dateAdded: '2023-10-14', folderId: 'arch' },
    { id: '3', name: 'Luật Xây dựng 2020', type: 'docx', size: '1.2 MB', dateAdded: '2023-10-13', folderId: 'legal' },
  ]);
  
  const [folders, setFolders] = useState<Folder[]>([
    { id: 'arch', name: 'Kiến trúc & Quy hoạch' },
    { id: 'standards', name: 'Quy chuẩn xây dựng' },
    { id: 'legal', name: 'Pháp lý' },
  ]);

  const addDocument = (document: Omit<DocumentItem, 'id' | 'dateAdded'>) => {
    const newDoc = {
      ...document,
      id: Date.now().toString(),
      dateAdded: new Date().toISOString().split('T')[0],
    };
    
    setDocuments(prev => [...prev, newDoc]);
    toast({
      title: "Tải lên thành công",
      description: `Đã thêm tài liệu "${document.name}" vào hệ thống`,
    });
    
    return newDoc;
  };

  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    toast({
      title: "Đã xóa tài liệu",
      description: "Tài liệu đã được xóa khỏi hệ thống",
    });
  };

  const addFolder = (name: string) => {
    const newFolder = {
      id: Date.now().toString(),
      name,
    };
    
    setFolders(prev => [...prev, newFolder]);
    toast({
      title: "Đã tạo thư mục mới",
      description: `Thư mục "${name}" đã được thêm vào hệ thống`,
    });
    
    return newFolder;
  };

  const getDocumentsByFolder = (folderId: string) => {
    return documents.filter(doc => doc.folderId === folderId);
  };

  return {
    documents,
    folders,
    addDocument,
    deleteDocument,
    addFolder,
    getDocumentsByFolder,
  };
};
