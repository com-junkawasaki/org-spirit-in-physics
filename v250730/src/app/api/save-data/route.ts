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
            console.error('Payload validation failed:', validationResult.error.format());
            return new NextResponse(JSON.stringify({ error: 'Invalid payload', details: validationResult.error.format() }), { status: 400 });
        }
        
        const dataToSave = validationResult.data;

        // --- New logic for handling consent data ---
        if (dataToSave.type === 'consent') {
            const { participantId } = dataToSave.data;
            if (!participantId) {
                return new NextResponse(JSON.stringify({ error: 'Participant ID is required for consent data' }), { status: 400 });
            }
            const sessionDir = path.join(ARTIFACTS_DIR, participantId);
            await ensureDirExists(sessionDir);
            const consentFilePath = path.join(sessionDir, 'consent.json');
            await fs.writeFile(consentFilePath, JSON.stringify(dataToSave.data, null, 2));
            return new NextResponse(JSON.stringify({ message: 'Consent data saved successfully' }), { status: 200 });
        }
        if (dataToSave.type === 'session-data') {
            console.log('Received session-data for participant:', dataToSave.data.participantId); // デバッグ用ログ
            const { participantId, ...rest } = dataToSave.data;
            if (!participantId) {
                console.error('Participant ID is missing in session-data'); // デバッグ用ログ
                return new NextResponse(JSON.stringify({ error: 'Participant ID is required for session data' }), { status: 400 });
            }
            const sessionDir = path.join(ARTIFACTS_DIR, participantId);
            await ensureDirExists(sessionDir);
            const sessionFilePath = path.join(sessionDir, 'session_data.json');
            try {
                await fs.writeFile(sessionFilePath, JSON.stringify({ participantId, ...rest }, null, 2));
                console.log(`Successfully saved session data to ${sessionFilePath}`); // デバッグ用ログ
                return new NextResponse(JSON.stringify({ message: 'Session data saved successfully' }), { status: 200 });
            } catch (writeError) {
                console.error(`Failed to write session data to ${sessionFilePath}:`, writeError); // デバッグ用ログ
                return new NextResponse('Failed to write session data file', { status: 500 });
            }
        }
        // --- End of new logic ---

        // Append to the JSONL file
        await appendFile(DB_FILE, JSON.stringify(dataToSave) + '\\n');

        return new NextResponse(JSON.stringify({ message: 'Data saved successfully' }), { status: 200 });

    } catch (error) {
        console.error('Error saving data:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
} 