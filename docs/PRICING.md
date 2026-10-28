# AqarFlow — Pricing Strategy

This page documents the recommended go-to-market pricing for AqarFlow. It is intentionally simple, freemium-led, and designed to outbid every legacy CRM in MENA on time-to-value.

## Tier overview

| Plan | Monthly per seat | Annual per seat (–20 %) | Best for |
| --- | --- | --- | --- |
| **Free** | $0 | $0 | Solo agents, family offices, or anyone wanting to evaluate. |
| **Starter** | $19 | $15 | Boutique brokerages of 2–10 agents. |
| **Pro** | $49 | $39 | Mid-market brokerages of 10–50 agents (the sweet spot). |
| **Business** | $99 | $79 | Larger brokerages, off-plan developers, multi-branch ops. |

Annual contracts are billed in advance and include a one-time onboarding workshop.

## What's included

| Capability | Free | Starter | Pro | Business |
| --- | --- | --- | --- | --- |
| Seats | up to 3 | unlimited | unlimited | unlimited |
| Leads / month | 100 | 1,000 | unlimited | unlimited |
| Properties | unlimited | unlimited | unlimited | unlimited |
| Deals & pipeline (Kanban) | ✓ | ✓ | ✓ | ✓ |
| Contacts (multi-role) | ✓ | ✓ | ✓ | ✓ |
| Commission engine | ✓ | ✓ | ✓ | ✓ |
| Activity & calendar | ✓ | ✓ | ✓ | ✓ |
| Property matching | ✓ | ✓ | ✓ | ✓ |
| Email notifications | ✓ | ✓ | ✓ | ✓ |
| In-app realtime | ✓ | ✓ | ✓ | ✓ |
| Inbound lead webhooks | 1 source | 3 sources | unlimited | unlimited |
| Custom commission rules | 1 | 3 | unlimited | unlimited |
| Custom pipelines | 1 | 1 | unlimited | unlimited |
| Branches | 1 | 3 | 10 | unlimited |
| Master projects (off-plan) | – | – | ✓ | ✓ |
| Payment-plan builder | – | – | ✓ | ✓ |
| Reservation timers | – | – | ✓ | ✓ |
| Multi-branch routing | – | – | ✓ | ✓ |
| API access + webhooks out | – | – | ✓ | ✓ |
| Custom roles | – | – | ✓ | ✓ |
| Audit log export | – | – | ✓ | ✓ |
| Onboarding workshop | – | – | annual only | ✓ |
| Dedicated success manager | – | – | – | ✓ |
| SSO (Google now, SAML later) | – | – | ✓ | ✓ |

> Items marked "later" are on the post-MVP roadmap. They never gate the user's ability to run their business today.

## How we beat the competition on price

- **Salesforce Real Estate Cloud**: $300+ per seat with mandatory onboarding fees and partner consultants.
- **HubSpot Sales Pro**: $90+ per seat with no off-plan, no Arabic-native UX, no MENA-specific portals.
- **PropSpace**: opaque pricing, monolithic and slow to evolve.
- **AqarFlow**: $49 per seat on Pro, transparent and built for MENA from day one.

## Why not usage-based pricing in MVP?

Brokerages buy on predictable monthly cost, not on cost per lead. Usage-based fees create perceived risk during the first sale. We surface usage analytics from day one (so they can plan), but charge a flat seat fee. Add-ons (extra WhatsApp messages, AI lead scoring) become metered later when the platform is well-known.

## Add-ons (post-MVP)

| Add-on | Price | Notes |
| --- | --- | --- |
| WhatsApp Business Cloud | pay Meta's per-conversation cost, no markup | Activated when the tenant connects their own WABA. |
| Portal sync (Property Finder / Bayut / Aqar) | $99 / portal / month | After commercial agreements with each portal. |
| AI lead scoring & recommendations | $1 / 1k tokens | Once we light up an AI provider. |
| Mortgage workflow & bank integrations | Custom | For Business tier on request. |

These exist as named placeholders in the codebase (adapter interfaces, env flags) but are **not** required for the MVP to be sold.

## Free → Paid conversion plan

1. Free plan deliberately includes the entire CRM core (leads, contacts, deals, properties, commission, reports).
2. Lead-count cap (100 / month) is the natural upgrade trigger for active brokerages.
3. Pro-only features (master projects, reservation timers, payment plans, multi-branch) are the upgrade triggers for developers and mid-market brokerages.
4. Self-service upgrade in the billing screen with a 14-day Pro trial available at any time.
