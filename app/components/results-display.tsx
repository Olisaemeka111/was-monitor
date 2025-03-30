import React from 'react';

interface ResultsDisplayProps {
  results: any;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results }) => {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Results</h2>
      <pre className="bg-gray-100 p-4 rounded overflow-auto">
        {JSON.stringify(results, null, 2)}
      </pre>
    </div>
  );
};

export default ResultsDisplay;
