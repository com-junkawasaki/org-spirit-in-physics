import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { stat, mkdir } from 'fs/promises';

const ARTIFACTS_DIR = path.resolve(process.cwd(), '.artifacts_cache');

async function ensureDirExists(dir: string) {
    try {
        await stat(dir);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            await mkdir(dir, { recursive: true });
        } else {
            throw error;
        }
    }
}

export async function POST(request: NextRequest) {
    await ensureDirExists(ARTIFACTS_DIR);
    const formData = await request.formData();
    const file = formData.get('file') as Blob | null;
    const sessionId = formData.get('sessionId') as string | null;
    const fileName = formData.get('fileName') as string | null;

    if (!file || !sessionId || !fileName) {
        return new NextResponse('Missing required form data: file, sessionId, or fileName', { status: 400 });
    }

    const sessionDir = path.join(ARTIFACTS_DIR, sessionId);
    await ensureDirExists(sessionDir);

    const filePath = path.join(sessionDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());

    try {
        await fs.writeFile(filePath, buffer);
        return new NextResponse('Artifact saved successfully', { status: 200 });
    } catch (error) {
        console.error('Error saving artifact:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
} 