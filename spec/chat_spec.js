const { validateMessage, formatChatPayload, sanitizeInput } = require('../src/lib/chat-logic');


describe("Chat Message Validation", function() {


  it("should accept a normal text message", function() {
    const result = validateMessage("What is CS111 at Rutgers?");
    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });


  it("should reject an empty message", function() {
    const result = validateMessage("");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Message cannot be empty.");
  });


  it("should reject a whitespace-only message", function() {
    const result = validateMessage("     ");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Message cannot be empty.");
  });


  it("should reject messages exceeding the max length", function() {
    const longMessage = "a".repeat(5001);
    const result = validateMessage(longMessage);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Message is too long.");
  });
});


describe("Chat Payload Formatting", function() {


  it("should create a payload with the message trimmed", function() {
    const payload = formatChatPayload("  What are Rutgers bus routes?  ");
    expect(payload.message).toBe("What are Rutgers bus routes?");
  });


  it("should include conversationId when provided", function() {
    const payload = formatChatPayload("Follow up question", "conv-123");
    expect(payload.conversationId).toBe("conv-123");
  });
});


describe("Chat Input Sanitization", function() {


  it("should strip script tags and their content", function() {
    const clean = sanitizeInput("<script>alert('xss')</script>Hello");
    expect(clean).toBe("Hello");
  });


  it("should preserve normal text", function() {
    const clean = sanitizeInput("What's the GPA requirement for CS (3.0+)?");
    expect(clean).toBe("What's the GPA requirement for CS (3.0+)?");
  });
});