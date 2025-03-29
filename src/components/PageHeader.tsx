
import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string; // Make description optional
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description }) => {
  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {description && <p className="text-gray-600">{description}</p>}
    </>
  );
};
