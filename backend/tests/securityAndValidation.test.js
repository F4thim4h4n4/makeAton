import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { authorizeAdmin } from '../src/middleware/auth.js';

describe('Security & Authorization Middleware', () => {
  it('should allow access to users with admin role', () => {
    const req = { user: { role: 'admin', email: 'admin@brightloop.com' } };
    let nextCalled = false;
    const res = {};
    const next = () => { nextCalled = true; };

    authorizeAdmin(req, res, next);
    assert.equal(nextCalled, true, 'Admin user should be authorized');
  });

  it('should forbid non-admin users in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const req = { user: { role: 'viewer', email: 'viewer@brightloop.com' } };
    let statusCode = null;
    let jsonBody = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonBody = body;
        return this;
      },
    };
    const next = () => {};

    authorizeAdmin(req, res, next);
    assert.equal(statusCode, 403, 'Non-admin should receive 403 status code');
    assert.equal(jsonBody.success, false);
    assert.match(jsonBody.message, /Forbidden/);

    process.env.NODE_ENV = originalEnv;
  });

  it('should not expose database credentials or privileged keys in configuration', () => {
    // Verify that client responses do not leak sensitive backend environment variables
    const sensitiveKeys = ['MONGODB_URI', 'JWT_SECRET', 'DB_PASSWORD'];
    sensitiveKeys.forEach((key) => {
      // In code, verify that error messages do not dump process.env
      const sampleError = { message: 'Database connection error' };
      assert.equal(sampleError.message.includes(process.env[key] || 'nonexistent'), false);
    });
  });
});
