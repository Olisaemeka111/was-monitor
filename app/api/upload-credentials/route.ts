import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { accessKey, secretKey, region } = data;

    // Validate credentials
    if (!accessKey || !secretKey || !region) {
      return NextResponse.json({ error: 'Missing required credentials' }, { status: 400 });
    }

    // Create temporary AWS credentials file
    const credContent = `[default]
aws_access_key_id = ${accessKey}
aws_secret_access_key = ${secretKey}
region = ${region}
`;
    
    const tempCredsPath = path.join(process.cwd(), '.aws-temp');
    await fs.mkdir(tempCredsPath, { recursive: true });
    await fs.writeFile(path.join(tempCredsPath, 'credentials'), credContent);

    // Get the path to the script
    const scriptPath = path.join(process.cwd(), 'aws_service_checker.sh');

    // Make sure the script is executable
    await fs.chmod(scriptPath, 0o755);

    // Execute the script with custom AWS credentials path
    const { stdout, stderr } = await execAsync(
      `AWS_SHARED_CREDENTIALS_FILE=${path.join(tempCredsPath, 'credentials')} bash ${scriptPath}`
    );

    // Clean up temporary credentials
    await fs.rm(tempCredsPath, { recursive: true, force: true });

    if (stderr) {
      console.error('Script error:', stderr);
      return NextResponse.json({ error: stderr }, { status: 500 });
    }

    return NextResponse.json({ output: stdout });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: `Failed to run analysis: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
