import { generateCricketResponse } from '../../../src/services/aiService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, userStats } = body;

    if (!message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Message is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Basic timeout implementation
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), 15000)
    );

    const aiPromise = generateCricketResponse(message, userStats);

    const result = await Promise.race([aiPromise, timeoutPromise]) as any;

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, response: result.response }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    if (error.message === 'Request timed out') {
      return new Response(
        JSON.stringify({ success: false, error: 'The AI request timed out. Please try again.' }),
        { status: 504, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid request format.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
