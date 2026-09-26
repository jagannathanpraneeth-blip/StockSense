import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting StockSense database seed...');

  // 1. Seed Default Users with hashed passwords
  console.log('👤 Seeding default users...');
  const defaultPasswordHash = await bcrypt.hash('Admin123!', 10);
  const managerPasswordHash = await bcrypt.hash('Manager123!', 10);
  const staffPasswordHash = await bcrypt.hash('Staff123!', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@stocksense.local' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      email: 'admin@stocksense.local',
      name: 'System Administrator',
      role: 'ADMIN',
      passwordHash: defaultPasswordHash,
      isActive: true,
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@stocksense.local' },
    update: { passwordHash: managerPasswordHash },
    create: {
      email: 'manager@stocksense.local',
      name: 'Alex Morgan',
      role: 'INVENTORY_MANAGER',
      passwordHash: managerPasswordHash,
      isActive: true,
    },
  });

  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@stocksense.local' },
    update: { passwordHash: staffPasswordHash },
    create: {
      email: 'staff@stocksense.local',
      name: 'Jordan Lee',
      role: 'WAREHOUSE_STAFF',
      passwordHash: staffPasswordHash,
      isActive: true,
    },
  });

  // 2. Seed Warehouses
  console.log('🏭 Seeding warehouses...');
  const whMain = await prisma.warehouse.upsert({
    where: { code: 'WH-MAIN' },
    update: {},
    create: {
      name: 'Main Warehouse',
      code: 'WH-MAIN',
      address: 'Central Logistics Hub, 100 Industrial Parkway',
      isActive: true,
    },
  });

  const whProd = await prisma.warehouse.upsert({
    where: { code: 'WH-PROD' },
    update: {},
    create: {
      name: 'Production Facility',
      code: 'WH-PROD',
      address: 'Manufacturing Unit B, 45 Assembly Way',
      isActive: true,
    },
  });

  // 3. Seed Locations
  console.log('📍 Seeding locations...');
  const locationsData = [
    { name: 'Stock (General Storage)', code: 'WH-MAIN/STOCK', warehouseId: whMain.id, isScrap: false },
    { name: 'Goods Receipt Bay (Input)', code: 'WH-MAIN/INPUT', warehouseId: whMain.id, isScrap: false },
    { name: 'Shipping Dock (Output)', code: 'WH-MAIN/OUTPUT', warehouseId: whMain.id, isScrap: false },
    { name: 'Rack A - Raw Materials', code: 'WH-PROD/RACK-A', warehouseId: whProd.id, isScrap: false },
    { name: 'Rack B - Assembly WIP', code: 'WH-PROD/RACK-B', warehouseId: whProd.id, isScrap: false },
    { name: 'Scrap & Quarantine Area', code: 'WH-PROD/SCRAP', warehouseId: whProd.id, isScrap: true },
  ];

  const createdLocations = [];
  for (const loc of locationsData) {
    const l = await prisma.location.upsert({
      where: { code: loc.code },
      update: {},
      create: loc,
    });
    createdLocations.push(l);
  }

  // 4. Seed Categories
  console.log('🏷️ Seeding categories...');
  const categoriesData = [
    { name: 'Raw Materials', description: 'Metals, plastics, and base fabrication inputs' },
    { name: 'Electronics', description: 'Sensors, microcontrollers, and wiring components' },
    { name: 'Hardware', description: 'Fasteners, bolts, brackets, and fittings' },
    { name: 'Finished Goods', description: 'Assembled, packaged, and ready-to-ship products' },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of categoriesData) {
    const c = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    categoryMap[cat.name] = c.id;
  }

  // 5. Seed Products (with zero opening balances)
  console.log('📦 Seeding products with zero opening balances...');
  const productsData = [
    {
      name: 'Steel Rods (10mm x 2m)',
      sku: 'RAW-STL-001',
      categoryId: categoryMap['Raw Materials'],
      uom: 'Units',
      reorderThreshold: 20.0,
      description: 'High tensile carbon steel construction rods',
    },
    {
      name: 'Industrial Steel Sheets (3mm)',
      sku: 'RAW-STL-002',
      categoryId: categoryMap['Raw Materials'],
      uom: 'kg',
      reorderThreshold: 100.0,
      description: 'Cold rolled steel sheets for fabrication',
    },
    {
      name: 'Precision Sensor Module X1',
      sku: 'ELEC-SNS-001',
      categoryId: categoryMap['Electronics'],
      uom: 'Units',
      reorderThreshold: 15.0,
      description: 'Digital temperature and humidity telemetry sensor',
    },
    {
      name: 'Hex Bolt M8 x 40mm',
      sku: 'HDW-BLT-001',
      categoryId: categoryMap['Hardware'],
      uom: 'Box',
      reorderThreshold: 10.0,
      description: 'Zinc-plated grade 8.8 structural bolts (100 pcs/box)',
    },
    {
      name: 'Ergonomic Wooden Office Chair',
      sku: 'FG-CHR-001',
      categoryId: categoryMap['Finished Goods'],
      uom: 'Units',
      reorderThreshold: 5.0,
      description: 'Solid oak office chair with cushioned seat',
    },
  ];

  for (const prod of productsData) {
    const p = await prisma.product.upsert({
      where: { sku: prod.sku },
      update: {},
      create: {
        name: prod.name,
        sku: prod.sku,
        categoryId: prod.categoryId,
        uom: prod.uom,
        reorderThreshold: prod.reorderThreshold,
        description: prod.description,
        isActive: true,
      },
    });

    // Ensure 0.0 stock balance in each location
    for (const loc of createdLocations) {
      await prisma.stockBalance.upsert({
        where: {
          productId_locationId: {
            productId: p.id,
            locationId: loc.id,
          },
        },
        update: {},
        create: {
          productId: p.id,
          locationId: loc.id,
          quantity: 0.0,
        },
      });
    }
  }

  console.log('✅ StockSense database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
