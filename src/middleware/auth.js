const crypto = require('node:crypto');
const { db } = require('../database/db');

// Simple secure session token storage for hackathon environment
const activeSessions = new Map();

function createToken(user) {
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, {
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    createdAt: Date.now()
  });
  return token;
}

function verifyPassword(password, storedHash) {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(hash, 'hex'));
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // Check if session token passed in query or cookie
    const queryToken = req.query.token;
    if (queryToken && activeSessions.has(queryToken)) {
      req.user = activeSessions.get(queryToken);
      return next();
    }
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');
  const session = activeSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }

  req.user = session;
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: requires one of [${allowedRoles.join(', ')}] role` });
    }
    next();
  };
}

module.exports = {
  createToken,
  verifyPassword,
  authenticate,
  requireRole
};
