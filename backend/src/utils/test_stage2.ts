import http from 'http';
import app from '../server';

async function runStage2Tests() {
  console.log('🧪 Starting Stage 2 Comprehensive Verification Suite...');

  // Start test server on dynamic port
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 5000;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  let sessionCookie = '';

  async function request(path: string, options: { method?: string; body?: any; cookie?: string } = {}) {
    const url = `${baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (options.cookie) {
      headers['Cookie'] = options.cookie;
    }

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      sessionCookie = setCookie.split(';')[0];
    }

    let json: any = {};
    try {
      json = await response.json();
    } catch {
      json = {};
    }

    return { status: response.status, data: json, headers: response.headers };
  }

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, extra = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName} ${extra}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${extra}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    console.log('\n--- 1. Health & Unauthenticated Access Control ---');
    const health = await request('/health');
    assert(health.status === 200, 'Health endpoint reachable');

    const unauthProducts = await request('/products');
    assert(unauthProducts.status === 401, 'Protected route /api/products returns 401 when unauthenticated');

    const unauthReceipts = await request('/receipts');
    assert(unauthReceipts.status === 401, 'Protected route /api/receipts returns 401 when unauthenticated');

    // 2. Authentication Flow
    console.log('\n--- 2. Authentication Flow ---');
    // Login failure
    const badLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'manager@stocksense.local', password: 'WrongPassword!' },
    });
    assert(badLogin.status === 401, 'Invalid password correctly rejected with 401');

    // Successful login
    const goodLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'manager@stocksense.local', password: 'Manager123!' },
    });
    assert(goodLogin.status === 200, 'Login with correct credentials succeeds');
    assert(!!sessionCookie, 'HttpOnly session cookie received');
    assert(goodLogin.data.data.email === 'manager@stocksense.local', 'Logged-in user info returned without passwordHash');
    assert(!('passwordHash' in goodLogin.data.data), 'Password hash is strictly excluded from login response');

    // Check /auth/me with session cookie
    const meRes = await request('/auth/me', { cookie: sessionCookie });
    assert(meRes.status === 200, '/auth/me returns 200 with session cookie');
    assert(meRes.data.data.name === 'Alex Morgan', 'Authenticated user identity verified via session');
    assert(!('passwordHash' in meRes.data.data), 'Password hash not exposed on /auth/me');

    // Signup test - role escalation attempt
    const newEmail = `staff_${Date.now()}@stocksense.local`;
    const signupRes = await request('/auth/signup', {
      method: 'POST',
      body: {
        name: 'New Warehouse Operator',
        email: newEmail,
        password: 'Password123!',
        role: 'ADMIN', // attempt escalation
      },
    });
    assert(signupRes.status === 201, 'Signup creates user successfully');
    assert(signupRes.data.data.role === 'WAREHOUSE_STAFF', 'Role escalation prevented; forced to WAREHOUSE_STAFF');

    // 3. Receipt & 4-Decimal Precision Inventory Flow
    console.log('\n--- 3. Incoming Receipt & 4-Decimal Precision Inventory Flow ---');
    // Get locations and products
    const locsRes = await request('/locations', { cookie: sessionCookie });
    const prodsRes = await request('/products', { cookie: sessionCookie });
    assert(locsRes.data.data.length > 0, 'Locations fetched successfully');
    assert(prodsRes.data.data.length > 0, 'Products fetched successfully');

    const destLocation = locsRes.data.data[0];
    const testProduct = prodsRes.data.data[0];

    // Initial stock for this product at this location
    const initialBalRecord = testProduct.stockBalances?.find((b: any) => b.locationId === destLocation.id);
    const initialQty = initialBalRecord ? initialBalRecord.quantity : 0;

    // Create a new Receipt
    const createRecRes = await request('/receipts', {
      method: 'POST',
      cookie: sessionCookie,
      body: {
        partner: 'Acme Industrial Supplies Ltd.',
        destLocationId: destLocation.id,
        notes: 'Urgent stage 2 batch delivery',
        lines: [
          {
            productId: testProduct.id,
            demandQty: 100.5555,
            doneQty: 100.5555,
          },
        ],
      },
    });
    assert(createRecRes.status === 201, 'Receipt created with initial line item');
    const receipt = createRecRes.data.data;
    assert(receipt.status === 'DRAFT', 'Receipt created in DRAFT status');
    assert(receipt.lines.length === 1, 'Receipt contains 1 line item');
    assert(receipt.lines[0].demandQty === 100.5555, 'Line item preserved 4-decimal precision (100.5555)');

    // Add a second line
    if (prodsRes.data.data.length > 1) {
      const prod2 = prodsRes.data.data[1];
      const addLineRes = await request(`/receipts/${receipt.id}/lines`, {
        method: 'POST',
        cookie: sessionCookie,
        body: {
          productId: prod2.id,
          demandQty: 42.1234,
          doneQty: 0,
        },
      });
      assert(addLineRes.status === 201, 'Added second line item with 4-decimal precision (42.1234)');

      // Update done quantity
      const updateLineRes = await request(`/receipts/${receipt.id}/lines/${addLineRes.data.data.id}`, {
        method: 'PUT',
        cookie: sessionCookie,
        body: { doneQty: 42.1234 },
      });
      assert(updateLineRes.status === 200, 'Updated line doneQty to 42.1234');
    }

    // Validate the receipt
    const validateRes = await request(`/receipts/${receipt.id}/validate`, {
      method: 'POST',
      cookie: sessionCookie,
      body: { version: receipt.version },
    });
    assert(validateRes.status === 200, 'Receipt validated atomically');
    assert(validateRes.data.data.status === 'DONE', 'Receipt status changed to DONE');

    // Prevent double validation
    const doubleValidateRes = await request(`/receipts/${receipt.id}/validate`, {
      method: 'POST',
      cookie: sessionCookie,
      body: { version: receipt.version },
    });
    assert(doubleValidateRes.status === 400 || doubleValidateRes.status === 409, 'Double validation rejected');

    // Verify stock balance updated with exact precision
    const updatedProdRes = await request(`/products/${testProduct.id}`, { cookie: sessionCookie });
    const updatedBalRecord = updatedProdRes.data.data.stockBalances?.find((b: any) => b.locationId === destLocation.id);
    const expectedQty = Math.round((initialQty + 100.5555) * 10000) / 10000;
    assert(
      updatedBalRecord && updatedBalRecord.quantity === expectedQty,
      `Stock balance updated accurately to ${expectedQty} (initial ${initialQty} + 100.5555)`
    );

    // 4. Move History / Stock Ledger Verification
    console.log('\n--- 4. Stock Ledger & Move History ---');
    const ledgerRes = await request('/ledger', { cookie: sessionCookie });
    assert(ledgerRes.status === 200, 'Ledger endpoint reachable');
    assert(ledgerRes.data.data.length > 0, 'Stock ledger contains validated movement entries');

    const matchingEntry = ledgerRes.data.data.find(
      (e: any) => e.referenceDoc === receipt.reference && e.productId === testProduct.id
    );
    console.log('    [Debug Ledger Entry]:', JSON.stringify(matchingEntry));
    assert(matchingEntry?.actor?.email === newEmail, `Ledger entry tracks performing actor (got: ${matchingEntry?.actor?.email})`);

    // 5. OTP Password Reset Flow
    console.log('\n--- 5. OTP Password Reset Flow ---');
    // Request OTP
    const otpReqRes = await request('/auth/reset-password/request', {
      method: 'POST',
      body: { email: 'admin@stocksense.local' },
    });
    assert(otpReqRes.status === 200, 'OTP request sent successfully');

    // Attempt invalid OTP
    const badOtpRes = await request('/auth/reset-password/verify', {
      method: 'POST',
      body: { email: 'admin@stocksense.local', otp: '000000' },
    });
    assert(badOtpRes.status === 401, 'Invalid 6-digit OTP correctly rejected');

    // 6. Session Termination (Logout)
    console.log('\n--- 6. Session Termination (Logout) ---');
    const logoutRes = await request('/auth/logout', { method: 'POST', cookie: sessionCookie });
    assert(logoutRes.status === 200, 'Logout succeeds and destroys server session');

    const meAfterLogout = await request('/auth/me', { cookie: sessionCookie });
    assert(meAfterLogout.status === 401, 'Subsequent request with old session rejected with 401');

    console.log(`\n🎉 Verification Completed: ${passed} passed, ${failed} failed.\n`);
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    server.close();
    process.exit(1);
  }
}

runStage2Tests();
