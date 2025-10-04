import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, uploadFile } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const participantId = formData.get('participantId') as string;
    const type = formData.get('type') as 'audio' | 'video' | 'image' | 'data';

    if (!file || !participantId || !type) {
      return new NextResponse(JSON.stringify({
        error: 'Missing required fields: file, participantId, type'
      }), { status: 400 });
    }

    // Validate file type
    const allowedTypes = {
      audio: ['audio/', 'audio/wav', 'audio/mpeg', 'audio/mp3'],
      video: ['video/', 'video/mp4', 'video/webm'],
      image: ['image/', 'image/jpeg', 'image/png', 'image/gif'],
      data: ['application/json']
    };

    const isValidType = allowedTypes[type].some(allowedType =>
      file.type.startsWith(allowedType) ||
      allowedType === file.type
    );

    if (!isValidType) {
      return new NextResponse(JSON.stringify({
        error: `Invalid file type for ${type}. Allowed: ${allowedTypes[type].join(', ')}`
      }), { status: 400 });
    }

    const supabase = createSupabaseServerClient();

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'bin';
    const fileName = `${timestamp}_${file.name}`;

    // Upload file to storage
    const uploadResult = await uploadFile(
      supabase,
      participantId,
      file,
      fileName,
      type,
      file.type
    );

    // Generate public URL
    const fileUrl = uploadResult.path;

    return new NextResponse(JSON.stringify({
      message: 'File uploaded successfully',
      data: {
        fileName,
        fileUrl,
        fileType: file.type,
        fileSize: file.size
      }
    }), { status: 200 });

  } catch (error) {
    console.error('Error uploading file:', error);
    return new NextResponse(JSON.stringify({
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
}
