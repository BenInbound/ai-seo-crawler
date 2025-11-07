/**
 * Password Hashing Service
 * Uses bcrypt for secure password hashing
 */

const bcrypt = require('bcrypt');

// Number of salt rounds for bcrypt (10 is secure and performant)
const SALT_ROUNDS = 10;

// Minimum password length
const MIN_PASSWORD_LENGTH = 8;

/**
 * Hash a plain text password using bcrypt
 * @param {string} plainTextPassword - The password to hash
 * @returns {Promise<string>} The hashed password
 * @throws {Error} If password doesn't meet requirements
 */
async function hashPassword(plainTextPassword) {
  // Validate password requirements
  if (!plainTextPassword) {
    throw new Error('Password is required');
  }

  if (typeof plainTextPassword !== 'string') {
    throw new Error('Password must be a string');
  }

  if (plainTextPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(plainTextPassword, salt);
    return hash;
  } catch (error) {
    throw new Error(`Failed to hash password: ${error.message}`);
  }
}

/**
 * Verify a plain text password against a hashed password
 * @param {string} plainTextPassword - The password to verify
 * @param {string} hashedPassword - The hashed password to compare against
 * @returns {Promise<boolean>} True if password matches, false otherwise
 */
async function verifyPassword(plainTextPassword, hashedPassword) {
  // Validate inputs
  if (!plainTextPassword || !hashedPassword) {
    return false;
  }

  if (typeof plainTextPassword !== 'string' || typeof hashedPassword !== 'string') {
    return false;
  }

  try {
    const isMatch = await bcrypt.compare(plainTextPassword, hashedPassword);
    return isMatch;
  } catch (error) {
    console.error('Password verification error:', error.message);
    return false;
  }
}

/**
 * Validate password strength
 * @param {string} password - The password to validate
 * @returns {object} Validation result with isValid boolean and errors array
 */
function validatePasswordStrength(password) {
  const errors = [];

  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  if (typeof password !== 'string') {
    errors.push('Password must be a string');
    return { isValid: false, errors };
  }

  // Length check
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  // Complexity checks (optional but recommended)
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpperCase) {
    errors.push('Password should contain at least one uppercase letter');
  }

  if (!hasLowerCase) {
    errors.push('Password should contain at least one lowercase letter');
  }

  if (!hasNumber) {
    errors.push('Password should contain at least one number');
  }

  if (!hasSpecialChar) {
    errors.push('Password should contain at least one special character');
  }

  // Common weak passwords check
  const weakPasswords = ['password', '12345678', 'qwerty123', 'admin123'];
  if (weakPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common and easily guessable');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check if a password hash needs rehashing
 * (useful if SALT_ROUNDS changes over time)
 * @param {string} hashedPassword - The hashed password to check
 * @returns {boolean} True if rehashing is recommended
 */
function needsRehash(hashedPassword) {
  try {
    const rounds = bcrypt.getRounds(hashedPassword);
    return rounds < SALT_ROUNDS;
  } catch (error) {
    // If we can't determine rounds, assume rehash is needed
    return true;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  needsRehash,
  MIN_PASSWORD_LENGTH
};
