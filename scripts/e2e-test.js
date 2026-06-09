/**
 * E2E Test Script - Telegram Preview Bot
 * Use: node scripts/e2e-test.js <backend-url> <dashboard-url>
 */

const { chromium } = require('playwright');

const BACKEND_URL = process.argv[2] || 'https://backend-production-XXXX.up.railway.app';
const DASHBOARD_URL = process.argv[3] || 'https://dashboard-production-XXXX.up.railway.app';
const REPORT_FILE = 'E2E_TEST_REPORT.md';

async function runE2ETests() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = [];
  const errors = [];

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    errors.push(`Page Error: ${err.message}`);
  });

  try {
    console.log('==========================================');
    console.log('E2E TEST - Telegram Preview Bot');
    console.log('==========================================\n');

    // Test 1: Dashboard loads
    console.log('1. Testing Dashboard Load...');
    try {
      await page.goto(DASHBOARD_URL, { timeout: 30000 });
      const title = await page.title();
      results.push({ test: 'Dashboard Load', status: 'PASS', details: `Title: ${title}` });
      console.log('   ✓ Dashboard loaded successfully\n');
    } catch (e) {
      results.push({ test: 'Dashboard Load', status: 'FAIL', details: e.message });
      console.log(`   ✗ Failed: ${e.message}\n`);
    }

    // Test 2: Login Page
    console.log('2. Testing Login Page...');
    try {
      await page.goto(`${DASHBOARD_URL}/login`, { timeout: 30000 });
      const loginForm = await page.$('form, input[type="text"], input[name="username"]');
      results.push({ test: 'Login Page', status: loginForm ? 'PASS' : 'FAIL', details: loginForm ? 'Login form found' : 'No login form found' });
      console.log(`   ${loginForm ? '✓' : '✗'} Login page ${loginForm ? 'accessible' : 'not accessible'}\n`);
    } catch (e) {
      results.push({ test: 'Login Page', status: 'FAIL', details: e.message });
      console.log(`   ✗ Failed: ${e.message}\n`);
    }

    // Test 3: Login with default credentials
    console.log('3. Testing Login with default credentials...');
    try {
      await page.goto(`${DASHBOARD_URL}/login`, { timeout: 30000 });
      await page.fill('input[name="username"], input[type="text"]', 'admin');
      await page.fill('input[name="password"], input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      results.push({ test: 'Login', status: 'PASS', details: 'Logged in successfully' });
      console.log('   ✓ Login successful\n');
    } catch (e) {
      results.push({ test: 'Login', status: 'FAIL', details: e.message });
      console.log(`   ✗ Failed: ${e.message}\n`);
    }

    // Test 4: Dashboard Channels Page
    console.log('4. Testing Channels Page...');
    try {
      await page.goto(`${DASHBOARD_URL}/dashboard/channels`, { timeout: 30000 });
      const content = await page.textContent('body');
      results.push({ test: 'Channels Page', status: content.includes('Channel') || content.includes('channel') ? 'PASS' : 'FAIL', details: 'Channels page loaded' });
      console.log('   ✓ Channels page accessible\n');
    } catch (e) {
      results.push({ test: 'Channels Page', status: 'FAIL', details: e.message });
      console.log(`   ✗ Failed: ${e.message}\n`);
    }

    // Test 5: Dashboard Posts Page
    console.log('5. Testing Posts Page...');
    try {
      await page.goto(`${DASHBOARD_URL}/dashboard/posts`, { timeout: 30000 });
      const content = await page.textContent('body');
      results.push({ test: 'Posts Page', status: content.includes('Post') || content.includes('post') ? 'PASS' : 'FAIL', details: 'Posts page loaded' });
      console.log('   ✓ Posts page accessible\n');
    } catch (e) {
      results.push({ test: 'Posts Page', status: 'FAIL', details: e.message });
      console.log(`   ✗ Failed: ${e.message}\n`);
    }

    // Test 6: Backend API Health
    console.log('6. Testing Backend API Health...');
    try {
      const response = await page.request.get(`${BACKEND_URL}/health`);
      const json = await response.json();
      results.push({ test: 'Backend Health', status: json.status === 'ok' ? 'PASS' : 'FAIL', details: `Status: ${json.status}` });
      console.log(`   ${json.status === 'ok' ? '✓' : '✗'} Backend health: ${json.status}\n`);
    } catch (e) {
      results.push({ test: 'Backend Health', status: 'FAIL', details: e.message });
      console.log(`   ✗ Failed: ${e.message}\n`);
    }

    // Test7: Backend Channels API
    console.log('7. Testing Backend Channels API...');
    try {
      const response = await page.request.get(`${BACKEND_URL}/api/channels`);
      results.push({ test: 'Channels API', status: response.ok() ? 'PASS' : 'FAIL', details: `HTTP ${response.status()}` });
      console.log(`   ${response.ok() ? '✓' : '✗'} Channels API: HTTP ${response.status()}\n`);
    } catch (e) {
      results.push({ test: 'Channels API', status: 'FAIL', details: e.message });
      console.log(`   ✗ Failed: ${e.message}\n`);
    }

    // Test8: Network Errors
    console.log('8. Checking for Network Errors...');
    const networkErrors = errors.filter(e => e.includes('Failed to fetch') || e.includes('Network'));
    results.push({ test: 'Network Errors', status: networkErrors.length === 0 ? 'PASS' : 'FAIL', details: networkErrors.length === 0 ? 'No network errors' : `${networkErrors.length} errors found` });
    console.log(`   ${networkErrors.length === 0 ? '✓' : '✗'} Network errors: ${networkErrors.length}\n`);

  } catch (e) {
    console.error('Test error:', e.message);
  } finally {
    await browser.close();
  }

  // Generate Report
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log('==========================================');
  console.log('SUMMARY');
  console.log('==========================================');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('');

  // Write Report
  let report = `# E2E TEST REPORT\n`;
 report += `========================================\n\n`;
  report += `**Date:** ${new Date().toISOString()}\n`;
  report += `**Backend URL:** ${BACKEND_URL}\n`;
  report += `**Dashboard URL:** ${DASHBOARD_URL}\n\n`;
  report += `## Test Results\n\n`;
  report += `| Test | Status | Details |\n`;
  report += `|------|--------|----------|\n`;
  results.forEach(r => {
    report += `| ${r.test} | ${r.status} | ${r.details} |\n`;
  });
  report += `\n## Summary\n\n`;
  report += `- **Passed:** ${passed}\n`;
  report += `- **Failed:** ${failed}\n`;
  report += `- **Total:** ${results.length}\n\n`;
  report += `## Console Errors\n\n`;
  if (errors.length === 0) {
    report += `No console errors detected.\n`;
  } else {
    report += `\`\`\`\n${errors.join('\n')}\n\`\`\`\n`;
  }
  report += `\n## Status\n\n`;
  report += failed === 0 ? `**ALL TESTS PASSED**\n` : `**SOME TESTS FAILED**\n`;

  require('fs').writeFileSync(REPORT_FILE, report);
  console.log(`Report saved to: ${REPORT_FILE}`);

  return failed === 0;
}

runE2ETests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
