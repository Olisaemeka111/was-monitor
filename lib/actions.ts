"use server"

import { v4 as uuidv4 } from "uuid"
import { exec } from 'child_process'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

interface JobData {
  status: string
  output?: string
  error?: string
  files?: Array<{
    name: string
    content: ArrayBuffer
    type: string
    size: number
  }>
}

// File-based storage for jobs
const JOBS_DIR = path.join(process.cwd(), '.jobs')

const jobStorage = {
  async init() {
    try {
      await mkdir(JOBS_DIR, { recursive: true })
    } catch (error) {
      console.error('Error creating jobs directory:', error)
    }
  },

  async get(jobId: string): Promise<JobData | null> {
    try {
      const filePath = path.join(JOBS_DIR, `${jobId}.json`)
      const content = await readFile(filePath, 'utf-8')
      return JSON.parse(content) as JobData
    } catch (error) {
      return null
    }
  },

  async set(jobId: string, data: JobData): Promise<void> {
    try {
      const filePath = path.join(JOBS_DIR, `${jobId}.json`)
      await writeFile(filePath, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('Error saving job data:', error)
    }
  }
}

// Initialize jobs directory
jobStorage.init()

// Define the type for credentials
type Credentials = {
  accessKey: string
  secretKey: string
  region: string
}

// Define the type for the result
type UploadResult = {
  success: boolean
  jobId?: string
  error?: string
}

// Function to format output with colors (for terminal-like output)
function formatOutput(
  text: string,
  type: "header" | "success" | "error" | "warning" | "info" | "bold" | "normal" = "normal",
): string {
  // We'll use HTML-like tags that we can later replace with terminal colors or HTML
  switch (type) {
    case "header":
      return `<header>${text}</header>`
    case "success":
      return `<success>${text}</success>`
    case "error":
      return `<error>${text}</error>`
    case "warning":
      return `<warning>${text}</warning>`
    case "info":
      return `<info>${text}</info>`
    case "bold":
      return `<bold>${text}</bold>`
    default:
      return text
  }
}

// Function to convert the formatted output to terminal-friendly output
function convertToTerminalOutput(formattedOutput: string): string {
  // Define ANSI color codes
  const RED = "\x1b[31m"
  const GREEN = "\x1b[32m"
  const YELLOW = "\x1b[33m"
  const BLUE = "\x1b[34m"
  const CYAN = "\x1b[36m"
  const BOLD = "\x1b[1m"
  const RESET = "\x1b[0m"

  // Replace HTML-like tags with ANSI color codes
  return formattedOutput
    .replace(/<header>(.*?)<\/header>/g, `${BOLD}${BLUE}$1${RESET}`)
    .replace(/<success>(.*?)<\/success>/g, `${GREEN}$1${RESET}`)
    .replace(/<error>(.*?)<\/error>/g, `${RED}$1${RESET}`)
    .replace(/<warning>(.*?)<\/warning>/g, `${YELLOW}$1${RESET}`)
    .replace(/<info>(.*?)<\/info>/g, `${CYAN}$1${RESET}`)
    .replace(/<bold>(.*?)<\/bold>/g, `${BOLD}$1${RESET}`)
}

// Function to extract credentials from JSON file content
function extractFromJson(content: string): {
  success: boolean
  accessKey?: string
  secretKey?: string
  region?: string
  error?: string
} {
  try {
    const jsonData = JSON.parse(content)

    // Try different common JSON structures
    const accessKey =
      jsonData.accessKey ||
      jsonData.access_key ||
      jsonData.accessKeyId ||
      jsonData.access_key_id ||
      jsonData.AWS_ACCESS_KEY_ID ||
      (jsonData.credentials && jsonData.credentials.accessKeyId) ||
      (jsonData.aws && jsonData.aws.accessKeyId)

    const secretKey =
      jsonData.secretKey ||
      jsonData.secret_key ||
      jsonData.secretAccessKey ||
      jsonData.secret_access_key ||
      jsonData.AWS_SECRET_ACCESS_KEY ||
      (jsonData.credentials && jsonData.credentials.secretAccessKey) ||
      (jsonData.aws && jsonData.aws.secretAccessKey)

    const region =
      jsonData.region ||
      jsonData.aws_region ||
      jsonData.AWS_REGION ||
      (jsonData.credentials && jsonData.credentials.region) ||
      (jsonData.aws && jsonData.aws.region) ||
      "us-east-1" // Default region

    if (!accessKey || !secretKey) {
      return {
        success: false,
        error: "Could not find AWS credentials in JSON file",
      }
    }

    return {
      success: true,
      accessKey,
      secretKey,
      region,
    }
  } catch (error) {
    return {
      success: false,
      error: `Invalid JSON file: ${(error as Error).message}`,
    }
  }
}

// Function to extract credentials from text file content
function extractFromText(content: string): {
  success: boolean
  accessKey?: string
  secretKey?: string
  region?: string
  error?: string
} {
  try {
    const lines = content.split("\n")

    let accessKey, secretKey, region

    // Look for patterns in each line
    for (const line of lines) {
      const trimmedLine = line.trim()

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith("#")) continue

      // Check for AWS credential patterns
      if (trimmedLine.includes("=")) {
        const [key, value] = trimmedLine.split("=").map((part) => part.trim())
        const lowerKey = key.toLowerCase()

        if (lowerKey.includes("aws_access_key_id") || lowerKey.includes("access_key")) {
          accessKey = value.replace(/["']/g, "") // Remove quotes if present
        } else if (lowerKey.includes("aws_secret_access_key") || lowerKey.includes("secret_key")) {
          secretKey = value.replace(/["']/g, "") // Remove quotes if present
        } else if (lowerKey.includes("region") || lowerKey.includes("aws_region")) {
          region = value.replace(/["']/g, "") // Remove quotes if present
        }
      } else {
        // Try to find access key by pattern (starts with AKIA)
        if (!accessKey && trimmedLine.includes("AKIA")) {
          const match = trimmedLine.match(/AKIA[A-Z0-9]{16}/)
          if (match) {
            accessKey = match[0]
          }
        }

        // Secret keys are harder to identify by pattern alone
        if (!secretKey && accessKey && trimmedLine.length >= 16 && !trimmedLine.includes("AKIA")) {
          // This is a very rough heuristic - in a real app, you'd want more sophisticated detection
          secretKey = trimmedLine.replace(/["']/g, "").trim()
        }
      }
    }

    if (!accessKey || !secretKey) {
      return {
        success: false,
        error: "Could not find AWS credentials in text file",
      }
    }

    return {
      success: true,
      accessKey,
      secretKey,
      region: region || "us-east-1", // Default region
    }
  } catch (error) {
    return {
      success: false,
      error: `Invalid text file: ${(error as Error).message}`,
    }
  }
}

// Function to extract credentials from CSV file content
function extractFromCsv(content: string): {
  success: boolean
  accessKey?: string
  secretKey?: string
  region?: string
  error?: string
} {
  try {
    // Simple CSV parsing
    const lines = content.split("\n")
    if (lines.length === 0) {
      return {
        success: false,
        error: "CSV file is empty",
      }
    }

    // Get headers
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())

    // Look for credential columns
    const accessKeyIndex = headers.findIndex(
      (h) => (h.includes("access") && h.includes("key")) || h === "accesskeyid" || h === "access_key_id",
    )

    const secretKeyIndex = headers.findIndex(
      (h) => (h.includes("secret") && h.includes("key")) || h === "secretaccesskey" || h === "secret_access_key",
    )

    const regionIndex = headers.findIndex((h) => h === "region" || h === "aws_region")

    // If we found the columns, get the values from the first data row
    if (accessKeyIndex >= 0 && secretKeyIndex >= 0 && lines.length > 1) {
      const dataRow = lines[1].split(",").map((v) => v.trim())
      const accessKey = dataRow[accessKeyIndex]
      const secretKey = dataRow[secretKeyIndex]
      const region = regionIndex >= 0 ? dataRow[regionIndex] : "us-east-1"

      if (accessKey && secretKey) {
        return {
          success: true,
          accessKey,
          secretKey,
          region,
        }
      }
    }

    // If we couldn't find by column name, try to infer from values
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim())

      // Look for values that match AWS credential patterns
      const accessKeyValue = values.find((v) => v.startsWith("AKIA"))
      const secretKeyValue = values.find((v) => v.length >= 16 && !v.startsWith("AKIA"))

      if (accessKeyValue && secretKeyValue) {
        return {
          success: true,
          accessKey: accessKeyValue,
          secretKey: secretKeyValue,
          region: "us-east-1", // Default region
        }
      }
    }

    return {
      success: false,
      error: "Could not find AWS credentials in CSV file",
    }
  } catch (error) {
    return {
      success: false,
      error: `Invalid CSV file: ${(error as Error).message}`,
    }
  }
}

// Function to extract credentials from a file
async function extractCredentialsFromFile(
  jobId: string,
  fileName: string,
): Promise<{ success: boolean; accessKey?: string; secretKey?: string; region?: string; error?: string }> {
  try {
    const job = await jobStorage.get(jobId)
    if (!job || !job.files) {
      return { success: false, error: "File not found" }
    }

    const file = job.files.find((f: { name: string }) => f.name === fileName)
    if (!file) {
      return { success: false, error: `File ${fileName} not found` }
    }

    // Convert ArrayBuffer to string
    const content = new TextDecoder().decode(file.content)
    const fileExtension = fileName.split(".").pop()?.toLowerCase()

    switch (fileExtension) {
      case "json":
        return extractFromJson(content)
      case "txt":
      case "env":
      case "config":
        return extractFromText(content)
      case "csv":
        return extractFromCsv(content)
      case "xls":
      case "xlsx":
        return {
          success: false,
          error: "Excel parsing is not supported in this environment. Please convert to CSV or JSON.",
        }
      default:
        return {
          success: false,
          error: `Unsupported file type: ${fileExtension}`,
        }
    }
  } catch (error) {
    console.error("Error extracting credentials:", error)
    return {
      success: false,
      error: `Failed to extract credentials: ${(error as Error).message}`,
    }
  }
}

// Function to run AWS infrastructure analysis
async function performInfrastructureAnalysis(jobId: string, credentials: Credentials): Promise<void> {
  try {
    // Update job status to running
    jobStorage.set(jobId, { ...(jobStorage.get(jobId) || {}), status: "running" })

    // Write AWS credentials to ~/.aws/credentials
    const homeDir = process.env.HOME || process.env.USERPROFILE
    const awsDir = path.join(homeDir!, '.aws')
    const credentialsPath = path.join(awsDir, 'credentials')

    // Create .aws directory if it doesn't exist
    await execAsync(`mkdir -p ${awsDir}`)

    // Write credentials file
    const credentialsContent = `[default]
aws_access_key_id = ${credentials.accessKey}
aws_secret_access_key = ${credentials.secretKey}
region = ${credentials.region}
`
    await writeFile(credentialsPath, credentialsContent)

    // Make the script executable
    const scriptPath = path.join(process.cwd(), 'aws_service_checker.sh')
    await execAsync(`chmod +x ${scriptPath}`)

    // Run the AWS service checker script
    const { stdout, stderr } = await execAsync(scriptPath)

    if (stderr) {
      throw new Error(stderr)
    }

    // Update job with output and status
    const job = await jobStorage.get(jobId) || { status: "unknown" }
    job.output = stdout
    job.status = "completed"
    await jobStorage.set(jobId, job)
  } catch (error) {
    console.error("Analysis error:", error)

    // Store error in job
    const job = await jobStorage.get(jobId) || { status: "unknown" }
    job.status = "failed"
    job.error = error instanceof Error ? error.message : String(error)
    await jobStorage.set(jobId, job)
  }
}

// Main function to upload credentials and start the analysis
export async function uploadCredentials(credentials: Credentials): Promise<UploadResult> {
  try {
    // Validate credentials format
    if (!credentials.accessKey || !credentials.secretKey || !credentials.region) {
      return { success: false, error: "Missing required credentials" }
    }

    // Basic format validation
    if (credentials.accessKey.length < 16 || credentials.accessKey.length > 128) {
      return { success: false, error: "Invalid AWS Access Key format" }
    }

    if (credentials.secretKey.length < 16 || credentials.secretKey.length > 128) {
      return { success: false, error: "Invalid AWS Secret Key format" }
    }

    // Validate region format (e.g., us-east-1)
    const regionRegex = /^[a-z]{2}-[a-z]+-\d+$/
    if (!regionRegex.test(credentials.region)) {
      return { success: false, error: "Invalid AWS region format (e.g., us-east-1)" }
    }

    // Generate a unique job ID
    const jobId = uuidv4()

    // Create job in storage
    await jobStorage.set(jobId, { status: "running" })

    // Execute the analysis in the background
    performInfrastructureAnalysis(jobId, credentials).catch(console.error)

    return { success: true, jobId }
  } catch (error) {
    console.error("Error uploading credentials:", error)
    return { success: false, error: `Failed to process credentials: ${(error as Error).message}` }
  }
}

// Function to get job status
export async function getJobStatus(jobId: string): Promise<{ status: string; output?: string; error?: string }> {
  try {
    const job = await jobStorage.get(jobId)

    if (!job) {
      return { status: "unknown", error: "Job not found" }
    }

    return {
      status: job.status,
      output: job.output,
      error: job.error,
    }
  } catch (error) {
    console.error("Error getting job status:", error)
    return { status: "unknown", error: "Failed to get job status" }
  }
}

// Function to handle file uploads
export async function uploadFiles(formData: FormData): Promise<UploadResult> {
  try {
    // Generate a unique job ID
    const jobId = uuidv4()

    // Create job in storage
    await jobStorage.set(jobId, { status: "running", files: [] })

    // Process each file in the formData
    const fileDetails = []

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        const file = value
        const fileName = file.name

        // Convert file to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer()

        // Store file in memory
        const job = await jobStorage.get(jobId) || { status: "running", files: [] }
        if (!job.files) job.files = []
        job.files.push({
          name: fileName,
          size: file.size,
          type: file.type,
          content: arrayBuffer,
        })
        await jobStorage.set(jobId, job)

        // Store file details
        fileDetails.push({
          name: fileName,
          size: file.size,
          type: file.type,
        })
      }
    }

    // Start building output
    let output = formatOutput("=== File Upload Analysis ===\n\n", "header")
    output += formatOutput(`Successfully uploaded ${fileDetails.length} file(s)\n\n`, "success")

    output += formatOutput("Files:\n", "info")
    fileDetails.forEach((file, index) => {
      output += `${index + 1}. ${file.name} (${(file.size / 1024).toFixed(1)} KB)\n`
    })

    output += "\nExtracting AWS credentials from files...\n"

    // Try to extract credentials from each file
    let credentials = null
    let errors = 0

    for (const file of fileDetails) {
      output += `\nProcessing ${file.name}...\n`

      const extractResult = await extractCredentialsFromFile(jobId, file.name)

      if (extractResult.success) {
        credentials = {
          accessKey: extractResult.accessKey!,
          secretKey: extractResult.secretKey!,
          region: extractResult.region || "us-east-1",
        }

        output += formatOutput(`✓ Successfully extracted AWS credentials\n`, "success")
        output += `  Access Key ID: ${credentials.accessKey.substring(0, 4)}...${credentials.accessKey.substring(credentials.accessKey.length - 4)}\n`
        output += `  Region: ${credentials.region}\n`

        // Break after finding valid credentials
        break
      } else {
        output += formatOutput(`✗ ${extractResult.error}\n`, "error")
        errors++
      }
    }

    if (!credentials) {
      output += formatOutput("\nFailed to extract AWS credentials from any of the uploaded files.\n", "error")
      output += "Please ensure your files contain valid AWS credentials in a recognizable format.\n"

      // Convert the formatted output to terminal-friendly output
      const terminalOutput = convertToTerminalOutput(output)

      // Store output
      const job = await jobStorage.get(jobId) || { status: "running" }
      job.output = terminalOutput
      job.status = "failed"
      job.error = "Failed to extract AWS credentials from uploaded files"
      await jobStorage.set(jobId, job)

      return { success: true, jobId }
    }

    // Run infrastructure analysis with extracted credentials
    output += formatOutput("\nRunning AWS infrastructure analysis with extracted credentials...\n", "info")

    // Convert the formatted output to terminal-friendly output
    const terminalOutput = convertToTerminalOutput(output)

    // Store initial output
    const job = await jobStorage.get(jobId) || { status: "running" }
    job.output = terminalOutput
    await jobStorage.set(jobId, job)

    // Run the infrastructure analysis in the background
    performInfrastructureAnalysis(jobId, credentials).catch(console.error)

    return { success: true, jobId }
  } catch (error) {
    console.error("Error uploading files:", error)
    return { success: false, error: `Failed to upload files: ${(error as Error).message}` }
  }
}

