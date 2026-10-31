/**
 * Validation utilities for Authentication and Authorization
 * Enforces problem statement requirements:
 * - Passwords must contain more than eight characters (> 8)
 * - Passwords must include at least one uppercase letter
 * - Passwords must include at least one lowercase letter
 * - Passwords must include at least one special character
 * - Email format and uniqueness
 */

export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: 'Password is required and must be a string',
    };
  }

  if (password.length <= 8) {
    return {
      isValid: false,
      message: 'Password must contain more than 8 characters',
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must include at least one uppercase letter',
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must include at least one lowercase letter',
    };
  }

  if (!/[!@#$%^&*(),.?":{}|<>_\-=+~`[\]/\\]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must include at least one special character',
    };
  }

  return { isValid: true };
};

export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};
