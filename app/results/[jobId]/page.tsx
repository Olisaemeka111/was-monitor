import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getJobStatus } from "@/lib/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResultsDisplay } from "@/components/results-display"
import { ResultsLoading } from "@/components/results-loading"

interface ResultsPageProps {
  params: {
    jobId: string
  }
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  try {
    if (!params?.jobId) {
      notFound()
    }
    const jobStatus = await getJobStatus(params.jobId)

    if (jobStatus.status === "unknown") {
      notFound()
    }

    return (
      <main className="container mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold mb-6 text-center">AWS Infrastructure Analysis Results</h1>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Analysis Results</CardTitle>
              <CardDescription>Job ID: {params.jobId}</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<ResultsLoading />}>
                <ResultsDisplay jobId={params.jobId} initialStatus={jobStatus} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  } catch (error) {
    console.error("Error in results page:", error)
    notFound()
  }
}

