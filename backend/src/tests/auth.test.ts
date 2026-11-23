import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetTestDb } from './helpers/dbSetup.js';
import { getStaffToken } from './helpers/authHelper.js';

const app = createApp();

describe('Authentication API Tests', () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  // TC-AUTH-01: Successful user registration
  it('TC-AUTH-01: should register a valid user successfully with 201 Created', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'John Doe',
        email: 'johndoe@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe('johndoe@example.com');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.headers['x-request-id']).toBeDefined();
  });

  // TC-AUTH-02: Duplicate email registration
  it('TC-AUTH-02: should reject duplicate email registration with 409 Conflict', async () => {
    // Attempt to register with email that already exists in seed.sql
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Duplicate User',
        email: 'staff@skillforge.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  // TC-AUTH-03: Invalid email and password validation
  it('TC-AUTH-03: should reject invalid email format and weak password with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'J',
        email: 'not-an-email',
        password: 'weak',
        confirmPassword: 'weak',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  // TC-AUTH-04: Successful login
  it('TC-AUTH-04: should successfully login valid credentials and return JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@skillforge.com',
        password: 'Admin123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('ADMIN');
  });

  // TC-AUTH-05: Invalid login credentials
  it('TC-AUTH-05: should reject invalid password with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@skillforge.com',
        password: 'WrongPassword999!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  // TC-AUTH-06: Logout functionality
  it('TC-AUTH-06: should successfully logout and revoke session token', async () => {
    const token = await getStaffToken();

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/logged out successfully/i);
  });

  // TC-AUTH-07: Default STAFF role assignment
  it('TC-AUTH-07: should assign default STAFF role to newly registered users', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'New Staff Member',
        email: 'newstaff@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('STAFF');
    expect(res.body.data.user.roleId).toBe(3);
  });

  // TC-AUTH-08: Invalid Google authentication token
  it('TC-AUTH-08: should reject invalid Google identity token with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({
        idToken: 'fake-invalid-google-jwt-token-12345',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Google identity verification failed/i);
  });
});
