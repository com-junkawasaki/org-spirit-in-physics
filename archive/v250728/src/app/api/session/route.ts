import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const sessionsDir = path.join(process.cwd(), 'artifacts', 'sessions');
    
    // Find the most recent session directory
    const sessionFolders = await fs.readdir(sessionsDir, { withFileTypes: true });
    const latestSessionFolder = sessionFolders
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .sort()
      .pop();

    if (!latestSessionFolder) {
      return NextResponse.json({ resume: false, data: null });
    }

    const sessionPath = path.join(sessionsDir, latestSessionFolder);
    
    // Check for session 1 log and its completion status
    const log1Path = path.join(sessionPath, 'session-1-log.json');
    try {
      const log1Data = JSON.parse(await fs.readFile(log1Path, 'utf-8'));
      const isSession1Complete = log1Data.some((event: any) => event.event === 'session_complete');
      if (!isSession1Complete) {
        return NextResponse.json({ resume: true, data: log1Data, session: 1, assessmentId: latestSessionFolder });
      }
    } catch (e) {
      // If log 1 doesn't exist, it means we can start from session 1
      return NextResponse.json({ resume: false, data: null });
    }

    // Check for session 2 log and its completion status
    const log2Path = path.join(sessionPath, 'session-2-log.json');
    try {
      const log2Data = JSON.parse(await fs.readFile(log2Path, 'utf-8'));
      const isSession2Complete = log2Data.some((event: any) => event.event === 'session_complete');
       if (!isSession2Complete) {
        return NextResponse.json({ resume: true, data: log2Data, session: 2, assessmentId: latestSessionFolder });
      }
    } catch (e) {
        // If log 2 doesn't exist, it means we should start session 2.
        // We need the context from session 1 to continue.
        const log1Data = JSON.parse(await fs.readFile(log1Path, 'utf-8'));
        return NextResponse.json({ resume: true, data: log1Data, session: 2, assessmentId: latestSessionFolder });
    }
    
    // If both are complete, no need to resume
    return NextResponse.json({ resume: false, data: null });

  } catch (error) {
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        // This is not an error, it just means no sessions have been run yet.
        return NextResponse.json({ resume: false, data: null });
    }
    console.error('Error checking for session to resume:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 