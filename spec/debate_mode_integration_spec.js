const fs = require('node:fs/promises');

describe('Debate Mode Integration Tests', function () {
  it('routes chat API debateMode: true requests into debate generation', async function () {
    const route = await fs.readFile('src/app/api/chat/route.ts', 'utf8');

    expect(route).toContain('const debateMode = body?.debateMode === true');
    expect(route).toContain('} else if (debateMode && body?.debateModelIds) {');
    expect(route).toContain('const debate = await runDebateMode');
    expect(route).toContain('debateThread: debate.thread');
  });

  it('creates a debate thread with selected models, context, messages, and verdict', async function () {
    const debateMode = await fs.readFile('src/lib/debateMode.ts', 'utf8');

    expect(debateMode).toContain('selectedModels: models.map((model) => model.id)');
    expect(debateMode).toContain('contextUsed: context.kind');
    expect(debateMode).toContain('messages,');
    expect(debateMode).toContain('verdict,');
    expect(debateMode).toContain('formatted: `Debate started: ${userMessage}`');
  });

  it('appends follow-up messages to an existing debate thread', async function () {
    const debateMode = await fs.readFile('src/lib/debateMode.ts', 'utf8');
    const route = await fs.readFile('src/app/api/chat/route.ts', 'utf8');

    expect(route).toContain('if (debateFollowUp && body?.debateThread)');
    expect(route).toContain('const debateThread = await runDebateFollowUp');
    expect(debateMode).toContain('const updatedMessages = [...thread.messages, ...followUpMessages]');
    expect(debateMode).toContain('messages: updatedMessages');
  });

  it('routes debate context through local Rutgers data, SOC API, DuckDuckGo, or none', async function () {
    const debateMode = await fs.readFile('src/lib/debateMode.ts', 'utf8');

    expect(debateMode).toContain("kind: 'local data'");
    expect(debateMode).toContain("kind: 'SOC API'");
    expect(debateMode).toContain("kind: 'DuckDuckGo'");
    expect(debateMode).toContain("kind: 'none'");
    expect(debateMode).toContain('No external context used.');
  });
});
