'use client';

interface ResultsDisplayProps {
  jobId: string;
  results: any;
}

export default function ResultsDisplay({ jobId, results }: ResultsDisplayProps) {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Job Results: {jobId}</h2>
      <pre className="bg-gray-100 p-4 rounded overflow-auto">
        {JSON.stringify(results, null, 2)}
      </pre>
    </div>
  );
}
