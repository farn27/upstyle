const fs = require('fs');
const file = 'e:/upstyle/web/src/routes/(app)/finance/[slug]/hr/+page.server.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("import { pool } from '$lib/server/db';", "import { db } from '$lib/server/drizzle';\nimport * as schema from '$lib/server/schema';\nimport { eq, and, desc, sql, asc, inArray } from 'drizzle-orm';");

content = content.replace(/const \[units\] = await pool\.query\([\s\S]*?\);/, `const units = await db.select().from(schema.unitBisnis).where(and(eq(schema.unitBisnis.slug, params.slug), eq(schema.unitBisnis.userId, userId)));`);

content = content.replace(/const \[employees\] = await pool\.query\([\s\S]*?\);/, `const employees = await db.select().from(schema.employees).where(eq(schema.employees.companyId, unit.id)).orderBy(desc(schema.employees.id));`);

content = content.replace(/const \[attendanceRows\] = await pool\.query\([\s\S]*?\);/, `const attendanceRows = await db.select({ cnt: sql\`COUNT(*)\` }).from(schema.attendance).innerJoin(schema.employees, eq(schema.employees.id, schema.attendance.employeeId)).where(eq(schema.employees.companyId, unit.id));`);

content = content.replace(/const \[pendingRequests\] = await pool\.query\([\s\S]*?\);/, `const pendingRequests = await db.select({\n        ...schema.leaveRequests,\n        full_name: schema.employees.fullName\n    }).from(schema.leaveRequests).innerJoin(schema.employees, eq(schema.employees.id, schema.leaveRequests.employeeId)).where(and(eq(schema.employees.companyId, unit.id), eq(schema.leaveRequests.status, 'pending'))).orderBy(desc(schema.leaveRequests.id)).limit(6);`);

content = content.replace(/const \[leaveSummaryRows\] = await pool\.query\([\s\S]*?\);/, `const leaveSummaryRows = await db.select({\n        type: sql\`COALESCE(\${schema.leaveRequests.type}, 'leave')\`,\n        cnt: sql\`COUNT(*)\`\n    }).from(schema.leaveRequests).innerJoin(schema.employees, eq(schema.employees.id, schema.leaveRequests.employeeId)).where(eq(schema.employees.companyId, unit.id)).groupBy(schema.leaveRequests.type);`);

content = content.replace(/const \[lifecycleRows\] = await pool\.query\([\s\S]*?\);/, `const lifecycleRows = await db.select({\n        status: sql\`COALESCE(\${schema.employees.status}, 'active')\`,\n        cnt: sql\`COUNT(*)\`\n    }).from(schema.employees).where(eq(schema.employees.companyId, unit.id)).groupBy(schema.employees.status);`);

content = content.replace(/const \[contractExpiringRows\] = await pool\.query\([\s\S]*?\);/, `const contractExpiringRows = await db.select({\n        id: schema.employees.id,\n        full_name: schema.employees.fullName,\n        position: schema.employees.position,\n        contract_end: schema.employees.contractEnd\n    }).from(schema.employees).where(and(eq(schema.employees.companyId, unit.id), sql\`NULLIF(CAST(\${schema.employees.contractEnd} AS CHAR), '') IS NOT NULL\`)).orderBy(asc(schema.employees.contractEnd)).limit(6);`);

content = content.replace(/const \[payrollRows\] = await pool\.query\([\s\S]*?\);/, `const payrollRows = await db.select({\n        ...schema.payrolls,\n        full_name: schema.employees.fullName\n    }).from(schema.payrolls).innerJoin(schema.employees, eq(schema.employees.id, schema.payrolls.employeeId)).where(and(eq(schema.employees.companyId, unit.id), eq(schema.payrolls.periodMonth, currentMonth), eq(schema.payrolls.periodYear, currentYear))).orderBy(desc(schema.payrolls.id)).limit(8);`);

content = content.replace(/const \[kpiRows\] = await pool\.query\([\s\S]*?\);/, `const kpiRows = await db.select({\n        avg_score: sql\`AVG(CAST(\${schema.employeeKpi.score} AS DECIMAL(10,2)))\`\n    }).from(schema.employeeKpi).innerJoin(schema.employees, eq(schema.employees.id, schema.employeeKpi.employeeId)).where(eq(schema.employees.companyId, unit.id));`);

content = content.replace(/const \[shiftRows\] = await pool\.query\([\s\S]*?\);/, `const shiftRows = await db.select().from(schema.shifts).where(eq(schema.shifts.companyId, unit.id)).orderBy(desc(schema.shifts.id)).limit(4);`);

content = content.replace(/const \[activityRows\] = await pool\.query\([\s\S]*?\);/, `const activityRows = await db.select({\n        pesan: sql\`COALESCE(\${schema.riwayatAksi.pesan}, 'Aktivitas HR terbaru')\`,\n        kategori: sql\`COALESCE(\${schema.riwayatAksi.kategori}, 'HR')\`,\n        tipe: sql\`COALESCE(\${schema.riwayatAksi.tipe}, 'info')\`,\n        waktu: schema.riwayatAksi.waktu\n    }).from(schema.riwayatAksi).where(eq(schema.riwayatAksi.unitId, unit.id)).orderBy(desc(schema.riwayatAksi.id)).limit(6);`);

