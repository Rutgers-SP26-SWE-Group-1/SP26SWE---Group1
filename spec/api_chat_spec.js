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

function buildChatBody(message) {
  return {
    message,
    selectedModels: [
      {
        id: "llama3.2",
        name: "LLAMA 3.2",
        provider: "ollama",
      },
      {
        id: "gemma3",
        name: "GEMMA 3",
        provider: "ollama",
      },
    ],
  };
}

describe("POST /api/chat - AI Chat Endpoint", function () {
  beforeAll(function () {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;
  });

  it("should return 200 and a non-empty response for a valid message", async function () {
    const { status, data } = await postChat(
      buildChatBody("What is Software Engineering?")
    );

    console.log("STATUS:", status);
    console.log("DATA:", JSON.stringify(data, null, 2));

    expect(status).toBe(200);
    expect(data).toBeDefined();

    const hasContent =
      data.content ||
      data.results ||
      data.responses ||
      data.messages;

    expect(hasContent).toBeDefined();
  });

  it("should return 400 for an empty message", async function () {
    const { status, data } = await postChat(buildChatBody(""));

    expect(status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("should return a conversationId for chat history tracking", async function () {
    const { status, data } = await postChat(
      buildChatBody("Tell me about Rutgers")
    );

    expect(status).toBe(200);
    expect(data.conversationId).toBeDefined();
    expect(typeof data.conversationId).toBe("string");
  });

  it("should respond within 30 seconds", async function () {
    const start = Date.now();

    const { status } = await postChat(
      buildChatBody("What year was Rutgers founded?")
    );

    const elapsed = Date.now() - start;

    expect(status).toBe(200);
    expect(elapsed).toBeLessThan(30000);
  });

  it("should allow guest users to receive a response", async function () {
    const { status, data } = await postChat(
      buildChatBody("Hello from a guest")
    );

    expect(status).toBe(200);

    const hasContent =
      data.content ||
      data.results ||
      data.responses ||
      data.messages;

    expect(hasContent).toBeDefined();
  });
});