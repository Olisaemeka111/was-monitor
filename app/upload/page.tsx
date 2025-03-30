'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

export default function UploadPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('credentials', file);

    try {
      const response = await fetch('/api/upload-credentials', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload credentials');
      }

      toast({
        title: 'Success',
        description: 'AWS credentials uploaded successfully. Running service check...',
      });

      // Trigger the service checker script
      const checkResponse = await fetch('/api/run-service-check');
      const results = await checkResponse.json();

      // Redirect to results page
      window.location.href = '/results';
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process AWS credentials',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="p-6 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">Upload AWS Credentials</h1>
        <p className="text-gray-600 mb-4">
          Upload your AWS credentials file to start monitoring your services.
        </p>
        <div className="space-y-4">
          <input
            type="file"
            accept=".txt,.ini"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-primary file:text-white
              hover:file:bg-primary/90"
            disabled={isLoading}
          />
          {isLoading && (
            <div className="text-sm text-gray-500">Processing...</div>
          )}
        </div>
      </Card>
    </div>
  );
}
