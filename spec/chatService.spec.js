describe('chat service logic', () => {
  function validatePrompt(prompt) {
    return typeof prompt === 'string' && prompt.trim().length > 0;
  }

  function validateModels(models) {
    return Array.isArray(models) && models.length >= 2;
  }

  async function collectResponses(prompt, clients) {
    const results = [];

    for (const client of clients) {
      const start = Date.now();
      try {
        const output = await client.ask(prompt);
        const latencyMs = Date.now() - start;

        results.push({
          model: client.name,
          status: 'success',
          response: output,
          latencyMs,
        });
      } catch (error) {
        const latencyMs = Date.now() - start;

        results.push({
          model: client.name,
          status: 'error',
          response: error.message,
          latencyMs,
        });
      }
    }

    return results;
  }

  it('accepts a non-empty prompt', () => {
    expect(validatePrompt('Hello')).toBeTrue();
  });

  it('rejects an empty prompt', () => {
    expect(validatePrompt('   ')).toBeFalse();
  });

  it('requires at least two selected models', () => {
    expect(validateModels(['LLAMA 3.2'])).toBeFalse();
    expect(validateModels(['LLAMA 3.2', 'GEMMA 3'])).toBeTrue();
  });

  it('returns one response per selected model', async () => {
    const clients = [
      { name: 'LLAMA 3.2', ask: async () => 'llama reply' },
      { name: 'GEMMA 3', ask: async () => 'gemma reply' },
    ];

    const results = await collectResponses('Hello', clients);

    expect(results.length).toBe(2);
    expect(results[0].model).toBe('LLAMA 3.2');
    expect(results[1].model).toBe('GEMMA 3');
  });

  it('records success status for successful model calls', async () => {
    const clients = [
      { name: 'LLAMA 3.2', ask: async () => 'llama reply' },
      { name: 'GEMMA 3', ask: async () => 'gemma reply' },
    ];

    const results = await collectResponses('Hello', clients);

    expect(results[0].status).toBe('success');
    expect(results[1].status).toBe('success');
  });

  it('records error status when a model fails', async () => {
    const clients = [
      { name: 'LLAMA 3.2', ask: async () => 'llama reply' },
      { name: 'GEMMA 3', ask: async () => { throw new Error('model failed'); } },
    ];

    const results = await collectResponses('Hello', clients);

    expect(results[0].status).toBe('success');
    expect(results[1].status).toBe('error');
    expect(results[1].response).toBe('model failed');
  });

  it('stores a latency value for each model response', async () => {
    const clients = [
      { name: 'LLAMA 3.2', ask: async () => 'llama reply' },
      { name: 'GEMMA 3', ask: async () => 'gemma reply' },
    ];

    const results = await collectResponses('Hello', clients);

    expect(typeof results[0].latencyMs).toBe('number');
    expect(typeof results[1].latencyMs).toBe('number');
  });
});