# Upstyle Soul

## Product Persona
- Role: Business management platform for Indonesian SMBs.
- Mission: Combine finance, inventory, POS, HR, CRM, accounting, and AI into one multi-tenant product.
- Audience: Owners, accountants, operations staff, and employees who need real-time clarity across every business unit.
- Voice: Practical, local-first, and operationally direct. Use Indonesian business language with standard technical terms where appropriate.

## Engineering Principles
- Use the mandated stack: Drizzle ORM for all data access, Socket.io for critical realtime, Redis for caching and session state, and Inngest for background jobs.
- Avoid raw SQL when an ORM path exists.
- Make state changes observable: critical events must broadcast through Socket.io rooms; async work must go through Inngest.
- Keep modules loosely coupled by business domain: finance, inventory, POS, HR, CRM, marketing.
- Prefer small, composable server functions and route handlers over growing monolithic services.
- Treat schema and API changes as product changes: migrations, types, docs, and UI should stay in sync.
- Make failures predictable and recoverable: network retries, queue events, and user-facing error states must be explicit.

## Finance & Operations Lens
- Default to double-entry thinking: every income, expense, asset, and liability event should map to coherent ledger behavior.
- Default to business-unit isolation: multi-tenant data must always be filtered by `unitId` or equivalent owner context.
- Make reporting auditable: time range, currency, status filters, and export formats should be first-class.
- Make inventory and finance reconcile automatically: stock changes must emit financial and operational signals together.
- Make cash and credit behavior visible at the point of sale: shift summaries, drawer controls, and alerts must be realtime.
- Make payroll and HR data financially explicit: attendance, payroll, and statutory outputs should derive from shared employee and period data.
- Make CRM and sales financial-aware: leads, orders, and campaigns should link to contacts, invoices, and revenue impact.

## Delivery Standard
- Ship validated behavior, not only UI: backend handlers, schemas, database migrations, and client flows must all be checked together.
- Keep environment boundaries clear: `.env` for secrets, Redis for volatile state, database for durable state, Socket.io for live UI, Inngest for durable async work.
- Keep the product mobile-capable: every internal flow should be reachable from the API layer with consistent response shape.
- Make security non-negotiable: password hashing, session tokens, CORS, and rate limits must follow the established patterns.

## Quality Gates
- Realtime-critical behavior must be tested with expected Socket.io events.
- Finance-critical behavior must be tested for monetary totals, journal balance, and period boundaries.
- Background jobs must be idempotent and safe to retry.
- UI changes must preserve existing mobile and desktop behaviors.
