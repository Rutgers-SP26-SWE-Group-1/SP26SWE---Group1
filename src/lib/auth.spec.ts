const { validateSignup } = require('./auth-logic');

describe("Authentication Logic – Email Domain Enforcement", function() {

  it("should accept valid Rutgers scarletmail addresses", function() {
    const result = validateSignup("testuser@scarletmail.rutgers.edu", "ValidP@ss1");
    expect(result.isValid).toBe(true);
  });

  it("should reject non-Rutgers email addresses", function() {
    const result = validateSignup("attacker@gmail.com", "ValidP@ss1");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Must use a @scarletmail.rutgers.edu email.");
  });

  it("should reject empty email input", function() {
    const result = validateSignup("", "ValidP@ss1");
    expect(result.isValid).toBe(false);
  });
});
