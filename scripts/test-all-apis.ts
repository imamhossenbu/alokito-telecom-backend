const BASE_URL = process.env.TEST_API_URL || 'https://alokito-telecom-backend-7coy.onrender.com';

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  expectedStatus: number[];
  success: boolean;
  message?: string;
  dataSnippet?: string;
  durationMs: number;
}

const results: TestResult[] = [];
let adminToken: string | null = null;

async function request(
  method: string,
  path: string,
  body?: any,
  useAuth = false,
  expectedStatuses = [200, 201]
): Promise<{ status: number; data: any; durationMs: number }> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (useAuth && adminToken) {
    headers['Authorization'] = `Bearer ${adminToken}`;
  }

  const start = Date.now();
  let status = 0;
  let data: any = null;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    status = res.status;
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  } catch (err: any) {
    status = 500;
    data = { error: err.message };
  }

  const durationMs = Date.now() - start;
  const isSuccess = expectedStatuses.includes(status);

  results.push({
    endpoint: path,
    method,
    status,
    expectedStatus: expectedStatuses,
    success: isSuccess,
    message: data?.message || (typeof data === 'string' ? data.slice(0, 100) : ''),
    dataSnippet: typeof data === 'object' ? JSON.stringify(data).slice(0, 120) : String(data).slice(0, 120),
    durationMs,
  });

  return { status, data, durationMs };
}

async function runAllApiTests() {
  console.log(`\n======================================================`);
  console.log(`🚀 RUNNING FULL END-TO-END TELECOM API TEST SUITE`);
  console.log(`🎯 TARGET BASE URL: ${BASE_URL}`);
  console.log(`⏰ TIME: ${new Date().toISOString()}`);
  console.log(`======================================================\n`);

  // 1. Health check
  console.log(`[1/16] Testing Health Check...`);
  await request('GET', '/health', undefined, false, [200]);

  // 2. Admin Login
  console.log(`[2/16] Testing Admin Authentication Login...`);
  const loginRes = await request('POST', '/api/v1/admin/auth/login', {
    email: 'admin@telecom.com',
    password: 'admin123',
  }, false, [200]);

  if (loginRes.status === 200 && loginRes.data?.data?.accessToken) {
    adminToken = loginRes.data.data.accessToken;
    console.log(`   ✅ Admin Token received successfully`);
  } else {
    console.log(`   ⚠️ Failed to get admin token:`, loginRes.data);
  }

  // 3. Admin Profile
  console.log(`[3/16] Testing Admin Profile (GET /api/v1/admin/profile)...`);
  await request('GET', '/api/v1/admin/profile', undefined, true, [200]);

  // 4. Admin Dashboard Stats
  console.log(`[4/16] Testing Admin Dashboard Stats (GET /api/v1/admin/dashboard)...`);
  await request('GET', '/api/v1/admin/dashboard', undefined, true, [200]);

  // 5. Admin Wallet & Treasury Summary
  console.log(`[5/16] Testing Platform Treasury Summary (GET /api/v1/admin/wallet/summary)...`);
  await request('GET', '/api/v1/admin/wallet/summary', undefined, true, [200]);

  // 6. Admin Wallet Transactions (with pagination and filters)
  console.log(`[6/16] Testing Wallet Transactions (GET /api/v1/admin/wallet/transactions)...`);
  await request('GET', '/api/v1/admin/wallet/transactions?page=1&limit=10', undefined, true, [200]);
  await request('GET', '/api/v1/admin/wallet/transactions?type=TOP_UP', undefined, true, [200]);
  await request('GET', '/api/v1/admin/wallet/transactions?type=PURCHASE', undefined, true, [200]);

  // 7. Offers API (Admin + Drive Offers)
  console.log(`[7/16] Testing Offers APIs...`);
  await request('GET', '/api/v1/admin/offers?page=1&limit=10', undefined, true, [200]);
  await request('GET', '/api/v1/admin/drive-offers?page=1&limit=10', undefined, true, [200]);

  // 8. Orders API
  console.log(`[8/16] Testing Orders APIs...`);
  await request('GET', '/api/v1/admin/orders?page=1&limit=10', undefined, true, [200]);
  await request('GET', '/api/v1/admin/orders?status=ACTIVATION_PENDING', undefined, true, [200]);

  // 9. Users API
  console.log(`[9/16] Testing Users Management APIs...`);
  await request('GET', '/api/v1/admin/users?page=1&limit=10', undefined, true, [200]);

  // 10. Devices API (Payment Devices)
  console.log(`[10/16] Testing Payment Devices APIs...`);
  await request('GET', '/api/v1/admin/payment-devices', undefined, true, [200]);

  // 11. Notifications API
  console.log(`[11/16] Testing Notifications API...`);
  await request('GET', '/api/v1/admin/notifications', undefined, true, [200]);

  // 12. Operators API (Admin)
  console.log(`[12/16] Testing Operators API...`);
  await request('GET', '/api/v1/admin/operators', undefined, true, [200]);

  // 13. Refunds API
  console.log(`[13/16] Testing Refunds API...`);
  await request('GET', '/api/v1/admin/refunds', undefined, true, [200]);

  // 14. Payment Device Pairing Code Generation
  console.log(`[14/16] Testing Device Pairing Code Generation...`);
  await request('POST', '/api/v1/admin/payment-devices/pair', {
    deviceName: 'Test Listener Device',
    simOperator: 'GP',
  }, true, [200, 201]);

  // 15. APK Download Portal Check
  console.log(`[15/16] Testing Downloads Portal...`);
  await request('GET', '/downloads', undefined, false, [200]);

  // 16. Admin Web App Static Serving Check
  console.log(`[16/16] Testing Admin Web Hosting (/admin)...`);
  await request('GET', '/admin/', undefined, false, [200]);

  // Summary Printout
  console.log(`\n======================================================`);
  console.log(`📊 TEST SUITE SUMMARY`);
  console.log(`======================================================\n`);

  let passed = 0;
  let failed = 0;

  for (const res of results) {
    const icon = res.success ? '✅ PASS' : '❌ FAIL';
    console.log(
      `${icon} [${res.method.padEnd(4)}] ${res.endpoint.padEnd(48)} | Status: ${res.status} | (${res.durationMs}ms)`
    );
    if (res.success) {
      passed++;
    } else {
      failed++;
      console.log(`     ⚠️ Message: ${res.message} | Snippet: ${res.dataSnippet}`);
    }
  }

  console.log(`\n------------------------------------------------------`);
  console.log(`Total Tested: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Pass Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  console.log(`------------------------------------------------------\n`);
}

runAllApiTests();
