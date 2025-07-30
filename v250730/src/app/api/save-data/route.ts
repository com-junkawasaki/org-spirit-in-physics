import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { stat, mkdir, appendFile } from 'fs/promises';
import { SaveStructuredDataPayloadSchema } from '@/components/jung-voice-assessment/schema';

const ARTIFACTS_DIR = path.resolve(process.cwd(), '.artifacts_cache');
const DB_FILE = path.join(ARTIFACTS_DIR, 'database.jsonl');

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

    try {
        const body = await request.json();
        
        // Validate the payload
        const validationResult = SaveStructuredDataPayloadSchema.safeParse(body);
        if (!validationResult.success) {
            return new NextResponse(JSON.stringify({ error: 'Invalid payload', details: validationResult.error.format() }), { status: 400 });
        }
        
        const dataToSave = validationResult.data;

        // Append to the JSONL file
        await appendFile(DB_FILE, JSON.stringify(dataToSave) + '\\n');

        return new NextResponse(JSON.stringify({ message: 'Data saved successfully' }), { status: 200 });

    } catch (error) {
        console.error('Error saving data:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
} 