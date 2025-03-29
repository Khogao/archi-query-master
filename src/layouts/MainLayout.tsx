
import React from 'react';
import { ResizablePanelGroup } from '@/components/ui/resizable';
import { ResizableSidebar } from '@/components/ResizableSidebar';

interface MainLayoutProps {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  main: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ 
  header, 
  sidebar,
  main 
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm p-4">
        {header}
      </header>

      <div className="flex flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="w-full">
          <ResizableSidebar>
            {sidebar}
          </ResizableSidebar>
          <div className="flex-1 p-6 overflow-auto">
            {main}
          </div>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};
