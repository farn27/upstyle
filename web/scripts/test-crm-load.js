import { db } from '../src/lib/server/drizzle.js';
import { unitBisnis } from '../src/lib/server/schema.js';

async function main() {
  const slug = 'italian-charm-bracelet';
  const userId = 9;
  const unit = await db.query.unitBisnis.findFirst({
    where: (table) => table.slug.eq(slug).and(table.userId.eq(userId))
  });
  console.log('unit', unit);
  if (!unit) {
    console.log('Unit not found');
    process.exit(0);
  }

  const contacts = await db.query.crmContacts.findMany({
    where: (table) => table.unitId.eq(unit.id).and(table.ownerId.eq(userId))
  });
  console.log('contacts', contacts);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });