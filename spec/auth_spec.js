// spec/auth_spec.js
const { validateSignup } = require('../src/lib/auth-logic');

describe("Sign Up Validation Logic", function() {

  // --- Email validation ---

  it("should accept a valid Rutgers scarletmail with a strong password", function() {
    const result = validateSignup("vedpatel@scarletmail.rutgers.edu", "Rutgers1766!");
    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("should reject gmail or other non-Rutgers emails", function() {
    const result = validateSignup("student@gmail.com", "Rutgers1766!");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Must use a @scarletmail.rutgers.edu email.");
  });

  it("should reject emails with a similar but incorrect Rutgers domain", function() {
    const result = validateSignup("student@rutgers.edu", "Rutgers1766!");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Must use a @scarletmail.rutgers.edu email.");
  });

  it("should be case-insensitive for the email domain", function() {
    const result = validateSignup("vedpatel@Scarletmail.Rutgers.Edu", "Rutgers1766!");
    expect(result.isValid).toBe(true);
  });

  // --- Password length ---

  it("should reject passwords shorter than 8 characters", function() {
    const result = validateSignup("vedpatel@scarletmail.rutgers.edu", "Ab1!");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Password too short.");
  });

  // --- Password complexity ---

  it("should reject a password with no number", function() {
    const result = validateSignup("vedpatel@scarletmail.rutgers.edu", "Rutgers!!");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Password must contain a letter, number, and symbol.");
  });

  it("should reject a password with no special character", function() {
    const result = validateSignup("vedpatel@scarletmail.rutgers.edu", "Rutgers17");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Password must contain a letter, number, and symbol.");
  });

  it("should reject a password with no letter", function() {
    const result = validateSignup("vedpatel@scarletmail.rutgers.edu", "12345678!");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Password must contain a letter, number, and symbol.");
  });

  it("should accept a password that meets all complexity requirements", function() {
    const result = validateSignup("vedpatel@scarletmail.rutgers.edu", "Secur3P@ss");
    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("should reject an empty email string", function() {
    const result = validateSignup("", "Rutgers1766!");
    expect(result.isValid).toBe(false);
  });

  it("should reject an empty password string", function() {
    const result = validateSignup("vedpatel@scarletmail.rutgers.edu", "");
    expect(result.isValid).toBe(false);
  });
});
