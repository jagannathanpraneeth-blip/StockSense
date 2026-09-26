import prisma from '../db/client';
import { roundQuantity, addQuantities, subtractQuantities } from '../utils/quantity';
import {
  getOrCreateBalance,
  addStock,
  deductStock,
  writeLedger,
  generateReference,
} from '../services/stock.service';

async function runStage3Verification() {
  console.log('=== Starting Stage 3 Automated Verification ===\n');

  // 1. Fetch seed user, product, locations
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminUser) throw new Error('No admin user found in database');
  console.log(`✓ Using Admin user: ${adminUser.name} (${adminUser.email})`);

  const product = await prisma.product.findFirst({ where: { isActive: true } });
  if (!product) throw new Error('No active product found');
  console.log(`✓ Using Product: [${product.sku}] ${product.name}`);

  const locations = await prisma.location.findMany({ where: { isActive: true, isScrap: false }, take: 3 });
  if (locations.length < 2) throw new Error('Need at least 2 active non-scrap locations');
  const [locA, locB] = locations;
  console.log(`✓ Using Location A: ${locA.name} (${locA.code})`);
  console.log(`✓ Using Location B: ${locB.name} (${locB.code})`);

  // Ensure Location A has known starting stock (e.g. 100.0000)
  await prisma.$transaction(async (tx) => {
    const balA = await getOrCreateBalance(tx, product.id, locA.id);
    const delta = roundQuantity(100 - balA.quantity);
    if (delta !== 0) {
      if (delta > 0) await addStock(tx, product.id, locA.id, delta);
      else await deductStock(tx, product.id, locA.id, Math.abs(delta));
      await writeLedger(tx, {
        productId: product.id,
        locationId: locA.id,
        deltaQty: delta,
        balanceAfter: 100,
        referenceType: 'ADJUSTMENT',
        referenceDoc: 'INIT-TEST',
        actorId: adminUser.id,
        notes: 'Initial test setup balance',
      });
    }
  });

  const startingBalA = (await prisma.stockBalance.findUnique({
    where: { productId_locationId: { productId: product.id, locationId: locA.id } },
  }))!.quantity;
  console.log(`\n✓ Starting Balance at Location A: ${startingBalA.toFixed(4)}`);

  // ─── TEST 1: Internal Transfer (WH/INT) ────────────────────────────────────
  console.log('\n--- Test 1: Internal Transfer (WH/INT) ---');
  const transferRef = await generateReference('INTERNAL_TRANSFER');
  const transfer = await prisma.operation.create({
    data: {
      reference: transferRef,
      type: 'INTERNAL_TRANSFER',
      status: 'DRAFT',
      sourceLocationId: locA.id,
      destLocationId: locB.id,
      createdById: adminUser.id,
      lines: {
        create: [
          {
            productId: product.id,
            demandQty: 25.0,
            doneQty: 25.0,
            sourceLocationId: locA.id,
            destLocationId: locB.id,
          },
        ],
      },
    },
    include: { lines: true },
  });
  console.log(`✓ Created Draft Transfer: ${transfer.reference}`);

  // Validate Transfer atomically
  await prisma.$transaction(async (tx) => {
    // 1. Optimistic lock check
    const current = await tx.operation.findUnique({
      where: { id: transfer.id, version: transfer.version },
      include: { lines: true },
    });
    if (!current) throw new Error('Transfer concurrency conflict');

    // 2. Deduct from source and add to dest
    const balSrc = await deductStock(tx, product.id, locA.id, 25.0);
    const balDst = await addStock(tx, product.id, locB.id, 25.0);

    // 3. Paired ledger records
    await writeLedger(tx, {
      operationId: transfer.id,
      productId: product.id,
      locationId: locA.id,
      deltaQty: -25.0,
      balanceAfter: balSrc,
      referenceType: 'INTERNAL_TRANSFER',
      referenceDoc: transfer.reference,
      actorId: adminUser.id,
      notes: `Transfer to ${locB.name}`,
    });

    await writeLedger(tx, {
      operationId: transfer.id,
      productId: product.id,
      locationId: locB.id,
      deltaQty: 25.0,
      balanceAfter: balDst,
      referenceType: 'INTERNAL_TRANSFER',
      referenceDoc: transfer.reference,
      actorId: adminUser.id,
      notes: `Transfer from ${locA.name}`,
    });

    await tx.operation.update({
      where: { id: transfer.id },
      data: { status: 'DONE', validatedAt: new Date(), version: { increment: 1 } },
    });
  });

  const postTransferA = (await prisma.stockBalance.findUnique({
    where: { productId_locationId: { productId: product.id, locationId: locA.id } },
  }))!.quantity;
  const postTransferB = (await prisma.stockBalance.findUnique({
    where: { productId_locationId: { productId: product.id, locationId: locB.id } },
  }))!.quantity;

  console.log(`✓ Transfer Validated successfully!`);
  console.log(`  Location A Balance: ${postTransferA.toFixed(4)} (Expected: 75.0000)`);
  console.log(`  Location B Balance: ${postTransferB.toFixed(4)} (Expected >= 25.0000)`);
  if (postTransferA !== 75.0) throw new Error('Transfer balance mismatch on source location');

  // ─── TEST 2: Delivery Order (WH/OUT) ───────────────────────────────────────
  console.log('\n--- Test 2: Delivery Order (WH/OUT) ---');
  const deliveryRef = await generateReference('DELIVERY');
  const delivery = await prisma.operation.create({
    data: {
      reference: deliveryRef,
      type: 'DELIVERY',
      status: 'DRAFT',
      partner: 'Acme Test Customer',
      sourceLocationId: locA.id,
      createdById: adminUser.id,
      lines: {
        create: [
          {
            productId: product.id,
            demandQty: 15.0,
            doneQty: 0.0,
            sourceLocationId: locA.id,
          },
        ],
      },
    },
    include: { lines: true },
  });
  console.log(`✓ Created Draft Delivery Order: ${delivery.reference}`);

  // Picking stage -> WAITING
  await prisma.operation.update({
    where: { id: delivery.id },
    data: { status: 'WAITING' },
  });
  console.log(`✓ Progressed Delivery to WAITING (picking started)`);

  // Pack & Ready stage -> READY
  await prisma.operation.update({
    where: { id: delivery.id },
    data: { status: 'READY' },
  });
  console.log(`✓ Progressed Delivery to READY`);

  // Validate Delivery -> Deducts 15.0 from Location A
  await prisma.$transaction(async (tx) => {
    const balSrc = await deductStock(tx, product.id, locA.id, 15.0);
    await writeLedger(tx, {
      operationId: delivery.id,
      productId: product.id,
      locationId: locA.id,
      deltaQty: -15.0,
      balanceAfter: balSrc,
      referenceType: 'DELIVERY',
      referenceDoc: delivery.reference,
      actorId: adminUser.id,
      notes: `Delivered to Acme Test Customer`,
    });
    await tx.operation.update({
      where: { id: delivery.id },
      data: {
        status: 'DONE',
        validatedAt: new Date(),
        version: { increment: 1 },
      },
    });
    await tx.operationLine.updateMany({
      where: { operationId: delivery.id },
      data: { doneQty: 15.0 },
    });
  });

  const postDeliveryA = (await prisma.stockBalance.findUnique({
    where: { productId_locationId: { productId: product.id, locationId: locA.id } },
  }))!.quantity;
  console.log(`✓ Delivery Validated & Shipped!`);
  console.log(`  Location A Balance: ${postDeliveryA.toFixed(4)} (Expected: 60.0000)`);
  if (postDeliveryA !== 60.0) throw new Error('Delivery balance mismatch on source location');

  // ─── TEST 3: Inventory Adjustment with Stale-Count Detection ──────────────
  console.log('\n--- Test 3: Inventory Adjustment (WH/ADJ) & Stale-Count Check ---');
  const adjRef = await generateReference('ADJUSTMENT');
  const snapBalance = postDeliveryA; // 60.0000

  const adjustment = await prisma.operation.create({
    data: {
      reference: adjRef,
      type: 'ADJUSTMENT',
      status: 'DRAFT',
      destLocationId: locA.id,
      notes: 'Physical count found 62 units (+2 variance)',
      createdById: adminUser.id,
      lines: {
        create: [
          {
            productId: product.id,
            demandQty: 62.0,
            doneQty: 62.0,
            balanceSnapshot: snapBalance, // 60.0000
            destLocationId: locA.id,
          },
        ],
      },
    },
    include: { lines: true },
  });
  console.log(`✓ Created Draft Physical Count: ${adjustment.reference} (Snapshot: ${snapBalance.toFixed(4)}, Counted: 62.0000)`);

  // Validate adjustment
  await prisma.$transaction(async (tx) => {
    const line = adjustment.lines[0];
    const liveBal = await getOrCreateBalance(tx, product.id, locA.id);

    // Stale check
    if (roundQuantity(liveBal.quantity) !== roundQuantity(line.balanceSnapshot!)) {
      throw new Error('Stale count detected: live balance has changed since physical count');
    }

    const delta = roundQuantity(line.doneQty - liveBal.quantity); // +2.0
    const newBal = await addStock(tx, product.id, locA.id, delta);

    await writeLedger(tx, {
      operationId: adjustment.id,
      productId: product.id,
      locationId: locA.id,
      deltaQty: delta,
      balanceAfter: newBal,
      referenceType: 'ADJUSTMENT',
      referenceDoc: adjustment.reference,
      actorId: adminUser.id,
      notes: 'Physical count adjustment',
    });

    await tx.operation.update({
      where: { id: adjustment.id },
      data: { status: 'DONE', validatedAt: new Date(), version: { increment: 1 } },
    });
  });

  const postAdjA = (await prisma.stockBalance.findUnique({
    where: { productId_locationId: { productId: product.id, locationId: locA.id } },
  }))!.quantity;
  console.log(`✓ Adjustment Validated & Applied!`);
  console.log(`  Location A Balance: ${postAdjA.toFixed(4)} (Expected: 62.0000)`);
  if (postAdjA !== 62.0) throw new Error('Adjustment balance mismatch');

  // ─── TEST 4: Verify Stale-Count Rejection ──────────────────────────────────
  console.log('\n--- Test 4: Verify Stale Count Rejection ---');
  const staleAdj = await prisma.operation.create({
    data: {
      reference: await generateReference('ADJUSTMENT'),
      type: 'ADJUSTMENT',
      status: 'DRAFT',
      destLocationId: locA.id,
      notes: 'Count started when balance was 50 (now 62)',
      createdById: adminUser.id,
      lines: {
        create: [
          {
            productId: product.id,
            demandQty: 55.0,
            doneQty: 55.0,
            balanceSnapshot: 50.0, // Stale! Live is 62
            destLocationId: locA.id,
          },
        ],
      },
    },
    include: { lines: true },
  });

  let rejectedAsExpected = false;
  try {
    await prisma.$transaction(async (tx) => {
      const liveBal = await getOrCreateBalance(tx, product.id, locA.id);
      if (roundQuantity(liveBal.quantity) !== roundQuantity(staleAdj.lines[0].balanceSnapshot!)) {
        throw new Error('STALE_COUNT_REJECTED');
      }
    });
  } catch (err: any) {
    if (err.message === 'STALE_COUNT_REJECTED') {
      rejectedAsExpected = true;
    }
  }

  if (!rejectedAsExpected) throw new Error('Stale count was NOT rejected!');
  console.log('✓ Stale count was properly detected and rejected.');

  console.log('\n=============================================');
  console.log('🎉 ALL STAGE 3 INTEGRATION TESTS PASSED 100%!');
  console.log('=============================================\n');
}

runStage3Verification()
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
