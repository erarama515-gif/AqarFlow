# AqarFlow — Sales Pitch

A short, opinionated narrative for selling AqarFlow into MENA brokerages and developers.

## The 30-second version

> "AqarFlow is the only CRM built ground-up for MENA real estate. It speaks Arabic natively, handles off-plan inventory and payment plans out of the box, normalizes phone numbers and Arabic names so duplicate leads stop costing you money, and routes every inbound enquiry — from your website, from Meta ads, from your sales team's walk-ins — in seconds, with an SLA timer that escalates if your agent goes quiet. All for less than the cost of a single Salesforce seat."

## Why brokerages buy us

- **Leads stop slipping through the cracks.** Every inbound channel (WhatsApp later, Meta Ads, Google Ads, web form, walk-in, bulk import) lands as a typed `Lead` with a phone-normalized identity. Duplicate detection runs on every capture, so the same buyer never gets quoted by three different agents.
- **The pipeline is Arabic-native.** Names in Arabic vary wildly — حمد / احمد / محمد / محمّد — and standard CRMs treat them as different people. Ours collapses them to one canonical form before comparison.
- **Off-plan sales work the way developers actually sell.** Master project → tower → floor → unit. Inventory states that map to reality: AVAILABLE, RESERVED (with a timer), BOOKED, SOLD. Payment plans built visually: 10/90, 40/60, post-handover, milestone-linked. Reservations auto-release when the timer expires so nothing stays locked overnight.
- **Commissions stop being an Excel nightmare.** Define a rule once: 2.5 % of the sale, split 50/25/25 between primary agent, brokerage, and manager override. Apply VAT automatically based on the tenant's country. Every winning deal triggers entries instantly. Approval and payment are one click each.

## Why developers buy us

- **One dashboard per project shows live inventory** — towers, floors, units, who reserved what, what closes this week.
- **Payment plans live with the property** so an agent quoting a unit always has the right schedule.
- **Channel partners (external brokers) is on the roadmap** with a separate portal, lead locking, and per-partner commission agreements.

## Why we win on price

- **Free forever for solo agents and tiny teams** (up to 3 seats, 100 leads / month, full feature set).
- **Pro at $49 / seat** is one-sixth of Salesforce and a third of HubSpot — for software that actually understands your business.
- **No paid integrations gate the core**. WhatsApp, SMS, AI, e-signature are post-MVP add-ons. The core CRM ships free.

## Why we win on trust

- **Multi-tenant from day one**, with strict tenant isolation and an immutable audit log.
- **Self-hostable**. A brokerage that wants its data on its own VPS can run the entire stack from one Docker Compose file.
- **No vendor lock-in**. Bring-your-own SMTP, S3, Postgres. Migrate out at any time with one Prisma migrate + a JSON dump.

## Three objections, three answers

| Objection | Answer |
| --- | --- |
| "We use Excel and WhatsApp groups, we're fine." | "How many leads did you respond to last month within 30 minutes? AqarFlow shows you the number — and shrinks it." |
| "Salesforce works for us." | "Show me how Salesforce models a 10/90 payment plan with milestone-linked installments and a 24-hour reservation timer on an off-plan unit. We'll wait." |
| "We can build this ourselves." | "Sure. The schema alone is 36 tables, the dedup logic took three weeks to get right, and the commission engine has to handle four-way splits with VAT per country. Or you could start using ours today for $0." |

## Closing line

> "We're not asking you to switch tomorrow. Give us 10 leads, run them through the free tier for two weeks, and watch the duplicate rate drop. Then we'll talk."
