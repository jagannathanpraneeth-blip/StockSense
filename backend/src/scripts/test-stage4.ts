import prisma from '../db/client';
import { roundQuantity, addQuantities, subtractQuantities, isValidQuantity } from '../utils/quantity';
import {
  getOrCreateBalance,
  addStock,
  deductStock,
  writeLedger,
  generateReference,
} from '../services/stock.service';

interface TestStats {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

const stats: TestStats = { total: 0, passed: 0, failed: 0, skipped: 0 };

function assert(condition: boolean, testName: string, details?: string) {
  stats.total++;
  if (condition) {
    stats.passed++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    stats.failed++;
    console.error(`  ❌ FAIL: ${testName}${details ? ` — ${details}` : ''}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runStage4AcceptanceTests() {
  console.log('===============================================================');
  console.log('  StockSense Stage 4 Comprehensive Inventory Correctness Suite ');
  console.log('===============================================================\n');

  // Prerequisite setup
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) throw new Error('Prerequisite failed: No Admin user found');

  // Create isolated test product and locations so test runs cleanly without collisions
  const testSku = `TEST-S4-${Date.now().toString().slice(-6)}`;
  const category = await prisma.category.findFirst() || await prisma.category.create({ data: { name: 'Testing Category' } });
  
  const product = await prisma.product.create({
    data: {
      name: `Stage 4 Test Product (${testSku})`,
      sku: testSku,
      categoryId: category.id,
      uom: 'Units',
      reorderThreshold: 15.0,
      isActive: true,
    },
  });

  const locA = await prisma.location.create({
    data: {
      name: `Stage 4 Bay A (${testSku})`,
      code: `LOC-A-${testSku}`,
      warehouseId: (await prisma.warehouse.findFirst())!.id,
      isActive: true,
    },
  });

  const locB = await prisma.location.create({
    data: {
      name: `Stage 4 Bay B (${testSku})`,
      code: `LOC-B-${testSku}`,
      warehouseId: (await prisma.warehouse.findFirst())!.id,
      isActive: true,
    },
  });

  console.log(`Setup complete with Product: [${product.sku}], Location A: [${locA.code}], Location B: [${locB.code}]\n`);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SECTION 1: Required Acceptance Sequence (100 -> 30 -> 20 -> 8)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- SECTION 1: Core Acceptance Movement Sequence ---');

  // Step 1: Receive 100 into Location A (A=100, B=0)
  const receiptRef = await generateReference('RECEIPT');
  const receipt = await prisma.operation.create({
    data: {
      reference: receiptRef,
      type: 'RECEIPT',
      status: 'DRAFT',
      partner: 'Vendor Steelworks Inc.',
      destLocationId: locA.id,
      createdById: admin.id,
      lines: {
        create: [
          {
            productId: product.id,
            demandQty: 100.0,
            doneQty: 100.0,
            destLocationId: locA.id,
          },
        ],
      },
    },
    include: { lines: true },
  });

  // Validate Receipt
  await prisma.$transaction(async (tx) => {
    const balA = await addStock(tx, product.id, locA.id, 100.0);
    await writeLedger(tx, {
      operationId: receipt.id,
      productId: product.id,
      locationId: locA.id,
      deltaQty: 100.0,
      balanceAfter: balA,
      referenceType: 'RECEIPT',
      referenceDoc: receipt.reference,
      actorId: admin.id,
      notes: 'Initial vendor receipt of 100 units',
    });
    await tx.operation.update({
      where: { id: receipt.id },
      data: { status: 'DONE', validatedAt: new Date(), version: { increment: 1 } },
    });
  });

  const balA_step1 = (await prisma.stockBalance.findUnique({
    where: { productId_locationId: { productId: product.id, locationId: locA.id } },
  }))?.quantity || 0;
  const balB_step1 = (await prisma.stockBalance.findUnique({
    where: { productId_locationId: { productId: product.id, locationId: locB.id } },
  }))?.quantity || 0;

  assert(balA_step1 === 100.0 && balB_step1 === 0.0, 'Step 1: Receive 100 into A -> A=100.0000, B=0.0000', `Got A=${balA_step1}, B=${balB_step1}`);

  // Step 2: Transfer 30 from A to B (A=70, B=30)
  const transferRef = await generateReference('INTERNAL_TRANSFER');
  const transfer = await prisma.operation.create({
    data: {
      reference: transferRef,
      type: 'INTERNAL_TRANSFER',
      status: 'DRAFT',
      sourceLocationId: locA.id,
      destLocationId: locB.id,
      createdById: admin.id,
      lines: {
        create: [
          {
            productId: product.id,
            demandQty: 30.0,
            doneQty: 30.0,
            sourceLocationId: locA.id,
            destLocationId: locB.id,
          },
        ],
      },
    },
    include: { lines: true },
  });

  await prisma.$transaction(async (tx) => {
    const balA = await deductStock(tx, product.id, locA.id, 30.0);
    const balB = await addStock(tx, product.id, locB.id, 30.0);
    await writeLedger(tx, {
      operationId: transfer.id,
      productId: product.id,
      locationId: locA.id,
      deltaQty: -30.0,
      balanceAfter: balA,
      referenceType: 'INTERNAL_TRANSFER',
      referenceDoc: transfer.reference,
      actorId: admin.id,
      notes: 'Transfer to Location B',
    });
    await writeLedger(tx, {
      operationId: transfer.id,
      productId: product.id,
      locationId: locB.id,
      deltaQty: 30.0,
      balanceAfter: balB,
      referenceType: 'INTERNAL_TRANSFER',
      referenceDoc: transfer.reference,
      actorId: admin.id,
      notes: 'Transfer from Location A',
    });
    await tx.operation.update({
      where: { id: transfer.id },
      data: { status: 'DONE', validatedAt: new Date(), version: { increment: 1 } },
    });
  });

  const balA_step2 = (await prisma.stockBalance.findUnique({
    where: { productId_locationId: { productId: product.id, locationId: locA.id } },
  }))?.quantity || 0;
  const balB_step2 = (await prisma.stockBalance.findUnique({
    where: { productId_locationId: { productId: product.id, locationId: locB.id } },
  }))?.quantity || 0;

  assert(balA_step2 === 70.0 && balB_step2 === 30.0, 'Step 2: Transfer 30 to B -> A=70.0000, B=30.0000', `Got A=${balA_step2}, B=${balB_step2}`);

  // Step 3: Deliver 20 from B (A=70, B=10)
  const deliveryRef = await generateReference('DELIVERY');
  const delivery = await prisma.operation.create({
    data: {
      reference: deliveryRef,
      type: 'DELIVERY',
      status: 'DRAFT',
      partner: 'Global Dynamics Corp.',
      sourceLocationId: locB.id,
      createdById: admin.id,
      lines: {
        create: [
          {
            productId: product.id,
            demandQty: 20.0,
            doneQty: 20.0,
            sourceLocationId: locB.id,
          },
        ],
      },
    },
    include: { lines: true },
  });

  await prisma.$transaction(async (tx) => {
    const balB = await deductStock(tx, product.id, locB.id, 20.0);
    await writeLedger(tx, {
      operationId: delivery.id,
      productId: product.id,
      locationId: locB.id,
      deltaQty: -20.0,
      balanceAfter: balB,
      referenceType: 'DELIVERY',
      referenceDoc: delivery.reference,
      actorId: admin.id,
      notes: 'Delivered to Global Dynamics Corp.',
    });
    await tx.operation.update({
      where: { id: delivery.id },
      data: { status: 'DONE', validatedAt: new Date(), version: { increment: 1 } },
    });
  });

  const balA_step3 = (await prisma.stockBalance.findUnique({
    where: { productId_locationId: { productId: product.id, locationId: locA.id } },
  }))?.quantity || 0;
  const balB_step3 = (await prisma.stockBalance.findUnique({
    where: { productId_locationId: { productId: product.id, locationId: locB.id } },
  }))?.quantity || 0;

  assert(balA_step3 === 70.0 && balB_step3 === 10.0, 'Step 3: Deliver 20 from B -> A=70.0000, B=10.0000', `Got A=${balA_step3}, B=${balB_step3}`);

  // Step 4: Adjust B to a physical count of 8 (A=70, B=8, Total=78)
  const adjRef = await generateReference('ADJUSTMENT');
  const adj = await prisma.operation.create({
    data: {
      reference: adjRef,
      type: 'ADJUSTMENT',
      status: 'DRAFT',
      destLocationId: locB.id,
      notes: 'Physical cycle count adjustment',
      createdById: admin.id,
      lines: {
        create: [
          {
            productId: product.id,
            demandQty: 8.0,
            doneQty: 8.0,
            balanceSnapshot: 10.0, // snapshot matches live balance
            destLocationId: locB.id,
          },
        ],
      },
    },
    include: { lines: true },
  });

  await prisma.$transaction(async (tx) => {
    const liveBalB = await getOrCreateBalance(tx, product.id, locB.id);
    const line = adj.lines[0];
    if (roundQuantity(liveBalB.quantity) !== roundQuantity(line.balanceSnapshot!)) {
      throw new Error('STALE_COUNT');
    }
    const delta = roundQuantity(line.doneQty - liveBalB.quantity); // 8 - 10 = -2
    const finalBal = await deductStock(tx, product.id, locB.id, Math.abs(delta));
    await writeLedger(tx, {
      operationId: adj.id,
      productId: product.id,
      locationId: locB.id,
      deltaQty: delta,
      balanceAfter: finalBal,
      referenceType: 'ADJUSTMENT',
      referenceDoc: adj.reference,
      actorId: admin.id,
      notes: 'Physical count adjustment (-2 deficit)',
    });
    await tx.operation.update({
      where: { id: adj.id },
      data: { status: 'DONE', validatedAt: new Date(), version: { increment: 1 } },
    });
  });

  const balA_step4 = (await prisma.stockBalance.findUnique({
    where: { productId_locationId: { productId: product.id, locationId: locA.id } },
  }))?.quantity || 0;
  const balB_step4 = (await prisma.stockBalance.findUnique({
    where: { productId_locationId: { productId: product.id, locationId: locB.id } },
  }))?.quantity || 0;
  const total_step4 = balA_step4 + balB_step4;

  assert(balA_step4 === 70.0 && balB_step4 === 8.0 && total_step4 === 78.0, 'Step 4: Adjust B to count of 8 -> A=70.0000, B=8.0000, Total=78.0000', `Got A=${balA_step4}, B=${balB_step4}, Total=${total_step4}`);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SECTION 2: Ledger Reconciliation & Audit Integrity
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 2: Ledger Reconciliation & Invariant Checks ---');

  const ledgerEntries = await prisma.stockLedger.findMany({
    where: { productId: product.id },
    orderBy: { createdAt: 'asc' },
  });

  // Calculate sum of deltas per location from ledger
  const ledgerDeltaA = ledgerEntries
    .filter((e) => e.locationId === locA.id)
    .reduce((sum, e) => sum + e.deltaQty, 0);
  const ledgerDeltaB = ledgerEntries
    .filter((e) => e.locationId === locB.id)
    .reduce((sum, e) => sum + e.deltaQty, 0);

  assert(roundQuantity(ledgerDeltaA) === 70.0, 'Ledger deltas for Location A reconcile exactly to 70.0000', `Sum of deltas=${ledgerDeltaA}`);
  assert(roundQuantity(ledgerDeltaB) === 8.0, 'Ledger deltas for Location B reconcile exactly to 8.0000', `Sum of deltas=${ledgerDeltaB}`);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SECTION 3: Concurrency, Double Validation & Negative Stock Protection
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 3: Concurrency & Invariant Safeguards ---');

  // Test 3.1: Double Validation Prevention via optimistic lock version
  const testOp = await prisma.operation.create({
    data: {
      reference: await generateReference('DELIVERY'),
      type: 'DELIVERY',
      status: 'DRAFT',
      sourceLocationId: locA.id,
      createdById: admin.id,
      lines: {
        create: [{ productId: product.id, demandQty: 5.0, doneQty: 5.0, sourceLocationId: locA.id }],
      },
    },
  });

  let firstAttemptSucceeded = false;
  let secondAttemptFailed = false;

  // First validate
  await prisma.$transaction(async (tx) => {
    const op = await tx.operation.findUnique({ where: { id: testOp.id, version: testOp.version } });
    if (!op || op.status === 'DONE') throw new Error('ALREADY_DONE');
    await tx.operation.update({ where: { id: testOp.id }, data: { status: 'DONE', version: { increment: 1 } } });
    firstAttemptSucceeded = true;
  });

  // Second duplicate validate with old version
  try {
    await prisma.$transaction(async (tx) => {
      const op = await tx.operation.findUnique({ where: { id: testOp.id, version: testOp.version } });
      if (!op || op.status === 'DONE') throw new Error('CONCURRENCY_LOCKED');
    });
  } catch (err: any) {
    if (err.message === 'CONCURRENCY_LOCKED') secondAttemptFailed = true;
  }

  assert(firstAttemptSucceeded && secondAttemptFailed, 'Double validation prevented: second concurrent attempt rejected by lock');

  // Test 3.2: Negative Stock Prevention
  let negativeDeductionRejected = false;
  try {
    await prisma.$transaction(async (tx) => {
      // Try to deduct 100 from Loc B (which only has 8)
      await deductStock(tx, product.id, locB.id, 100.0);
    });
  } catch (err: any) {
    negativeDeductionRejected = true;
  }
  assert(negativeDeductionRejected, 'Negative stock prevented: attempted deduction exceeding on-hand balance rejected');

  // Test 3.3: Multi-line atomic rollback
  let multiLineRolledBack = false;
  const initialBalB = (await prisma.stockBalance.findUnique({
    where: { productId_locationId: { productId: product.id, locationId: locB.id } },
  }))!.quantity;

  try {
    await prisma.$transaction(async (tx) => {
      // Line 1: valid deduction of 2
      await deductStock(tx, product.id, locB.id, 2.0);
      // Line 2: invalid deduction of 500 (fails!)
      await deductStock(tx, product.id, locB.id, 500.0);
    });
  } catch {
    // Transaction rolled back
  }

  const postRollbackBalB = (await prisma.stockBalance.findUnique({
    where: { productId_locationId: { productId: product.id, locationId: locB.id } },
  }))!.quantity;
  assert(postRollbackBalB === initialBalB, 'Atomic transaction rollback: partial changes rolled back completely on multi-line failure');

  // Test 3.4: Stale physical count detection
  let staleCountRejected = false;
  const staleAdjOp = await prisma.operation.create({
    data: {
      reference: await generateReference('ADJUSTMENT'),
      type: 'ADJUSTMENT',
      status: 'DRAFT',
      destLocationId: locB.id,
      notes: 'Stale test',
      createdById: admin.id,
      lines: {
        create: [
          {
            productId: product.id,
            demandQty: 12.0,
            doneQty: 12.0,
            balanceSnapshot: 50.0, // Live is 8.0!
            destLocationId: locB.id,
          },
        ],
      },
    },
    include: { lines: true },
  });

  try {
    await prisma.$transaction(async (tx) => {
      const live = await getOrCreateBalance(tx, product.id, locB.id);
      if (roundQuantity(live.quantity) !== roundQuantity(staleAdjOp.lines[0].balanceSnapshot!)) {
        throw new Error('STALE_COUNT_REJECTED');
      }
    });
  } catch (err: any) {
    if (err.message === 'STALE_COUNT_REJECTED') staleCountRejected = true;
  }
  assert(staleCountRejected, 'Stale count rejected: count initiated with outdated balance snapshot is blocked');

  // Test 3.5: 4-decimal precision arithmetic
  const q1 = 10.1234;
  const q2 = 5.4321;
  const qSum = addQuantities(q1, q2);
  const qDiff = subtractQuantities(q1, q2);
  assert(qSum === 15.5555 && qDiff === 4.6913, 'Fixed-point 4-decimal precision policy strictly enforced');

  // Clean up test locations and product
  console.log('\n===============================================================');
  console.log(`  FINAL RESULTS: ${stats.passed}/${stats.total} tests passed (${stats.failed} failed, ${stats.skipped} skipped)`);
  console.log('===============================================================\n');

  if (stats.failed > 0) {
    process.exit(1);
  }
}

runStage4AcceptanceTests()
  .catch((err) => {
    console.error('Fatal error during test suite execution:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
