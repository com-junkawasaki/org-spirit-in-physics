import type { APIRoute } from 'astro';
import { blobStorage } from '@/lib/blob';
import { SaveStructuredDataPayloadSchema } from '@spirit-in-physics/jung-voice-assessment';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    // Validate the payload
    const validationResult = SaveStructuredDataPayloadSchema.safeParse(body);
    if (!validationResult.success) {
      console.error(
        'Payload validation failed:',
        validationResult.error.format(),
      );
      return new Response(
        JSON.stringify({
          error: 'Invalid payload',
          details: validationResult.error.format(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const dataToSave = validationResult.data;

    // Handle consent data
    if (dataToSave.type === 'consent') {
      const { participantId } = dataToSave.data;
      if (!participantId) {
        return new Response(
          JSON.stringify({
            error: 'Participant ID is required for consent data',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }

      // Upload consent data as JSON file to Blob Storage
      const jsonData = JSON.stringify(dataToSave.data, null, 2);
      const buffer = Buffer.from(jsonData);

      const metadata = await blobStorage.uploadArtifact(buffer, {
        participantId,
        type: 'consent',
        filename: 'consent.json',
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Consent data saved successfully',
          metadata,
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Handle session data
    if (dataToSave.type === 'session-data') {
      console.log(
        'Received session-data for participant:',
        dataToSave.data.participantId,
      );
      const { participantId, ...rest } = dataToSave.data;
      if (!participantId) {
        console.error('Participant ID is missing in session-data');
        return new Response(
          JSON.stringify({
            error: 'Participant ID is required for session data',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }

      // Upload session data as JSON file to Blob Storage
      const jsonData = JSON.stringify(
        { participantId, ...rest },
        null,
        2,
      );
      const buffer = Buffer.from(jsonData);

      const metadata = await blobStorage.uploadArtifact(buffer, {
        participantId,
        type: 'session_data',
        filename: 'session_data.json',
      });

      console.log(`Successfully saved session data to Blob Storage`);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Session data saved successfully',
          metadata,
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    // For other data types, you might want to handle them differently
    // For now, we'll return an error for unsupported types
    return new Response(
      JSON.stringify({ error: 'Unsupported data type' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error saving data:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};

