
import React, { useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ResizableSidebarProps {
  children: React.ReactNode;
}

export const ResizableSidebar: React.FC<ResizableSidebarProps> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(20); // Percentage of screen width
  const defaultCollapsedWidth = 0;
  const defaultExpandedWidth = 20;
  const minWidth = 15; // Minimum sidebar width (%)
  const maxWidth = 40; // Maximum sidebar width (%)

  const toggleSidebar = () => {
    if (isCollapsed) {
      // Expand sidebar
      setIsCollapsed(false);
      setSidebarWidth(defaultExpandedWidth);
    } else {
      // Collapse sidebar
      setIsCollapsed(true);
      setSidebarWidth(defaultCollapsedWidth);
    }
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full w-full">
      <ResizablePanel 
        defaultSize={sidebarWidth} 
        minSize={isCollapsed ? 0 : minWidth} 
        maxSize={maxWidth}
        collapsible={true}
        collapsedSize={defaultCollapsedWidth}
        onCollapse={() => setIsCollapsed(true)}
        onExpand={() => setIsCollapsed(false)}
        onResize={(size) => {
          if (!isCollapsed && size !== sidebarWidth) {
            setSidebarWidth(size);
          }
        }}
        className={`relative bg-white ${isCollapsed ? 'p-0' : ''}`}
      >
        {!isCollapsed && (
          <div className="h-full overflow-auto">{children}</div>
        )}
      </ResizablePanel>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow-md rounded-r-md border border-l-0"
        style={{ 
          left: isCollapsed ? '0' : 'auto',
          right: isCollapsed ? 'auto' : '0',
          transform: isCollapsed ? 'translateY(-50%)' : 'translate(50%, -50%)'
        }}
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>
      
      {!isCollapsed && (
        <ResizableHandle withHandle />
      )}
      
      <ResizablePanel defaultSize={isCollapsed ? 100 : 100 - sidebarWidth}>
        <div className="h-full bg-gray-50 overflow-auto">{/* Main content will be rendered here */}</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
