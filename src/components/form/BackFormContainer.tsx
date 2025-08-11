import React from 'react';

export const BackFormContainer: React.FC<any> = ({ 
  title, 
  subtitle, 
  children, 
  className = '' 
}) => (
  <div className={`flex pt-12 xl:pt-18 justify-center h-full px-6 bg-black ${className} overflow-y-auto`}>
    <div className="w-full max-w-md space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-600">{subtitle}</p>
      {children}
    </div>
  </div>
);