import { db } from '../src/lib/server/drizzle.js';
import { crmCompanies, crmContacts, crmDeals, crmActivities, crmTasks, unitBisnis } from '../src/lib/server/schema.js';

async function main() {
  try {
    // Find any unit (first one) to attach CRM data to
    const unit = await db.query.unitBisnis.findFirst();
    if (!unit) {
      console.error('No unit found in unit_bisnis table. Create a unit first.');
      process.exit(1);
    }

    const ownerId = unit.userId || 1;

    // Insert a company
    const [companyRes] = await db.insert(crmCompanies).values({
      ownerId,
      unitId: unit.id,
      nama: 'Acme Sample Co',
      alamat: 'Jl. Contoh No.1',
      industri: 'Retail',
      tags: 'sample,seed'
    }).returning();

    const companyId = companyRes?.insertId || companyRes?.id || null;

    // Insert a contact
    const [contactRes] = await db.insert(crmContacts).values({
      ownerId,
      unitId: unit.id,
      nama: 'Budi Customer',
      telepon: '+62811234567',
      email: 'budi@example.com',
      perusahaan: 'Acme Sample Co',
      companyId: companyId
    }).returning();

    const contactId = contactRes?.insertId || contactRes?.id || null;

    // Insert a deal
    const [dealRes] = await db.insert(crmDeals).values({
      ownerId,
      unitId: unit.id,
      kontakId: contactId,
      companyId: companyId,
      namaDeal: 'Seed Deal 100k',
      nilai: '100000.00',
      stage: 'prospek'
    }).returning();

    const dealId = dealRes?.insertId || dealRes?.id || null;

    // Insert an activity
    await db.insert(crmActivities).values({
      ownerId,
      unitId: unit.id,
      kontakId: contactId,
      tipe: 'Call',
      catatan: 'Seed call: follow up sample lead'
    });

    // Insert a task
    await db.insert(crmTasks).values({
      ownerId,
      unitId: unit.id,
      kontakId: contactId,
      dealId: dealId,
      deskripsi: 'Follow up Budi for sample deal',
      status: 'pending'
    });

    console.log('Seed CRM data inserted for unit:', unit.slug || unit.id);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

main();
