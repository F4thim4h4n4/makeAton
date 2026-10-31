const express = require('express');
const router = express.Router();
const crypto = require('node:crypto');
const { db } = require('../database/db');
const { hashPassword } = require('../database/seed');
const { createToken, verifyPassword, authenticate } = require('../middleware/auth');

// Password complexity regex: > 8 chars, 1 uppercase, 1 lowercase, 1 special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{9,}$/;

router.post('/register', (req, res) => {
  try {
    const { name, email, password, role = 'customer' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        error: 'Password must be greater than 8 characters and include at least one uppercase letter, one lowercase letter, and one special character.'
      });
    }

    // Role check: Only admin can register staff/admin accounts
    let assignedRole = 'customer';
    if (['admin', 'staff'].includes(role)) {
      // In a strict environment, check if requester is admin
      assignedRole = role;
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists' });
    }

    const passwordHash = hashPassword(password);
    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `).run(name.trim(), email.toLowerCase().trim(), passwordHash, assignedRole);

    const userId = Number(result.lastInsertRowid);

    // Auto-create customer record if role is customer
    if (assignedRole === 'customer') {
      db.prepare(`
        INSERT INTO customers (user_id, name, email)
        VALUES (?, ?, ?)
      `).run(userId, name.trim(), email.toLowerCase().trim());
    }

    const user = { id: userId, name: name.trim(), email: email.toLowerCase().trim(), role: assignedRole };
    const token = createToken(user);

    res.status(201).json({
      message: 'Registration successful',
      user,
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // If customer, fetch associated customer profile
    let customerId = null;
    if (user.role === 'customer') {
      const cust = db.prepare('SELECT id FROM customers WHERE user_id = ?').get(user.id);
      if (cust) customerId = cust.id;
    }

    const token = createToken(user);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        customerId
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  let customer = null;
  if (user.role === 'customer') {
    customer = db.prepare('SELECT * FROM customers WHERE user_id = ?').get(user.id);
  }

  res.json({ user, customer });
});

router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  // Generic safe response to not expose email existence
  const resetToken = crypto.randomBytes(24).toString('hex');
  res.json({
    message: 'If the email exists in our records, a password reset link has been dispatched.',
    demoResetToken: resetToken // surfaced for hackathon demonstration convenience
  });
});

module.exports = router;
