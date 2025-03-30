import { POST } from '../route';

// Polyfill Web APIs
global.Request = jest.fn((input, init) => ({
  formData: async () => init?.body || new FormData(),
})) as unknown as typeof Request;

global.FormData = jest.fn(() => ({
  get: jest.fn(),
  append: jest.fn(),
})) as unknown as typeof FormData;

global.File = jest.fn((bits, name, options) => ({
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  name,
  ...options,
})) as unknown as typeof File;
import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { exec } from 'child_process';

// Mock the dependencies
jest.mock('fs/promises');
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));
jest.mock('util', () => ({
  promisify: jest.fn((fn) => fn),
}));

describe('POST /api/upload-credentials', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle successful file upload', async () => {
    // Mock environment variables
    process.env.HOME = '/mock/home';

    // Mock the file data
    const mockFile = new File(['test credentials'], 'credentials', {
      type: 'text/plain',
    });
    const formData = new FormData();
    formData.append('credentials', mockFile);

    // Mock the request
    const request = new Request('http://localhost:3000/api/upload-credentials', {
      method: 'POST',
      body: formData,
    });

    // Mock the exec command to succeed
    const mockedExec = jest.mocked(exec);
mockedExec.mockImplementation((command: string, options: any, callback?: (error: Error | null, stdout: string, stderr: string) => void) => {
      if (typeof options === 'function') {
        callback = options;
      }
      if (callback) {
        callback(null, '', '');
      }
      return {} as any;
    });
    
    // Mock writeFile to succeed
    (writeFile as jest.Mock).mockResolvedValue(undefined);

    const response = await POST(request);
    const data = await response.json();

    expect(response).toBeInstanceOf(NextResponse);
    expect(data).toEqual({ success: true });
    expect(exec).toHaveBeenCalledWith('mkdir -p /mock/home/.aws', expect.any(Function));
    expect(writeFile).toHaveBeenCalled();
  });

  it('should handle missing file', async () => {
    const formData = new FormData();
    const request = new Request('http://localhost:3000/api/upload-credentials', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response).toBeInstanceOf(NextResponse);
    expect(data).toEqual({ error: 'No file uploaded' });
    expect(response.status).toBe(400);
  });

  it('should handle file processing error', async () => {
    const mockFile = new File(['test credentials'], 'credentials', {
      type: 'text/plain',
    });
    const formData = new FormData();
    formData.append('credentials', mockFile);

    const request = new Request('http://localhost:3000/api/upload-credentials', {
      method: 'POST',
      body: formData,
    });

    // Mock writeFile to fail
    (writeFile as jest.Mock).mockRejectedValue(new Error('Write failed'));

    const response = await POST(request);
    const data = await response.json();

    expect(response).toBeInstanceOf(NextResponse);
    expect(data).toEqual({ error: 'Failed to process file' });
    expect(response.status).toBe(500);
  });
});
