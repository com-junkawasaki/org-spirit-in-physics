import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  console.log('[API Save Artifact] Received a request.');
  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob | null;
    const sessionId = formData.get('sessionId') as string | null;
    const fileName = formData.get('fileName') as string | null;

    if (!file || !sessionId || !fileName) {
      console.error('[API Save Artifact] Missing form data.', { file: !!file, sessionId, fileName });
      return NextResponse.json({ error: 'Missing required form data.' }, { status: 400 });
    }

    console.log(`[API Save Artifact] Data received for session ${sessionId}, fileName: ${fileName}, size: ${file.size}`);

    // Define the directory path
    const sessionDir = path.join(process.cwd(), 'artifacts', 'sessions', sessionId);

    // Create the directory if it doesn't exist
    await fs.mkdir(sessionDir, { recursive: true });

    // Convert blob to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Write the file
    const filePath = path.join(sessionDir, fileName);
    await fs.writeFile(filePath, buffer);

    console.log(`[API Save Artifact] Successfully wrote file to ${filePath}`);

    return NextResponse.json({ success: true, fileName });
  } catch (error) {
    console.error('[API Save Artifact] Error saving artifact:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 