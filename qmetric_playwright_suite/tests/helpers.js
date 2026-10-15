const { expect } = require('@playwright/test');
const { accounts, DEMO_PASSWORD } = require('./test-data');

const BASE_URL = process.env.QMETRIC_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.QMETRIC_API_URL || 'http://localhost:5000';

function stamp() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function resolveEmail(accountOrEmail) {
  if (!accountOrEmail) return '';
  if (typeof accountOrEmail === 'string') {
    return accounts[accountOrEmail]?.email || accountOrEmail;
  }
  return accountOrEmail.email || '';
}

async function devToken(request, accountOrEmail) {
  const email = resolveEmail(accountOrEmail);
  const response = await request.post(`${API_URL}/dev/login`, { data: { email } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok()) {
    throw new Error(
      `Dev login failed for ${email}. HTTP ${response.status()}: ${JSON.stringify(body)}. ` +
      `Make sure NODE_ENV is not production and ENABLE_DEV_AUTH=true.`
    );
  }
  if (!body.token) throw new Error(`No token returned by /dev/login for ${email}`);
  return body.token;
}

async function api(request, accountOrEmail, method, path, data) {
  const token = await devToken(request, accountOrEmail);
  const options = {
    headers: { Authorization: `Bearer ${token}` },
  };
  if (data !== undefined) options.data = data;
  const response = await request.fetch(`${API_URL}${path}`, { method, ...options });
  let body = null;
  try { body = await response.json(); } catch {}
  return { response, body, token };
}

async function getProfile(request, accountOrEmail) {
  const token = await devToken(request, accountOrEmail);
  const response = await request.get(`${API_URL}/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json();
  if (!response.ok() || !body.user) {
    throw new Error(`Cannot load profile for ${typeof accountOrEmail === 'string' ? accountOrEmail : accountOrEmail.email}`);
  }
  return { token, user: body.user };
}

async function loginAs(page, accountKeyOrAccount, path = '/') {
  const account = typeof accountKeyOrAccount === 'string'
    ? accounts[accountKeyOrAccount] || { email: accountKeyOrAccount }
    : accountKeyOrAccount;

  if (!account?.email) throw new Error(`Unknown account: ${accountKeyOrAccount}`);

  const request = await page.request;
  const { token, user } = await getProfile(request, account);
  const hostname = new URL(BASE_URL).hostname;

  await page.context().addCookies([
    {
      name: 'accessToken',
      value: token,
      domain: hostname,
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      secure: BASE_URL.startsWith('https://'),
    },
  ]);

  await page.addInitScript((cachedUser) => {
    localStorage.setItem('user', JSON.stringify(cachedUser));
  }, user);

  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  return { account, user, token };
}

async function logoutViaUi(page) {
  const avatar = page.locator('.user-menu-container > button').first();
  if (await avatar.count()) {
    await avatar.click();
    const logout = page.getByRole('button', { name: 'Logout', exact: true });
    if (await logout.count()) await logout.click();
  }
}

async function waitForApp(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(300);
}

async function unique(prefix) {
  return `${prefix}_${stamp()}`;
}

async function getCollegeByCode(request, code) {
  const response = await request.get(`${API_URL}/auth/colleges`);
  const body = await response.json();
  expect(response.ok()).toBeTruthy();
  const college = (body.colleges || body.data || []).find((c) => c.code === code);
  if (!college) throw new Error(`College ${code} not found. Run npm run seed:demo.`);
  return college;
}

async function listPapers(request, accountOrEmail, { endpoint = '/teacher/papers', status, search } = {}) {
  const query = new URLSearchParams({ page: '1', limit: '100' });
  if (status) query.set('status', status);
  if (search) query.set('search', search);
  const { response, body } = await api(request, accountOrEmail, 'GET', `${endpoint}?${query}`);
  expect(response.ok()).toBeTruthy();
  return body;
}

async function findPaper(request, accountOrEmail, matcher = {}) {
  const endpoint = matcher.endpoint || '/teacher/papers';
  const body = await listPapers(request, accountOrEmail, {
    endpoint,
    status: matcher.status,
    search: matcher.search,
  });
  const papers = body.papers || [];
  return papers.find((p) => (
    (!matcher.code || (p.courseCode || p['Course Code']) === matcher.code) &&
    (!matcher.name || (p.courseName || p['Course Name']) === matcher.name) &&
    (!matcher.status || (p.reviewStatus || 'draft') === matcher.status)
  ));
}

async function expectApiStatus(result, status) {
  expect(result.response.status()).toBe(status);
  return result;
}

async function resetDemoFromConfig() {
  if (process.env.RESET_DEMO !== '1') return;
  const { execFileSync } = require('node:child_process');
  const path = require('node:path');
  const backendDir = process.env.QMETRIC_BACKEND_DIR
    ? path.resolve(process.env.QMETRIC_BACKEND_DIR)
    : path.resolve(process.cwd(), '..', 'backend');
  execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'seed:demo'], {
    cwd: backendDir,
    stdio: 'inherit',
  });
  execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'seed:demo-papers'], {
    cwd: backendDir,
    stdio: 'inherit',
  });
}

module.exports = {
  BASE_URL,
  API_URL,
  DEMO_PASSWORD,
  api,
  devToken,
  getProfile,
  loginAs,
  logoutViaUi,
  waitForApp,
  unique,
  getCollegeByCode,
  listPapers,
  findPaper,
  expectApiStatus,
  resetDemoFromConfig,
};
