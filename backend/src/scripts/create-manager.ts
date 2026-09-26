import '../config/env';
import bcrypt from 'bcryptjs';
import prisma from '../db/client';
async function main() {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const name = process.env.INITIAL_ADMIN_NAME || 'Inventory Manager';
  if (!email || !email.includes('@') || !password || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) throw new Error('Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD (12+ characters, at most 72 UTF-8 bytes) in the environment');
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (['ADMIN', 'INVENTORY_MANAGER'].includes(existing.role)) { console.log('Manager already exists; password unchanged.'); return; }
    throw new Error('Email belongs to an existing staff user; choose another email. No role was changed.');
  }
  await prisma.user.create({ data: { email, name, passwordHash: await bcrypt.hash(password, 12), role: 'INVENTORY_MANAGER' } });
  console.log('Initial manager created.');
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
