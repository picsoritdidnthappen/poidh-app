const PROMPT = `Generate unique, creative, and fun bounty ideas for the "Pics or It Didn't Happen" (poidh) website. Each bounty should encourage users to engage in amusing, interesting, or surprising activities that can be easily documented with a photo, screenshot, or video.
               Ensure the ideas are diverse, spanning different themes such as real-life actions, contributions, playful tasks, or simple creative(could be developer) projects.
               Ideas must remain achievable and enjoyable for users of all skill levels. A user should share result either in video or in photo. Include:
               Title: A short, catchy description of the bounty (max 50 characters).
               Description: A clear and engaging explanation of what the user must do to complete the bounty (max 350 characters).
               Return the ideas in JSON format like this:
               { 'title': '...', 'description': '...' }.`;

export async function POST(): Promise<Response> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    throw new Error('Missing OpenAI API key');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: PROMPT,
        },
        {
          role: 'user',
          content: 'Generate a bounty idea for a person to do.',
        },
      ],
      max_tokens: 100,
      temperature: 1,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }

  const data = await response.json();
  return Response.json(data.choices[0].message.content);
}
