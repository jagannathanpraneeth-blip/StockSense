const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const migration = '20260926090000_complete_stage4';
const run = args => execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), ...args], { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' });
async function main() {
  const tables = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table'`);
  if (tables.some(t => t.name === 'User')) {
    if (!tables.some(t => t.name === '_prisma_migrations')) throw new Error('Existing database has no migration history. Back it up and obtain manual migration assistance; no data was changed.');
    const migrations = await prisma.$queryRawUnsafe(`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`);
    const known = new Set(migrations.map(m => m.migration_name));
    if (!known.has(migration)) {
      if (!known.has('20260926053857_add_otp_and_operation_v2')) throw new Error('Apply the original Stage 2 migration first. No data was changed.');
      const changes = [['User','passwordChangedAt','DATETIME'], ['OperationLine','balanceSnapshot','REAL'], ['StockBalance','version','INTEGER NOT NULL DEFAULT 0'], ['OperationLine','balanceVersionSnapshot','INTEGER']];
      // These are fixed schema identifiers, never user input. Preserve existing columns.
      await prisma.$transaction(async tx => {
        for (const [table, column, type] of changes) {
          const columns = await tx.$queryRawUnsafe(`PRAGMA table_info("${table}")`);
          if (!columns.some(c => c.name === column)) await tx.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${type}`);
        }
      });
      await prisma.$disconnect();
      run(['migrate', 'resolve', '--applied', migration]);
    }
  }
  await prisma.$disconnect();
  run(['migrate', 'deploy']);
  run(['generate']);
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
