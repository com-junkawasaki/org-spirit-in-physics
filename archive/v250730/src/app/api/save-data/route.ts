import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { SaveStructuredDataPayloadSchema } from '@/components/jung-voice-assessment/schema';
import { Database } from '@/lib/database.types';

type Tables = Database['public']['Tables'];

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate the payload
        const validationResult = SaveStructuredDataPayloadSchema.safeParse(body);
        if (!validationResult.success) {
            console.error('Payload validation failed:', validationResult.error.format());
            return new NextResponse(JSON.stringify({ error: 'Invalid payload', details: validationResult.error.format() }), { status: 400 });
        }

        const dataToSave = validationResult.data;
        const supabase = createSupabaseServerClient();

        // Handle different data types
        if (dataToSave.type === 'consent') {
            const consentData = dataToSave.data;

            const { data, error } = await supabase
                .from('participant_consents')
                .insert({
                    participant_id: consentData.participantId,
                    signature: consentData.signature,
                    agreements: consentData.agreements,
                    agreed_at: consentData.agreedAt,
                })
                .select()
                .single();

            if (error) {
                console.error('Error saving consent data:', error);
                return new NextResponse(JSON.stringify({ error: 'Failed to save consent data', details: error.message }), { status: 500 });
            }

            return new NextResponse(JSON.stringify({
                message: 'Consent data saved successfully',
                data: data
            }), { status: 200 });
        }

        if (dataToSave.type === 'session-data') {
            const sessionData = dataToSave.data;
            console.log('Received session-data for participant:', sessionData.participantId);

            // Save experiment sessions
            if (sessionData.events && sessionData.events.length > 0) {
                const sessionInserts = sessionData.events
                    .filter((event: any) => event.type === 'experiment-session')
                    .map((event: any) => ({
                        participant_id: sessionData.participantId,
                        session_id: event.sessionId,
                        session_type: event.sessionType,
                        start_time: event.startTime,
                        end_time: event.endTime,
                    }));

                if (sessionInserts.length > 0) {
                    const { error: sessionError } = await supabase
                        .from('participant_experiment_sessions')
                        .upsert(sessionInserts, { onConflict: 'participant_id,session_id' });

                    if (sessionError) {
                        console.error('Error saving experiment sessions:', sessionError);
                        return new NextResponse(JSON.stringify({ error: 'Failed to save experiment sessions', details: sessionError.message }), { status: 500 });
                    }
                }
            }

            // Save response data
            if (sessionData.wordResponses && sessionData.wordResponses.length > 0) {
                const responseInserts = sessionData.wordResponses.map((response: any) => ({
                    participant_id: sessionData.participantId,
                    experiment_id: sessionData.experimentId || 'default',
                    word_stimulus_id: response.stimulusWord.key || 1,
                    stimulus_word: response.stimulusWord.word,
                    response_word: response.responseWord,
                    reaction_time_ms: response.reactionTimeMs,
                    session: sessionData.session || 'session-1',
                    timestamp: new Date().toISOString(),
                }));

                const { error: responseError } = await supabase
                    .from('participant_response_data')
                    .insert(responseInserts);

                if (responseError) {
                    console.error('Error saving response data:', responseError);
                    return new NextResponse(JSON.stringify({ error: 'Failed to save response data', details: responseError.message }), { status: 500 });
                }
            }

            return new NextResponse(JSON.stringify({ message: 'Session data saved successfully' }), { status: 200 });
        }

        // Handle participant data
        if (dataToSave.type === 'participant') {
            const participantData = dataToSave.data;

            const { data, error } = await supabase
                .from('participants')
                .upsert({
                    id: participantData.id,
                    age: participantData.age,
                    gender: participantData.gender,
                    handedness: participantData.handedness,
                }, { onConflict: 'id' })
                .select()
                .single();

            if (error) {
                console.error('Error saving participant data:', error);
                return new NextResponse(JSON.stringify({ error: 'Failed to save participant data', details: error.message }), { status: 500 });
            }

            return new NextResponse(JSON.stringify({
                message: 'Participant data saved successfully',
                data: data
            }), { status: 200 });
        }

        return new NextResponse(JSON.stringify({ message: 'Data saved successfully' }), { status: 200 });

    } catch (error) {
        console.error('Error saving data:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
} 