import type { APIRoute } from 'astro';
import path from 'path';
import fs from 'fs/promises';
import { stat, mkdir } from 'fs/promises';

export const prerender = false;

const CACHE_DIR = path.resolve(process.cwd(), '.audio_cache');

async function ensureCacheDirExists() {
  try {
    await stat(CACHE_DIR);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await mkdir(CACHE_DIR, { recursive: true });
    } else {
      throw error;
    }
  }
}

function getFilePath(text: string, voice: string): string {
  const filename = `${voice}_${text.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
  return path.join(CACHE_DIR, filename);
}

export const GET: APIRoute = async ({ url }) => {
  await ensureCacheDirExists();
  const searchParams = url.searchParams;
  const text = searchParams.get('text');
  const voice = searchParams.get('voice');

  if (!text || !voice) {
    return new Response('Missing text or voice parameter', { status: 400 });
  }

  const filePath = getFilePath(text, voice);

  try {
    const fileBuffer = await fs.readFile(filePath);
    return new Response(fileBuffer, {
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return new Response('File not found', { status: 404 });
    }
    console.error('Error reading file:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  await ensureCacheDirExists();
  const formData = await request.formData();
  const text = formData.get('text') as string;
  const voice = formData.get('voice') as string;
  const audioData = formData.get('audioData') as Blob;

  if (!text || !voice || !audioData) {
    return new Response('Missing required form data', { status: 400 });
  }

  const filePath = getFilePath(text, voice);
  const buffer = Buffer.from(await audioData.arrayBuffer());

  try {
    await fs.writeFile(filePath, buffer);
    return new Response('File saved successfully', { status: 200 });
  } catch (error) {
    console.error('Error saving file:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};

