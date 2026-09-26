const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode, data: parsed });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting StockSense Stage 1 Acceptance Tests...\n');
  let passed = 0;
  let total = 0;

  function assert(condition, name, details = '') {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} - ${details}`);
    }
  }

  // 1. Health Endpoint
  const healthRes = await request('GET', '/health');
  assert(
    healthRes.status === 200 && healthRes.data.status === 'ok' && healthRes.data.app === 'StockSense',
    'Test 1: Health endpoint responds with 200 and status:ok',
    JSON.stringify(healthRes.data)
  );

  // 2. Fetch Categories
  const catsRes = await request('GET', '/categories');
  assert(
    catsRes.status === 200 && Array.isArray(catsRes.data.data) && catsRes.data.data.length >= 4,
    'Test 2: Pre-seeded categories loaded (>= 4 categories)',
    `Found ${catsRes.data?.data?.length} categories`
  );
  const categoryId = catsRes.data.data[0].id;

  // 3. Create Warehouse
  const whRes = await request('POST', '/warehouses', {
    name: 'East Distribution Center',
    code: 'WH-EAST',
    address: '99 Harbor Boulevard',
  });
  assert(
    whRes.status === 201 && whRes.data.data.code === 'WH-EAST',
    'Test 3: Warehouse creation succeeds with code WH-EAST',
    JSON.stringify(whRes.data)
  );
  const warehouseId = whRes.data.data.id;

  // 4. Create Location under Warehouse
  const locRes = await request('POST', '/locations', {
    name: 'Buffer Staging Zone',
    code: 'WH-EAST/STAGE-1',
    warehouseId,
    isScrap: false,
  });
  assert(
    locRes.status === 201 && locRes.data.data.code === 'WH-EAST/STAGE-1',
    'Test 4: Location creation succeeds under parent warehouse',
    JSON.stringify(locRes.data)
  );

  // 5. Create Product
  const prodRes = await request('POST', '/products', {
    name: 'Industrial Aluminum Ingot',
    sku: 'RAW-ALU-001',
    categoryId,
    uom: 'kg',
    reorderThreshold: 25.0,
    description: 'High grade 6061 raw aluminum ingot',
  });
  assert(
    prodRes.status === 201 && prodRes.data.data.sku === 'RAW-ALU-001' && prodRes.data.data.totalStock === 0,
    'Test 5: Product created with unique SKU and 0 total initial stock',
    JSON.stringify(prodRes.data)
  );
  const productId = prodRes.data.data.id;

  // 6. Duplicate SKU Rejection
  const dupProdRes = await request('POST', '/products', {
    name: 'Duplicate Aluminum',
    sku: 'RAW-ALU-001',
    categoryId,
    uom: 'kg',
  });
  assert(
    dupProdRes.status === 409 && dupProdRes.data.success === false,
    'Test 6: Duplicate SKU rejected cleanly with HTTP 409 Conflict',
    `Status: ${dupProdRes.status}, Message: ${dupProdRes.data?.message}`
  );

  // 7. Search and Category Filter
  const searchRes = await request('GET', '/products?search=Aluminum');
  assert(
    searchRes.status === 200 && searchRes.data.data.length >= 1 && searchRes.data.data[0].sku === 'RAW-ALU-001',
    'Test 7: Product search by name/SKU returns matching records',
    `Results: ${searchRes.data?.data?.length}`
  );

  const filterRes = await request('GET', `/products?categoryId=${categoryId}`);
  assert(
    filterRes.status === 200 && filterRes.data.data.length >= 1,
    'Test 8: Category filtering returns matching products',
    `Results: ${filterRes.data?.data?.length}`
  );

  // 8. Edit Product
  const editRes = await request('PUT', `/products/${productId}`, {
    name: 'Industrial Aluminum Ingot 6061-T6',
    sku: 'RAW-ALU-001',
    categoryId,
    uom: 'kg',
    reorderThreshold: 30.0,
    description: 'Updated heat treated specifications',
  });
  assert(
    editRes.status === 200 && editRes.data.data.name === 'Industrial Aluminum Ingot 6061-T6' && editRes.data.data.reorderThreshold === 30,
    'Test 9: Edit product persists metadata and reorder threshold updates',
    JSON.stringify(editRes.data)
  );

  // 9. Input Validation for Invalid Data
  const invalidRes = await request('POST', '/products', {
    name: '',
    sku: '',
    categoryId: 'invalid-id',
    reorderThreshold: -15,
  });
  assert(
    (invalidRes.status === 422 || invalidRes.status === 404 || invalidRes.status === 400) && invalidRes.data.success === false,
    'Test 10: Invalid input rejected with proper validation error status',
    `Status: ${invalidRes.status}`
  );

  // 10. Frontend Proxy / Vite check
  const frontendHealth = await new Promise((resolve) => {
    const req = http.request({ hostname: 'localhost', port: 5173, path: '/api/health', method: 'GET' }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', () => resolve({ status: 500, data: null }));
    req.end();
  });
  assert(
    frontendHealth.status === 200 && frontendHealth.data && frontendHealth.data.status === 'ok',
    'Test 11: Frontend /api proxy forwards correctly to backend',
    JSON.stringify(frontendHealth.data)
  );

  console.log(`\n📊 Acceptance Summary: ${passed} / ${total} tests passed.`);
  if (passed === total) {
    console.log('🎉 ALL STAGE 1 ACCEPTANCE CHECKS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('⚠️ Some acceptance checks failed.');
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
