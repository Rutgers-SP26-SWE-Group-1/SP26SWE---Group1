function validateSignup(email, password) {
  if (!email.toLowerCase().endsWith('@scarletmail.rutgers.edu')) {
    return { isValid: false, error: "Must use a @scarletmail.rutgers.edu email." };
  }

  if (password.length < 8) {
    return { isValid: false, error: "Password too short." };
  }

  const strongPassword = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/;
  if (!strongPassword.test(password)) {
    return { isValid: false, error: "Password must contain a letter, number, and symbol." };
  }

  return { isValid: true, error: null };
}

module.exports = { validateSignup };
