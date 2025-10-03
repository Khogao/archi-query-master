# Integration Guide - Production Features

## 🔗 How to Integrate New Features into Existing Code

### Step 1: Initialize Persistent Storage

Update `src/main.tsx`:

```typescript
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeDatabase } from './utils/persistentStorage';

// Initialize database before rendering app
initializeDatabase().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
}).catch(error => {
  console.error('Failed to initialize database:', error);
  // Render app anyway with in-memory fallback
  createRoot(document.getElementById("root")!).render(<App />);
});
```

### Step 2: Update useDocuments Hook

Modify `src/hooks/useDocuments.ts` to use persistent storage:

```typescript
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  DocumentStorage, 
  FolderStorage, 
  StoredDocument, 
  StoredFolder 
} from '@/utils/persistentStorage';

export const useDocuments = () => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [folders, setFolders] = useState<StoredFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from IndexedDB on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const loadedDocs = await DocumentStorage.getAll();
        const loadedFolders = await FolderStorage.getAll();
        
        setDocuments(loadedDocs);
        setFolders(loadedFolders);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Lỗi tải dữ liệu",
          description: "Không thể tải dữ liệu từ bộ nhớ",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const addDocument = async (document: Omit<StoredDocument, 'id' | 'dateAdded'>) => {
    const newDoc = {
      ...document,
      id: Date.now().toString(),
      dateAdded: new Date().toISOString().split('T')[0],
    };
    
    try {
      await DocumentStorage.save(newDoc);
      setDocuments(prev => [...prev, newDoc]);
      
      toast({
        title: "Tải lên thành công",
        description: `Đã thêm tài liệu "${document.name}" vào hệ thống`,
      });
      
      return newDoc;
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể lưu tài liệu",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      await DocumentStorage.delete(id);
      setDocuments(prev => prev.filter(doc => doc.id !== id));
      
      toast({
        title: "Đã xóa tài liệu",
        description: "Tài liệu đã được xóa khỏi hệ thống",
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xóa tài liệu",
        variant: "destructive",
      });
    }
  };

  // ... rest of the methods with persistent storage integration
  
  return {
    documents,
    folders,
    isLoading,
    addDocument,
    deleteDocument,
    // ... other methods
  };
};
```

### Step 3: Update Vector Search with Persistent Storage

Modify `src/utils/vectorUtils.ts`:

```typescript
import { ChunkStorage } from './persistentStorage';

export async function searchSimilarChunks(
  query: string,
  embeddingModelId: EmbeddingModelType,
  folderIds: string[] = [],
  limit: number = 5
): Promise<VectorChunk[]> {
  logDiagnostic(`Searching for similar chunks with model: ${embeddingModelId}`);
  
  try {
    // Load chunks from persistent storage
    const allChunks = folderIds.length > 0
      ? await ChunkStorage.getByFolders(folderIds)
      : await ChunkStorage.getAll();
    
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query, embeddingModelId);
    
    // Calculate similarity scores
    const scoredChunks = allChunks.map(chunk => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));
    
    // Sort and return top results
    scoredChunks.sort((a, b) => (b.score || 0) - (a.score || 0));
    return scoredChunks.slice(0, limit);
  } catch (error) {
    logDiagnostic(`Error in vector search: ${error}`, 'error');
    // Fallback to in-memory search
    return performTextSearch(query, folderIds, limit);
  }
}
```

### Step 4: Add Performance Monitoring to Components

Update `src/components/QueryPanel.tsx`:

```typescript
import { perfMonitor } from '@/utils/performance';

export const QueryPanel: React.FC<QueryPanelProps> = ({...props}) => {
  const handleSearch = async () => {
    perfMonitor.mark('search-start');
    
    try {
      setIsSearching(true);
      
      // ... existing search logic
      
      perfMonitor.mark('search-end');
      perfMonitor.measure('Search Operation', 'search-start', 'search-end');
      
      // Log performance in development
      if (process.env.NODE_ENV === 'development') {
        perfMonitor.report();
      }
    } catch (error) {
      // ... error handling
    } finally {
      setIsSearching(false);
    }
  };
  
  return (/* ... */);
};
```

### Step 5: Add Virtual Scrolling to Document List

Update `src/components/DocumentList.tsx`:

```typescript
import { useVirtualScroll } from '@/utils/performance';

export const DocumentList: React.FC<{documents: Document[]}> = ({documents}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const ITEM_HEIGHT = 80;
  const CONTAINER_HEIGHT = 600;
  
  const { visibleItems, totalHeight, offsetY, onScroll } = useVirtualScroll(
    documents,
    ITEM_HEIGHT,
    CONTAINER_HEIGHT
  );
  
  return (
    <div 
      ref={containerRef}
      style={{ height: CONTAINER_HEIGHT, overflow: 'auto' }}
      onScroll={onScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((doc, index) => (
            <div key={doc.id} style={{ height: ITEM_HEIGHT }}>
              {/* Document item content */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

### Step 6: Add Caching to AI Model Hook

Update `src/hooks/useAiModel.ts`:

```typescript
import { embeddingCache } from '@/utils/performance';

