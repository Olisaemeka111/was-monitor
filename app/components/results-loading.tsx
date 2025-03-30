import React from 'react';

const ResultsLoading: React.FC = () => {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      <span className="ml-3 text-lg">Loading results...</span>
    </div>
  );
};

export default ResultsLoading;
