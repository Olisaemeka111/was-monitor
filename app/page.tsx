"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOutput("");

    try {
      const response = await fetch("/api/upload-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessKey, secretKey, region }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to run analysis");
      }

      setOutput(data.output);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">AWS Infrastructure Monitor</h1>
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Enter AWS Credentials</CardTitle>
            <CardDescription>
              Enter your AWS credentials to run the infrastructure monitoring script. The script
              will analyze your AWS resources and provide optimization recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="direct" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="direct">Direct Input</TabsTrigger>
                <TabsTrigger value="file">File Upload</TabsTrigger>
              </TabsList>

              <TabsContent value="direct">
                <form onSubmit={handleDirectSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="accessKey">Access Key</Label>
                    <Input
                      id="accessKey"
                      value={accessKey}
                      onChange={(e) => setAccessKey(e.target.value)}
                      required
                      placeholder="AWS Access Key ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secretKey">Secret Key</Label>
                    <Input
                      id="secretKey"
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      required
                      type="password"
                      placeholder="AWS Secret Access Key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="region">Region</Label>
                    <Input
                      id="region"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      required
                      placeholder="AWS Region (e.g., us-east-1)"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Running Analysis..." : "Run Analysis"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="file">
                <form className="space-y-4" onSubmit={async (e) => {
                    e.preventDefault();
                    const fileInput = fileInputRef.current;

                    if (!fileInput?.files?.length) {
                      setError("Please select a file");
                      return;
                    }

                    const file = fileInput.files[0];
                    const validExtensions = [".txt", ".json", ".csv", ".env", ".config"];
                    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

                    if (!validExtensions.includes(fileExt)) {
                      setError(`Invalid file type. Supported formats: ${validExtensions.join(", ")}`);
                      return;
                    }

                    setLoading(true);
                    setError("");
                    setOutput("");

                    try {
                      const formData = new FormData();
                      const accountNameInput = document.getElementById('accountName') as HTMLInputElement;
                      const accountName = accountNameInput?.value;
                      
                      if (!accountName) {
                        setError('Please enter an account name');
                        return;
                      }

                      formData.append("credentials", file);
                      formData.append("accountName", accountName);

                      const response = await fetch("/api/upload-file", {
                        method: "POST",
                        body: formData
                      });

                      if (!response.ok) {
                        const data = await response.json();
                        throw new Error(data.error || "Failed to upload file");
                      }

                      const data = await response.json();
                      console.log("Upload response:", data);

                      if (data.error) {
                        throw new Error(data.error);
                      }

                      setOutput(data.output || "File uploaded successfully");
                    } catch (err) {
                      console.error("Upload error:", err);
                      setError((err as Error).message);
                    } finally {
                      setLoading(false);
                    }
                  }}>

                  <div className="space-y-2">
                    <Label htmlFor="accountName">Account Name</Label>
                    <Input
                      id="accountName"
                      name="accountName"
                      required
                      placeholder="Enter AWS account name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="file">AWS Credentials File</Label>
                    <Input
                      id="file"
                      type="file"
                      ref={fileInputRef}
                      accept=".txt,.json,.csv,.env,.config"
                      required
                    />
                    <p className="text-sm text-gray-500">
                      Supported formats: .txt, .json, .csv, .env, .config
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Uploading..." : "Upload & Analyze"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-600 rounded">{error}</div>
            )}

            {output && (
              <div className="mt-4 p-4 bg-gray-50 rounded">
                <pre className="whitespace-pre-wrap font-mono text-sm">{output}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

