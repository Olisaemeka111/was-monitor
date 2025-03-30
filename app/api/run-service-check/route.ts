import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function GET() {
  try {
    const scriptPath = path.join(process.cwd(), 'aws_service_checker.sh');
    
    // Make sure the script is executable
    await execAsync(`chmod +x ${scriptPath}`);
    
    // Run the script
    const { stdout, stderr } = await execAsync(`${scriptPath}`);
    
    if (stderr) {
      console.error('Script error:', stderr);
      return NextResponse.json(
        { error: 'Script execution failed', details: stderr },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      output: stdout
    });
  } catch (error) {
    console.error('Error running service check:', error);
    return NextResponse.json(
      { error: 'Failed to run service check' },
      { status: 500 }
    );
  }
}
