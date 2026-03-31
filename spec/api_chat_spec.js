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
    const { status, data } = await postChat({ message: "What is Software Engineering?" });
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