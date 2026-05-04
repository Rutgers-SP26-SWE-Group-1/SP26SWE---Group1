describe('Debate Mode', function () {
  it('should expose integrated debate thread UI files', async function () {
    const fs = await import('node:fs');
    expect(fs.existsSync('src/components/DebateModeToggle.tsx')).toBeTrue();
    expect(fs.existsSync('src/components/ModelDebatePanel.tsx')).toBeTrue();
    expect(fs.existsSync('src/components/DebateThreadPanel.tsx')).toBeTrue();
    expect(fs.existsSync('src/components/DebateMessageBubble.tsx')).toBeTrue();
    expect(fs.existsSync('src/components/DebateVerdictCard.tsx')).toBeTrue();
  });

  it('should render a dedicated panel with follow-up input', async function () {
    const fs = await import('node:fs/promises');
    const panel = await fs.readFile('src/components/DebateThreadPanel.tsx', 'utf8');
    expect(panel).toContain('data-testid="debate-thread-panel"');
    expect(panel).toContain('Ask both models a follow-up...');
    expect(panel).toContain('Context used:');
  });

  it('should keep main chat output compact', async function () {
    const fs = await import('node:fs/promises');
    const page = await fs.readFile('src/app/chat/page.tsx', 'utf8');
    expect(page).toContain('data-testid="debate-started-card"');
    expect(page).toContain('Open Debate');
    expect(page).toContain('debateThreadId');
  });

  it('should create opening and rebuttal messages instead of report fields', async function () {
    const fs = await import('node:fs/promises');
    const debateMode = await fs.readFile('src/lib/debateMode.ts', 'utf8');
    expect(debateMode).toContain("role: 'opening'");
    expect(debateMode).toContain("role: 'rebuttal'");
    expect(debateMode).toContain('generateRoundResponseMessage');
    expect(debateMode).not.toContain('Return exactly these labels');
  });

  it('should support debate rounds beyond two turns with early consensus checks', async function () {
    const fs = await import('node:fs/promises');
    const debateMode = await fs.readFile('src/lib/debateMode.ts', 'utf8');
    expect(debateMode).toContain('while (shouldContinueDebate');
    expect(debateMode).toContain('checkConsensus');
    expect(debateMode).toContain('consensus_with_caveats');
    expect(debateMode).toContain('No consensus after');
  });

  it('should expose quick standard and deep debate depth settings', async function () {
    const fs = await import('node:fs/promises');
    const debateMode = await fs.readFile('src/lib/debateMode.ts', 'utf8');
    const panel = await fs.readFile('src/components/ModelDebatePanel.tsx', 'utf8');
    expect(debateMode).toContain('getDebateDepthSettings');
    expect(debateMode).toContain("maxRounds: 3");
    expect(debateMode).toContain("maxRounds: 7");
    expect(panel).toContain('Quick');
    expect(panel).toContain('Standard');
    expect(panel).toContain('Deep');
  });

  it('should support follow-ups inside the debate thread', async function () {
    const fs = await import('node:fs/promises');
    const debateMode = await fs.readFile('src/lib/debateMode.ts', 'utf8');
    const route = await fs.readFile('src/app/api/chat/route.ts', 'utf8');
    expect(debateMode).toContain('runDebateFollowUp');
    expect(debateMode).toContain("role: 'followup'");
    expect(route).toContain('debateFollowUp');
  });

  it('should show debate rounds and consensus round in the thread UI', async function () {
    const fs = await import('node:fs/promises');
    const panel = await fs.readFile('src/components/DebateThreadPanel.tsx', 'utf8');
    const verdict = await fs.readFile('src/components/DebateVerdictCard.tsx', 'utf8');
    expect(panel).toContain('Round ${round}:');
    expect(panel).toContain('Consensus reached in Round');
    expect(verdict).toContain('Consensus with caveats');
  });

  it('should route Rutgers schedule debate questions to SOC context and general debates to none', async function () {
    const fs = await import('node:fs/promises');
    const debateMode = await fs.readFile('src/lib/debateMode.ts', 'utf8');
    expect(debateMode).toContain('detectScheduleIntent(userMessage)');
    expect(debateMode).toContain("kind: 'SOC API'");
    expect(debateMode).toContain("kind: 'none'");
    expect(debateMode).toContain('No external context used.');
  });

  it('should avoid repeated report labels in debate prompts', async function () {
    const fs = await import('node:fs/promises');
    const debateMode = await fs.readFile('src/lib/debateMode.ts', 'utf8');
    expect(debateMode).not.toContain(`Strongest ${'point'}:`);
    expect(debateMode).not.toContain(`Un${'certainty'}:`);
  });
});
