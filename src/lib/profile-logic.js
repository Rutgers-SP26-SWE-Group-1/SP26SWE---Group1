"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateProfileUpdate = validateProfileUpdate;
exports.validatePasswordChange = validatePasswordChange;
/**
 * Logic for validating Rutgers student profile updates.
 * Required for Iteration 2 Development Team unit tests.
 */
function validateProfileUpdate(data) {
    // Full Name validation
    if (data.name !== undefined && data.name.trim().length < 2) {
        return { isValid: false, error: "Full Name must be at least 2 characters." };
    }
    // Major validation
    if (data.major !== undefined && data.major.trim().length === 0) {
        return { isValid: false, error: "Major field cannot be empty." };
    }
    // Class Year validation (numeric or 'Graduate')
    if (data.year !== undefined) {
        var yearTrimmed = data.year.trim();
        var yearNum = parseInt(yearTrimmed);
        var currentYear = new Date().getFullYear();
        if (yearTrimmed.toLowerCase() !== 'graduate') {
            if (isNaN(yearNum) || yearNum < 2020 || yearNum > currentYear + 6) {
                return { isValid: false, error: "Please enter a valid Graduation Year or 'Graduate'." };
            }
        }
    }
    return { isValid: true, error: null };
}
/**
 * Validates password strength for the security requirement.
 */
function validatePasswordChange(password) {
    if (password.length < 6) {
        return { isValid: false, error: "New password must be at least 6 characters." };
    }
    return { isValid: true, error: null };
}
