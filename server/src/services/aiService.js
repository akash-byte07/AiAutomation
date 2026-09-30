const node = (id, type, label, x, y, extra = {}) => ({ id, type, position: { x, y }, data: { label, ...extra } });
const edge = (source, target) => ({ id: `e-${source}-${target}`, source, target, animated: true });

function deterministicWorkflow(prompt) {
  const text = prompt.toLowerCase();
  const provider = text.includes('gmail') || text.includes('email') ? 'gmail'
    : text.includes('discord') ? 'discord'
      : text.includes('sheet') || text.includes('spreadsheet') ? 'google-sheets'
        : 'slack';
  const action = provider === 'gmail' ? 'Send email' : provider === 'discord' ? 'Post Discord message' : provider === 'google-sheets' ? 'Append spreadsheet row' : 'Send Slack message';
  return {
    name: prompt.trim().slice(0, 48) || 'New automation',
    nodes: [
      node('trigger-1', 'trigger', 'When this starts', 70, 190, { description: 'Manual trigger' }),
      node('action-1', 'action', action, 350, 190, { provider, description: prompt.trim() }),
      node('validate-1', 'validation', 'Confirm result', 630, 190, { description: 'Validate action output' }),
    ],
    edges: [edge('trigger-1', 'action-1'), edge('action-1', 'validate-1')],
  };
}

function parseWorkflow(content) {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI provider returned an invalid workflow.');
  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) throw new Error('AI provider returned an incomplete workflow.');
  return { name: parsed.name || 'Generated workflow', nodes: parsed.nodes, edges: parsed.edges };
}

async function openRouter(prompt) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OpenRouter is not configured.');
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Create a small automation graph as JSON only with name, nodes and edges. Nodes must have id, type (trigger|action|validation), position {x,y}, and data {label,provider,description}. Supported providers: gmail, slack, discord, google-sheets.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) throw new Error(`OpenRouter returned ${response.status}.`);
  const result = await response.json();
  return parseWorkflow(result.choices?.[0]?.message?.content || '');
}

async function gemini(prompt) {
  if (!process.env.GEMINI_API_KEY) throw new Error('Gemini is not configured.');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: `Return JSON only: {"name":"...","nodes":[{"id":"...","type":"trigger|action|validation","position":{"x":0,"y":0},"data":{"label":"...","provider":"slack","description":"..."}}],"edges":[{"id":"...","source":"...","target":"...","animated":true}]}. Build a short automation for: ${prompt}` }] }] }),
  });
  if (!response.ok) throw new Error(`Gemini returned ${response.status}.`);
  const result = await response.json();
  return parseWorkflow(result.candidates?.[0]?.content?.parts?.[0]?.text || '');
}

function describeProviderFailure(provider, error) {
  const message = error instanceof Error ? error.message : '';
  if (message === `${provider} is not configured.`) return `${provider} key is missing`;
  const status = message.match(/returned (\d{3})\./)?.[1];
  return status ? `${provider} returned HTTP ${status}` : `${provider} request failed`;
}

export const aiService = {
  async generate(prompt) {
    const failures = [];
    try { return { ...await openRouter(prompt), generatedBy: 'openrouter' }; } catch (error) { failures.push(describeProviderFailure('OpenRouter', error)); }
    try { return { ...await gemini(prompt), generatedBy: 'gemini' }; } catch (error) { failures.push(describeProviderFailure('Gemini', error)); }
    const generationNote = failures.every((failure) => failure.endsWith('key is missing'))
      ? 'No hosted AI keys are configured. Generated a local rule-based starter graph.'
      : `Hosted AI unavailable: ${failures.join('; ')}. Generated a local rule-based starter graph.`;
    return { ...deterministicWorkflow(prompt), generatedBy: 'rules', generationNote };
  },
};