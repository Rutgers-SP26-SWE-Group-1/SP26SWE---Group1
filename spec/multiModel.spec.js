// spec/multiModel.spec.js
const { validateMultiModelSelection } = require('../src/lib/chat-logic');

describe("Multi-LLM Comparison Logic", () => {
  
  it("should accept an array of multiple model IDs", () => {
    const selectedModels = ['gemini-1.5-flash', 'groq-llama-3', 'ollama-llama3'];
    const result = validateMultiModelSelection(selectedModels);
    expect(result.isValid).toBe(true);
    expect(result.count).toBe(3);
  });

  it("should fail if no models are selected", () => {
    const selectedModels = [];
    const result = validateMultiModelSelection(selectedModels);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Please select at least one model to compare.");
  });
});
