const BASE_URL = "http://localhost:3000";


async function postChat(body) {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}


describe("POST /api/chat - AI Chat Endpoint", function() {


  beforeAll(function() {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;
  });


  it("should return 200 and a non-empty response for a valid message", async function() {
    const { status, data } = await postChat({ message: "What is Software Engineering?", 
      modelId: "gemini-1.5-flash"});
    expect(status).toBe(200);
    expect(data.content).toBeDefined();
    expect(data.content.length).toBeGreaterThan(0);
  });


  it("should return 400 for an empty message", async function() {
    const { status, data } = await postChat({ message: "" });
    expect(status).toBe(400);
    expect(data.error).toBeDefined();
  });


  it("should return a conversationId for chat history tracking", async function() {
    const { data } = await postChat({ message: "Tell me about Rutgers" });
    expect(data.conversationId).toBeDefined();
    expect(typeof data.conversationId).toBe("string");
  });


  it("should respond within 30 seconds", async function() {
    const start = Date.now();
    const { status } = await postChat({ message: "What year was Rutgers founded?" });
    const elapsed = Date.now() - start;
    expect(status).toBe(200);
    expect(elapsed).toBeLessThan(30000);
  });


  it("should allow guest users to receive a response", async function() {
    const { status, data } = await postChat({ message: "Hello from a guest" });
    expect(status).toBe(200);
    expect(data.content).toBeDefined();
  });
});


describe("POST /api/chat - Claude Model", function() {

  beforeAll(function() {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;
  });

  it("should return 200 with content for Claude Sonnet 4.6", async function() {
    const { status, data } = await postChat({ message: "What is Rutgers University?", modelId: "claude-sonnet-4-6" });
    expect(status).toBe(200);
    expect(data.content).toBeDefined();
    expect(data.content.length).toBeGreaterThan(0);
  });

  it("should return modelId 'claude-sonnet-4-6' in the response", async function() {
    const { data } = await postChat({ message: "Hello from Claude", modelId: "claude-sonnet-4-6" });
    expect(data.modelId).toBe("claude-sonnet-4-6");
  });

  it("should respond within 30 seconds for Claude", async function() {
    const start = Date.now();
    const { status } = await postChat({ message: "What year was Rutgers founded?", modelId: "claude-sonnet-4-6" });
    const elapsed = Date.now() - start;
    expect(status).toBe(200);
    expect(elapsed).toBeLessThan(30000);
  });

});


describe("POST /api/chat - Model Comparison (parallel requests)", function() {

  beforeAll(function() {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;
  });

  it("should return 200 from both Claude and Gemini for the same question", async function() {
    const [claude, gemini] = await Promise.all([
      postChat({ message: "What is Rutgers University?", modelId: "claude-sonnet-4-6" }),
      postChat({ message: "What is Rutgers University?", modelId: "gemini-2.5-flash" }),
    ]);
    expect(claude.status).toBe(200);
    expect(gemini.status).toBe(200);
    expect(claude.data.content.length).toBeGreaterThan(0);
    expect(gemini.data.content.length).toBeGreaterThan(0);
  });

  it("should return different content from Claude and Gemini", async function() {
    const [claude, gemini] = await Promise.all([
      postChat({ message: "Describe Rutgers in one sentence.", modelId: "claude-sonnet-4-6" }),
      postChat({ message: "Describe Rutgers in one sentence.", modelId: "gemini-2.5-flash" }),
    ]);
    expect(claude.data.content).not.toEqual(gemini.data.content);
  });

  it("both responses should include conversationId and durationMs", async function() {
    const [claude, gemini] = await Promise.all([
      postChat({ message: "Hi", modelId: "claude-sonnet-4-6" }),
      postChat({ message: "Hi", modelId: "gemini-2.5-flash" }),
    ]);
    expect(claude.data.conversationId).toBeDefined();
    expect(claude.data.durationMs).toBeDefined();
    expect(gemini.data.conversationId).toBeDefined();
    expect(gemini.data.durationMs).toBeDefined();
  });

});