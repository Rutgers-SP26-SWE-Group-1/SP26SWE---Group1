// Ensure this path exactly matches the location of your logic file
const { validateProfileUpdate, validatePasswordChange } = require('../src/lib/profile-logic');

describe("Profile Management Logic", function() {
  it("should validate a correct name and ECE major", function() {
    const result = validateProfileUpdate({ 
      name: "Ved Patel", 
      major: "Electrical & Computer Engineering" 
    });
    expect(result.isValid).toBe(true);
  });

  it("should reject a password shorter than 6 characters", function() {
    const result = validatePasswordChange("12345");
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("6 characters");
  });
});