content = content.replace(/const \[approvalRows\] = await pool\.query\([\s\S]*?\);/, `const approvalRows = await db.select({\n        ...schema.approvalRequests,\n        full_name: schema.employees.fullName\n    }).from(schema.approvalRequests).leftJoin(schema.employees, eq(schema.employees.id, schema.approvalRequests.requesterId)).where(and(eq(schema.approvalRequests.unitId, unit.id), sql\`\${schema.approvalRequests.module} IN ('reimbursement', 'loan')\`)).orderBy(desc(schema.approvalRequests.id)).limit(8);`);

content = content.replace(/const \[analyticsRows\] = await pool\.query\([\s\S]*?\);/, `const analyticsRows = await db.select({\n        period_month: schema.payrolls.periodMonth,\n        total_payroll: sql\`SUM(COALESCE(\${schema.payrolls.netSalary}, 0))\`\n    }).from(schema.payrolls).innerJoin(schema.employees, eq(schema.employees.id, schema.payrolls.employeeId)).where(eq(schema.employees.companyId, unit.id)).groupBy(schema.payrolls.periodMonth).orderBy(desc(schema.payrolls.periodMonth)).limit(6);`);

content = content.replace(/const \[payrollSummaryRows\] = await pool\.query\([\s\S]*?\);/, `const payrollSummaryRows = await db.select({\n        payment_status: schema.payrolls.paymentStatus,\n        cnt: sql\`COUNT(*)\`,\n        total: sql\`SUM(COALESCE(\${schema.payrolls.netSalary}, 0))\`\n    }).from(schema.payrolls).innerJoin(schema.employees, eq(schema.employees.id, schema.payrolls.employeeId)).where(and(eq(schema.employees.companyId, unit.id), eq(schema.payrolls.periodMonth, currentMonth), eq(schema.payrolls.periodYear, currentYear))).groupBy(schema.payrolls.paymentStatus);`);

content = content.replace(/const \[units\] = await pool\.query\('SELECT id FROM unit_bisnis WHERE slug = \? AND user_id = \?', \[params\.slug, userId\]\);/, `const units = await db.select({ id: schema.unitBisnis.id }).from(schema.unitBisnis).where(and(eq(schema.unitBisnis.slug, params.slug), eq(schema.unitBisnis.userId, userId)));`);

content = content.replace(/await pool\.query\([\s\S]*?'INSERT INTO leave_requests[\s\S]*?\);/, `await db.insert(schema.leaveRequests).values({\n            employeeId: req.employeeId,\n            type: req.type || 'leave',\n            startDate: req.startDate,\n            endDate: req.endDate,\n            reason: req.reason || '',\n            status: 'pending'\n        });`);

content = content.replace(/await pool\.query\([\s\S]*?INSERT INTO approval_requests[\s\S]*?\);/, `await db.insert(schema.approvalRequests).values({\n            module: moduleName,\n            requesterId,\n            unitId,\n            actionType: 'CREATE',\n            currentLevel: 1,\n            maxLevel: 1,\n            status: 'PENDING',\n            note,\n            dataAfter: { amount, module: moduleName }\n        });`);

content = content.replace(/await pool\.query\([\s\S]*?UPDATE approval_requests SET status = \? WHERE id = \? AND unit_id = \?'[\s\S]*?\);/, `await db.update(schema.approvalRequests).set({ status: newStatus }).where(and(eq(schema.approvalRequests.id, approvalId), eq(schema.approvalRequests.unitId, unitId)));`);

content = content.replace(/await pool\.query\([\s\S]*?INSERT INTO approval_logs[\s\S]*?\);/, `await db.insert(schema.approvalLogs).values({\n            requestId: approvalId,\n            approverId: String(userId),\n            action: decision === 'approve' ? 'APPROVE' : 'REJECT',\n            note: body.note || null\n        });`);

content = content.replace(/const \[employeesInUnit\] = await pool\.query\('SELECT id, salary FROM employees WHERE company_id = \? AND status = \?', \[unitId, 'active'\]\);/, `const employeesInUnit = await db.select({ id: schema.employees.id, salary: schema.employees.salary }).from(schema.employees).where(and(eq(schema.employees.companyId, unitId), eq(schema.employees.status, 'active')));`);

content = content.replace(/await pool\.query\([\s\S]*?'INSERT INTO payrolls[\s\S]*?\);/, `await db.insert(schema.payrolls).values({\n                employeeId: emp.id,\n                periodMonth: month,\n                periodYear: year,\n                basicSalary,\n                allowances,\n                deductions,\n                netSalary,\n                paymentStatus: 'unpaid'\n            });`);

content = content.replace(/await pool\.query\([\s\S]*?UPDATE payrolls p[\s\S]*?\);/, `const payrollsToUpdate = await db.select({ id: schema.payrolls.id })\n            .from(schema.payrolls)\n            .innerJoin(schema.employees, eq(schema.employees.id, schema.payrolls.employeeId))\n            .where(and(\n                eq(schema.employees.companyId, unitId),\n                eq(schema.payrolls.periodMonth, month),\n                eq(schema.payrolls.periodYear, year)\n            ));\n        \n        const payrollIds = payrollsToUpdate.map(p => p.id);\n        if (payrollIds.length > 0) {\n            await db.update(schema.payrolls)\n                .set({ paymentStatus: 'paid' })\n                .where(inArray(schema.payrolls.id, payrollIds));\n        }`);

fs.writeFileSync(file, content);
console.log("Replaced 1 done");
