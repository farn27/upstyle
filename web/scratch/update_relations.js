import fs from 'fs';
import path from 'path';

const file = 'e:/upstyle/web/src/lib/server/relations.ts';
let content = fs.readFileSync(file, 'utf8');

// 1. Add missing imports
const importRegex = /import \{([^}]+)\} from "\.\/schema";/;
const match = content.match(importRegex);

if (match) {
    const existingImports = match[1];
    const newImports = 'chartOfAccounts, journalEntries, journalEntryLines, accountingContacts, receivables, payables, fixedAssets, taxRates, budgetItems, closingPeriods';
    const updatedImports = existingImports + ', ' + newImports;
    content = content.replace(importRegex, `import { ${updatedImports} } from "./schema";`);
}

// 2. Append relations
const appendCode = `
// ═══════════════════════════════════════════════════
// ACCOUNTING / AKUNTANSI RELATIONS
// ═══════════════════════════════════════════════════

export const chartOfAccountsRelations = relations(chartOfAccounts, ({ one, many }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [chartOfAccounts.unitId],
		references: [unitBisnis.id],
	}),
	journalLines: many(journalEntryLines),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [journalEntries.unitId],
		references: [unitBisnis.id],
	}),
	user: one(users, {
		fields: [journalEntries.userId],
		references: [users.id],
	}),
	lines: many(journalEntryLines),
}));

export const journalEntryLinesRelations = relations(journalEntryLines, ({ one }) => ({
	journal: one(journalEntries, {
		fields: [journalEntryLines.journalId],
		references: [journalEntries.id],
	}),
	account: one(chartOfAccounts, {
		fields: [journalEntryLines.coaId],
		references: [chartOfAccounts.id],
	}),
}));

export const receivablesRelations = relations(receivables, ({ one }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [receivables.unitId],
		references: [unitBisnis.id],
	}),
	contact: one(accountingContacts, {
		fields: [receivables.contactId],
		references: [accountingContacts.id],
	}),
}));

export const payablesRelations = relations(payables, ({ one }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [payables.unitId],
		references: [unitBisnis.id],
	}),
	contact: one(accountingContacts, {
		fields: [payables.contactId],
		references: [accountingContacts.id],
	}),
}));

export const fixedAssetsRelations = relations(fixedAssets, ({ one }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [fixedAssets.unitId],
		references: [unitBisnis.id],
	}),
}));

export const accountingContactsRelations = relations(accountingContacts, ({ one, many }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [accountingContacts.unitId],
		references: [unitBisnis.id],
	}),
	receivables: many(receivables),
	payables: many(payables),
}));
`;

content += appendCode;
fs.writeFileSync(file, content, 'utf8');
console.log('Relations successfully added to relations.ts');
