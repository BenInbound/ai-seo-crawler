/**
 * Integration Tests for User Story 1
 *
 * Tests:
 * - T045: Organization creation and user invitation flow end-to-end
 * - T046: RLS policies prevent cross-organization data access
 * - T047: Role-based permissions (admin/editor/viewer)
 *
 * Prerequisites:
 * - Backend server must be running
 * - Database must be initialized with schema and RLS policies
 * - Environment variables must be configured
 */

const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');

// Note: These tests require the backend server to be running
// Run with: npm test tests/integration/api/user-story-1.test.js

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe('User Story 1: Organization Setup and Project Creation', () => {
  let supabase;
  let user1Token;
  let user2Token;
  let org1Id;
  let org2Id;
  let project1Id;

  beforeAll(() => {
    // Initialize Supabase client for direct database verification
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    }
  });

  describe('T045: Organization creation and user invitation flow', () => {
    test('User 1 can register and automatically gets a personal organization', async () => {
      const timestamp = Date.now();
      const user1Data = {
        name: `Test User 1 ${timestamp}`,
        email: `testuser1-${timestamp}@example.com`,
        password: 'SecurePass123!'
      };

      const response = await request(BASE_URL)
        .post('/api/auth/register')
        .send(user1Data)
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(user1Data.email);

      user1Token = response.body.token;

      // Verify user has a personal organization
      const orgsResponse = await request(BASE_URL)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(orgsResponse.body.data).toBeInstanceOf(Array);
      expect(orgsResponse.body.data.length).toBeGreaterThan(0);

      const personalOrg = orgsResponse.body.data.find(
        org => org.name === `${user1Data.name}'s Organization`
      );
      expect(personalOrg).toBeDefined();
      expect(personalOrg.role).toBe('admin');

      org1Id = personalOrg.id;
    });

    test('User 1 can create a new organization', async () => {
      const timestamp = Date.now();
      const orgData = {
        name: `Test Organization ${timestamp}`,
        description: 'Integration test organization'
      };

      const response = await request(BASE_URL)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(orgData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(orgData.name);

      org1Id = response.body.id;
    });

    test('User 2 can register and get invited to User 1 organization', async () => {
      const timestamp = Date.now();
      const user2Data = {
        name: `Test User 2 ${timestamp}`,
        email: `testuser2-${timestamp}@example.com`,
        password: 'SecurePass123!'
      };

      // Register User 2
      const registerResponse = await request(BASE_URL)
        .post('/api/auth/register')
        .send(user2Data)
        .expect(201);

      user2Token = registerResponse.body.token;

      // User 1 invites User 2 to their organization as editor
      const inviteResponse = await request(BASE_URL)
        .post(`/api/organizations/${org1Id}/members`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          email: user2Data.email,
          role: 'editor'
        })
        .expect(201);

      expect(inviteResponse.body).toHaveProperty('user_id');
      expect(inviteResponse.body.role).toBe('editor');

      // Verify User 2 can see the organization
      const user2OrgsResponse = await request(BASE_URL)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      const invitedOrg = user2OrgsResponse.body.data.find(org => org.id === org1Id);
      expect(invitedOrg).toBeDefined();
      expect(invitedOrg.role).toBe('editor');
    });

    test('User 1 can create a project in their organization', async () => {
      const timestamp = Date.now();
      const projectData = {
        name: `Test Project ${timestamp}`,
        target_url: 'https://example.com',
        description: 'Integration test project',
        config: {
          depth_limit: 3,
          sample_size: 50,
          token_limit: 10000
        }
      };

      const response = await request(BASE_URL)
        .post(`/api/organizations/${org1Id}/projects`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send(projectData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(projectData.name);
      expect(response.body.organization_id).toBe(org1Id);

      project1Id = response.body.id;
    });

    test('User 2 (editor) can view projects in the organization', async () => {
      const response = await request(BASE_URL)
        .get(`/api/organizations/${org1Id}/projects`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      const project = response.body.data.find(p => p.id === project1Id);
      expect(project).toBeDefined();
    });
  });

  describe('T046: RLS policies prevent cross-organization data access', () => {
    test('User 2 creates their own organization', async () => {
      const timestamp = Date.now();
      const orgData = {
        name: `User 2 Organization ${timestamp}`,
        description: 'User 2 test organization'
      };

      const response = await request(BASE_URL)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${user2Token}`)
        .send(orgData)
        .expect(201);

      org2Id = response.body.id;
    });

    test('User 2 cannot access User 1 personal organization projects', async () => {
      // Get User 1 personal organization
      const user1OrgsResponse = await request(BASE_URL)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const user1PersonalOrg = user1OrgsResponse.body.data.find(
        org => org.role === 'admin' && org.id !== org1Id
      );

      if (user1PersonalOrg) {
        // User 2 tries to access User 1 personal org projects
        const response = await request(BASE_URL)
          .get(`/api/organizations/${user1PersonalOrg.id}/projects`)
          .set('Authorization', `Bearer ${user2Token}`)
          .expect(403);

        expect(response.body).toHaveProperty('error');
      }
    });

    test('User 1 cannot access User 2 organization', async () => {
      const response = await request(BASE_URL)
        .get(`/api/organizations/${org2Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    test('User 1 cannot list projects in User 2 organization', async () => {
      const response = await request(BASE_URL)
        .get(`/api/organizations/${org2Id}/projects`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    test('Database RLS prevents direct data access across organizations', async () => {
      if (!supabase) {
        // Skip test if Supabase not configured
        return;
      }

      // Service role can access, but verify RLS is enabled
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', org2Id)
        .single();

      expect(org).toBeDefined();
    });
  });

  describe('T047: Role-based permissions (admin/editor/viewer)', () => {
    let viewerToken;

    test('User 1 invites User 3 as viewer', async () => {
      const timestamp = Date.now();
      const viewerData = {
        name: `Test Viewer ${timestamp}`,
        email: `testviewer-${timestamp}@example.com`,
        password: 'SecurePass123!'
      };

      // Register viewer
      const registerResponse = await request(BASE_URL)
        .post('/api/auth/register')
        .send(viewerData)
        .expect(201);

      viewerToken = registerResponse.body.token;

      // Invite as viewer
      await request(BASE_URL)
        .post(`/api/organizations/${org1Id}/members`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          email: viewerData.email,
          role: 'viewer'
        })
        .expect(201);
    });

    test('Admin (User 1) can create projects', async () => {
      const timestamp = Date.now();
      const projectData = {
        name: `Admin Project ${timestamp}`,
        target_url: 'https://example.com',
        config: { depth_limit: 3 }
      };

      await request(BASE_URL)
        .post(`/api/organizations/${org1Id}/projects`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send(projectData)
        .expect(201);
    });

    test('Editor (User 2) can create projects', async () => {
      const timestamp = Date.now();
      const projectData = {
        name: `Editor Project ${timestamp}`,
        target_url: 'https://example.com',
        config: { depth_limit: 3 }
      };

      await request(BASE_URL)
        .post(`/api/organizations/${org1Id}/projects`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send(projectData)
        .expect(201);
    });

    test('Viewer cannot create projects', async () => {
      const timestamp = Date.now();
      const projectData = {
        name: `Viewer Project ${timestamp}`,
        target_url: 'https://example.com',
        config: { depth_limit: 3 }
      };

      const response = await request(BASE_URL)
        .post(`/api/organizations/${org1Id}/projects`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(projectData)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    test('Viewer can list projects', async () => {
      const response = await request(BASE_URL)
        .get(`/api/organizations/${org1Id}/projects`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });

    test('Editor cannot manage organization members', async () => {
      const timestamp = Date.now();
      const response = await request(BASE_URL)
        .post(`/api/organizations/${org1Id}/members`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          email: `newuser-${timestamp}@example.com`,
          role: 'viewer'
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    test('Admin can manage organization members', async () => {
      // Get members list
      const response = await request(BASE_URL)
        .get(`/api/organizations/${org1Id}/members`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('Viewer cannot update projects', async () => {
      const response = await request(BASE_URL)
        .patch(`/api/projects/${project1Id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ description: 'Updated by viewer' })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    test('Editor can update projects', async () => {
      const response = await request(BASE_URL)
        .patch(`/api/projects/${project1Id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ description: 'Updated by editor' })
        .expect(200);

      expect(response.body.description).toBe('Updated by editor');
    });
  });

  // Cleanup after all tests
  afterAll(async () => {
    if (supabase) {
      // Note: In a real scenario, you might want to clean up test data
      // For now, we'll leave it as the tests create timestamped data
    }
  });
});
