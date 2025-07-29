import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob | null;
    const sessionId = formData.get('sessionId') as string | null;
    const fileName = formData.get('fileName') as string | null;

    if (!file || !sessionId || !fileName) {
      return NextResponse.json({ error: 'Missing required form data.' }, { status: 400 });
    }

    // Define the directory path
    const sessionDir = path.join(process.cwd(), 'artifacts', 'sessions', sessionId);

    // Create the directory if it doesn't exist
    await fs.mkdir(sessionDir, { recursive: true });

    // Convert blob to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Write the file
    await fs.writeFile(path.join(sessionDir, fileName), buffer);

    return NextResponse.json({ success: true, fileName });
  } catch (error) {
    console.error('Error saving artifact:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 