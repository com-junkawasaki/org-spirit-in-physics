// src/app/api/audio-cache/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/client';
import { gql } from '@apollo/client';

const GET_AUDIO_CACHE_QUERY = gql`
  query GetAudioCache($text: String!, $voice: String!) {
    audioCache(text: $text, voice: $voice)
  }
`;

const SAVE_AUDIO_CACHE_MUTATION = gql`
  mutation SaveAudioCache($text: String!, $voice: String!, $audioData: String!) {
    saveAudioCache(text: $text, voice: $voice, audioData: $audioData)
  }
`;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');
    const voice = searchParams.get('voice');

    if (!text || !voice) {
        return new NextResponse('Missing text or voice parameter', { status: 400 });
    }
    
    const client = getClient();
    try {
        const { data } = await client.query({
            query: GET_AUDIO_CACHE_QUERY,
            variables: { text, voice },
        });
        const audioData = Buffer.from(data.audioCache, 'base64');
        return new NextResponse(audioData, {
            status: 200,
            headers: { 'Content-Type': 'audio/mpeg' },
        });
    } catch (error) {
        return new NextResponse('File not found', { status: 404 });
    }
}

export async function POST(request: NextRequest) {
    const formData = await request.formData();
    const text = formData.get('text') as string;
    const voice = formData.get('voice') as string;
    const audioData = formData.get('audioData') as Blob;

    if (!text || !voice || !audioData) {
        return new NextResponse('Missing required form data', { status: 400 });
    }
    
    const buffer = Buffer.from(await audioData.arrayBuffer());
    const audioDataB64 = buffer.toString('base64');
    
    const client = getClient();
    try {
        await client.mutate({
            mutation: SAVE_AUDIO_CACHE_MUTATION,
            variables: { text, voice, audioData: audioDataB64 },
        });
        return new NextResponse('File saved successfully', { status: 200 });
    } catch (error) {
        console.error('Error saving file:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
} 