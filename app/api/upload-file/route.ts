import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { saveAccount } from '../../models/AWSAccount';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: Request) {
  const tempCredsPath = path.join(process.cwd(), '.aws-temp');
  
  try {
    // Ensure the request is multipart/form-data
    if (!request.headers.get('content-type')?.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Invalid content type. Expected multipart/form-data' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('credentials') as File;
    const accountName = formData.get('accountName') as string;
    
    if (!file || !accountName) {
      return NextResponse.json(
        { error: 'Missing required fields: credentials file and account name' },
        { status: 400 }
      );
    }

    console.log('File received:', file.name);

    // Convert file to buffer and parse content
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const content = buffer.toString('utf-8');

    console.log('File content:', content.substring(0, 100) + '...');

    // Parse file content based on extension
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    let accessKey = '', secretKey = '';
    const accountId = uuidv4(); // Generate unique ID for the account

    if (fileExt === '.csv') {
      // Parse CSV content
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        throw new Error('Invalid CSV format: File must contain header and credentials');
      }
      const [header, credentials] = lines;
      [accessKey, secretKey] = credentials.split(',');
    } else if (fileExt === '.json') {
      // Parse JSON content
      const json = JSON.parse(content);
      accessKey = json.accessKeyId || json.aws_access_key_id;
      secretKey = json.secretAccessKey || json.aws_secret_access_key;
    } else {
      // Parse key=value format (.env, .txt, .config)
      const lines = content.split('\n').filter(line => line.trim());
      for (const line of lines) {
        const [key, value] = line.split('=').map(s => s.trim());
        if (key.includes('ACCESS_KEY_ID')) accessKey = value;
        if (key.includes('SECRET_ACCESS_KEY')) secretKey = value;
      }
    }

    if (!accessKey || !secretKey) {
      throw new Error('Could not find AWS access key and secret key in file');
    }

    // Create AWS credentials file content
    const awsCredentials = `[default]
aws_access_key_id = ${accessKey.trim()}
aws_secret_access_key = ${secretKey.trim()}
region = us-east-1
`;

    // Create temporary AWS credentials file
    await mkdir(tempCredsPath, { recursive: true });
    const credentialsPath = path.join(tempCredsPath, 'credentials');
    
    // Save account to DynamoDB
    await saveAccount({
      account_id: accountId,
      account_name: accountName,
      access_key_id: accessKey,
      secret_access_key: secretKey
    });

    // Write temporary credentials file
    await writeFile(credentialsPath, awsCredentials);
    console.log('Credentials written to:', credentialsPath);

    // Get the path to the script
    const scriptPath = path.join(process.cwd(), 'aws_service_checker.sh');
    console.log('Script path:', scriptPath);

    // Make sure the script is executable
    await execAsync(`chmod +x ${scriptPath}`);

    // Execute the script with custom AWS credentials path
    console.log('Running script with credentials...');
    console.log('Environment:', {
      AWS_SHARED_CREDENTIALS_FILE: credentialsPath,
      PROJECT_NAME: 'aws-monitor',
      PATH: process.env.PATH,
      SHELL: process.env.SHELL
    });

    // Make script executable
    await execAsync('chmod +x ' + scriptPath);
    
    const { stdout, stderr } = await execAsync(
      `/bin/bash ${scriptPath}`,
      { 
        env: { 
          ...process.env, 
          AWS_SHARED_CREDENTIALS_FILE: credentialsPath,
          PROJECT_NAME: 'aws-monitor',
          PATH: process.env.PATH
        },
        shell: '/bin/bash'
      }
    );

    if (stderr) {
      console.error('Script error:', stderr);
      throw new Error(stderr);
    }

    console.log('Script output:', stdout.substring(0, 100) + '...');
    return NextResponse.json({ output: stdout });
  } catch (error) {
    console.error('Error handling file upload:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to process file' },
      { status: 500 }
    );
  } finally {
    // Clean up temporary credentials
    try {
      await execAsync(`rm -rf ${tempCredsPath}`);
      console.log('Cleaned up temporary credentials');
    } catch (cleanupError) {
      console.error('Error cleaning up:', cleanupError);
    }
  }
}
