import Groq from 'groq-sdk';

export async function* streamReview(
  diff: string,
  personaPrompt: string,
  apiKey: string
): AsyncGenerator<string> {
  const groq = new Groq({ apiKey });

  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 2048,
    stream: true,
    messages: [
      {
        role: 'system',
        content: personaPrompt
      },
      {
        role: 'user',
        content: `Review the following git diff. Focus on what actually changed and give honest, direct feedback on the quality, correctness, security, and architecture of those changes. Do not comment on unchanged code.\n\nDiff:\n\`\`\`\n${diff}\n\`\`\``
      }
    ]
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