export const useAiModel = () => {
  const generateEmbedding = async (text: string) => {
    // Check cache first
    const cached = embeddingCache.get(text);
    if (cached) {
      console.log('Using cached embedding');
      return { data: cached };
    }
    
    // Generate new embedding
    if (embeddingPipeline) {
      const result = await embeddingPipeline(text, { 
        pooling: "mean", 
        normalize: true 
      });
      
      // Cache the result
      embeddingCache.set(text, Array.from(result.data));
      
      return result;
    }
    
    throw new Error('Embedding pipeline not initialized');
  };
  
  return { generateEmbedding, /* ... */ };
};
```

### Step 7: Add Database Management UI

Create `src/components/DatabaseManager.tsx`:

```typescript
import React from 'react';
import { Button } from '@/components/ui/button';
import { DatabaseUtils } from '@/utils/persistentStorage';
import { useToast } from '@/hooks/use-toast';

export const DatabaseManager: React.FC = () => {
  const { toast } = useToast();
  const [size, setSize] = React.useState({ documents: 0, chunks: 0, folders: 0 });
  
  const loadSize = async () => {
    const dbSize = await DatabaseUtils.getSize();
    setSize(dbSize);
  };
  
  React.useEffect(() => {
    loadSize();
  }, []);
  
  const handleExport = async () => {
    try {
      const data = await DatabaseUtils.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archi-query-backup-${Date.now()}.json`;
      a.click();
      
      toast({
        title: "Export thành công",
        description: "Đã tải xuống file backup"
      });
    } catch (error) {
      toast({
        title: "Lỗi export",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };
  
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      await DatabaseUtils.importData(text);
      await loadSize();
      
      toast({
        title: "Import thành công",
        description: "Đã khôi phục dữ liệu từ backup"
      });
    } catch (error) {
      toast({
        title: "Lỗi import",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };
  
  const handleClear = async () => {
    if (confirm('Bạn có chắc muốn xóa toàn bộ dữ liệu?')) {
      await DatabaseUtils.clearAll();
      await loadSize();
      
      toast({
        title: "Đã xóa dữ liệu",
        description: "Toàn bộ dữ liệu đã được xóa"
      });
    }
  };
  
  return (
    <div className="space-y-4 p-4 border rounded">
      <h3 className="font-semibold">Quản lý Database</h3>
      
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="font-medium">Tài liệu</div>
          <div className="text-2xl">{size.documents}</div>
        </div>
        <div>
          <div className="font-medium">Chunks</div>
          <div className="text-2xl">{size.chunks}</div>
        </div>
        <div>
          <div className="font-medium">Thư mục</div>
          <div className="text-2xl">{size.folders}</div>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button onClick={handleExport} variant="outline">
          Export Data
        </Button>
        
        <Button variant="outline" asChild>
          <label>
            Import Data
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </Button>
        
        <Button onClick={handleClear} variant="destructive">
          Clear All
        </Button>
      </div>
    </div>
  );
};
```

### Step 8: Add Performance Dashboard

Create `src/components/PerformanceDashboard.tsx`:

```typescript
import React from 'react';
import { perfMonitor } from '@/utils/performance';
import { Card } from '@/components/ui/card';

export const PerformanceDashboard: React.FC = () => {
  const [measures, setMeasures] = React.useState<Array<{name: string; duration: number}>>([]);
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setMeasures(perfMonitor.getMeasures());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">Performance Metrics</h3>
      
      <div className="space-y-2">
        {measures.slice(-10).map((measure, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span>{measure.name}</span>
            <span className="font-mono">
              {measure.duration.toFixed(2)}ms
            </span>
          </div>
        ))}
      </div>
      
      {measures.length === 0 && (
        <div className="text-sm text-gray-500">No metrics yet</div>
      )}
    </Card>
  );
};
```

## 🎯 Testing Integration

### Run Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test vectorUtils.test

# Generate coverage
npm run test:coverage
```

### Add New Tests
```typescript
// src/components/QueryPanel.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryPanel } from './QueryPanel';

describe('QueryPanel', () => {
  it('should render search input', () => {
    render(<QueryPanel {...mockProps} />);
    expect(screen.getByPlaceholderText(/nhập câu hỏi/i)).toBeInTheDocument();
  });
  
  it('should call search function on button click', async () => {
    const mockSearch = vi.fn();
    render(<QueryPanel onSearch={mockSearch} {...mockProps} />);
    
    const button = screen.getByRole('button', { name: /truy vấn/i });
    fireEvent.click(button);
    
    expect(mockSearch).toHaveBeenCalled();
  });
});
```

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Environment Variables
Create `.env.production`:
```env
VITE_SUPABASE_PROJECT_ID="production-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="production-key"
VITE_SUPABASE_URL="production-url"
```

## 📊 Monitoring in Production

Add error tracking:
```typescript
// src/utils/errorTracking.ts
export function setupErrorTracking() {
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // Send to error tracking service (Sentry, etc.)
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Send to error tracking service
  });
}
```

Add to `src/main.tsx`:
```typescript
import { setupErrorTracking } from './utils/errorTracking';

setupErrorTracking();
```

## 🎉 Complete!

You now have:
- ✅ Real OCR implementation
- ✅ Persistent storage with IndexedDB
- ✅ Performance optimizations
- ✅ Comprehensive testing suite
- ✅ Production-ready code

For questions or issues, refer to PRODUCTION_FEATURES.md
