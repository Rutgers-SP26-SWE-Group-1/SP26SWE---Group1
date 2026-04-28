describe('chat route logic', () => {
  function validateSelectedModels(models) {
    return Array.isArray(models) && models.length >= 2;
  }

  function buildResponse(model, content, latencyMs, status = 'success') {
    return {
      model,
      content,
      latencyMs,
      status,
    };
  }

  async function mockCompare(prompt, selectedModels, providerMap) {
    const results = [];

    for (const selectedModel of selectedModels) {
      const start = Date.now();
      try {
        const content = await providerMap[selectedModel.provider](prompt, selectedModel.name);
        results.push(
          buildResponse(selectedModel.name, content, Date.now() - start, 'success')
        );
      } catch (error) {
        results.push(
          buildResponse(selectedModel.name, error.message, Date.now() - start, 'error')
        );
      }
    }

    return results;
  }

  it('requires at least two selected models for comparison', () => {
    expect(validateSelectedModels([{ name: 'Llama', provider: 'ollama' }])).toBeFalse();
    expect(
      validateSelectedModels([
        { name: 'Llama', provider: 'ollama' },
        { name: 'Gemma', provider: 'ollama' },
      ])
    ).toBeTrue();
  });

  it('returns one result per selected model', async () => {
    const providerMap = {
      ollama: async (prompt, modelName) => `${modelName} reply to ${prompt}`,
    };

    const results = await mockCompare(
      'Hello',
      [
        { name: 'LLAMA 3.2', provider: 'ollama' },
        { name: 'GEMMA 3', provider: 'ollama' },
      ],
      providerMap
    );

    expect(results.length).toBe(2);
    expect(results[0].model).toBe('LLAMA 3.2');
    expect(results[1].model).toBe('GEMMA 3');
  });

  it('stores latency for every result', async () => {
    const providerMap = {
      ollama: async () => 'ok',
    };

    const results = await mockCompare(
      'Hello',
      [
        { name: 'LLAMA 3.2', provider: 'ollama' },
        { name: 'GEMMA 3', provider: 'ollama' },
      ],
      providerMap
    );

    expect(typeof results[0].latencyMs).toBe('number');
    expect(typeof results[1].latencyMs).toBe('number');
  });

  it('records error status when one provider fails', async () => {
    const providerMap = {
      ollama: async (prompt, modelName) => {
        if (modelName === 'GEMMA 3') throw new Error('provider failed');
        return 'success reply';
      },
    };

    const results = await mockCompare(
      'Hello',
      [
        { name: 'LLAMA 3.2', provider: 'ollama' },
        { name: 'GEMMA 3', provider: 'ollama' },
      ],
      providerMap
    );

    expect(results[0].status).toBe('success');
    expect(results[1].status).toBe('error');
    expect(results[1].content).toBe('provider failed');
  });
});