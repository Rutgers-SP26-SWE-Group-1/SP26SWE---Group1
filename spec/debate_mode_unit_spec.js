const fs = require('node:fs/promises');
const Module = require('node:module');
const ts = require('typescript');

describe('Debate Mode Unit Tests', function () {
  async function loadDebateModeForUnitTests() {
    const source = await fs.readFile('src/lib/debateMode.ts', 'utf8');
    const sourceWithoutImports = source.replace(/import[\s\S]*?from ['"][^'"]+['"];?\n/g, '');
    const chatModelStub = `
      const DEFAULT_CHAT_MODEL = { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Cloud)', provider: 'google' };
      const __chatModels = {
        'gemini-2.5-flash': DEFAULT_CHAT_MODEL,
        'llama-3.1-8b-instant': { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 (Cloud)', provider: 'groq' },
        mistral: { id: 'mistral', label: 'Mistral', provider: 'ollama', ollamaModel: 'mistral:latest' },
        gemma: { id: 'gemma', label: 'Gemma', provider: 'ollama', ollamaModel: 'gemma:latest' },
      };
      const getChatModelOption = (modelId) => __chatModels[modelId] || DEFAULT_CHAT_MODEL;
    `;
    const testableSource = `${chatModelStub}\n${sourceWithoutImports}\nexport const __resolveDebateModelsForTest = resolveDebateModels;`;
    const compiled = ts.transpileModule(testableSource, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText;

    const testModule = new Module('debateMode.unit-test.js');
    testModule.filename = 'debateMode.unit-test.js';
    testModule.paths = Module._nodeModulePaths(process.cwd());
    testModule._compile(compiled, 'debateMode.unit-test.js');
    return testModule.exports;
  }

  it("getDebateDepthSettings('quick') returns 3 max rounds", async function () {
    const debateMode = await loadDebateModeForUnitTests();

    expect(debateMode.getDebateDepthSettings('quick')).toEqual({
      depth: 'quick',
      maxRounds: 3,
      label: 'Quick',
    });
  });

  it("getDebateDepthSettings('deep') returns 7 max rounds", async function () {
    const debateMode = await loadDebateModeForUnitTests();

    expect(debateMode.getDebateDepthSettings('deep')).toEqual({
      depth: 'deep',
      maxRounds: 7,
      label: 'Deep',
    });
  });

  it('custom max rounds clamp between 5 and 7', async function () {
    const debateMode = await loadDebateModeForUnitTests();

    expect(debateMode.getDebateDepthSettings('standard', 2).maxRounds).toBe(5);
    expect(debateMode.getDebateDepthSettings('standard', 6).maxRounds).toBe(6);
    expect(debateMode.getDebateDepthSettings('standard', 12).maxRounds).toBe(7);
  });

  it('detectQuestionContext identifies Rutgers questions', async function () {
    const debateMode = await loadDebateModeForUnitTests();

    expect(debateMode.detectQuestionContext('What Rutgers class should I take next?')).toBe('rutgers');
    expect(debateMode.detectQuestionContext('Does 01:198:112 prepare me for CS 211?')).toBe('rutgers');
    expect(debateMode.detectQuestionContext('Explain binary search.')).toBe('general');
  });

  it('debate model fallback ensures at least two models are used', async function () {
    const debateMode = await loadDebateModeForUnitTests();

    const fallbackModels = debateMode.__resolveDebateModelsForTest(['mistral']);
    const defaultModels = debateMode.__resolveDebateModelsForTest([]);

    expect(fallbackModels.length).toBe(2);
    expect(fallbackModels.map((model) => model.id)).toEqual(['gemini-2.5-flash', 'llama-3.1-8b-instant']);
    expect(defaultModels.map((model) => model.id)).toEqual(['gemini-2.5-flash', 'llama-3.1-8b-instant']);
  });
});
