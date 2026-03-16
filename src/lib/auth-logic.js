function validateSignup(email, password) {
  // Enforce Rutgers Scarletmail domain restriction
  if (!email.toLowerCase().endsWith('@scarletmail.rutgers.edu')) {
    return { isValid: false, error: "Must use a @scarletmail.rutgers.edu email." };
  }

  // Enforce strong password: 8+ chars, at least 1 number, 1 special char
  const strongPassword = /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;
  if (!strongPassword.test(password)) {
    return { isValid: false, error: "Password must be 8+ characters with a letter, number, and symbol." };
  }

  // If all checks pass
  return { isValid: true, error: null };
}

module.exports = { validateSignup };