/* eslint-disable @typescript-eslint/no-require-imports */
const { getChatModelOption, CHAT_MODEL_OPTIONS, DEFAULT_CHAT_MODEL } = require('../src/lib/chat-models.ts');

describe("Chat Model Registry", function() {

  it("includes Claude Sonnet 4.6 as a selectable model", function() {
    const ids = CHAT_MODEL_OPTIONS.map((m) => m.id);
    expect(ids).toContain('claude-sonnet-4-6');
  });

  it("Claude model has provider 'anthropic'", function() {
    const claude = CHAT_MODEL_OPTIONS.find((m) => m.id === 'claude-sonnet-4-6');
    expect(claude).toBeDefined();
    expect(claude.provider).toBe('anthropic');
  });

  it("Claude model is marked as cloud, not ollama", function() {
    const claude = CHAT_MODEL_OPTIONS.find((m) => m.id === 'claude-sonnet-4-6');
    expect(claude.provider).not.toBe('ollama');
    expect(claude.ollamaModel).toBeUndefined();
  });

  it("getChatModelOption returns Claude for 'claude-sonnet-4-6'", function() {
    const model = getChatModelOption('claude-sonnet-4-6');
    expect(model.id).toBe('claude-sonnet-4-6');
    expect(model.label).toBe('Claude Sonnet 4.6');
  });

  it("getChatModelOption falls back to default for an unknown ID", function() {
    const model = getChatModelOption('not-a-real-model');
    expect(model.id).toBe(DEFAULT_CHAT_MODEL.id);
  });

  it("getChatModelOption falls back to default when called with no argument", function() {
    const model = getChatModelOption();
    expect(model.id).toBe(DEFAULT_CHAT_MODEL.id);
  });

  it("default model is Gemini 2.5 Flash", function() {
    expect(DEFAULT_CHAT_MODEL.id).toBe('gemini-2.5-flash');
    expect(DEFAULT_CHAT_MODEL.provider).toBe('google');
  });

  it("all models have required fields: id, label, description, details, provider", function() {
    for (const model of CHAT_MODEL_OPTIONS) {
      expect(model.id).toBeDefined();
      expect(model.label).toBeDefined();
      expect(model.description).toBeDefined();
      expect(model.details).toBeDefined();
      expect(model.provider).toBeDefined();
    }
  });

  it("ollama models have an ollamaModel field; cloud models do not", function() {
    for (const model of CHAT_MODEL_OPTIONS) {
      if (model.provider === 'ollama') {
        expect(model.ollamaModel).toBeDefined();
      } else {
        expect(model.ollamaModel).toBeUndefined();
      }
    }
  });

});
