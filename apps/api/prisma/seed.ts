/**
 * Prisma seed
 *
 * Bootstraps a development tenant ("Acme Real Estate"), an owner user,
 * sample agents, sources, properties, and a few leads so the app is
 * immediately demo-ready after `pnpm db:seed`.
 *
 *  - Owner login: owner@acme.test / Owner123!
 *  - Manager login: manager@acme.test / Manager123!
 *  - Agent login: agent@acme.test / Agent123!
 */
import { PrismaClient, CountryCode, PlanCode, TenantStatus, InventoryStatus, PropertyType, ListingType, LeadChannel, LeadStatus, InterestType } from '@prisma/client';
import * as argon2 from 'argon2';
import { BUILTIN_ROLES } from '../src/modules/iam/domain/permissions.catalog';

const prisma = new PrismaClient();
const PEPPER = process.env.PASSWORD_PEPPER ?? 'dev-pepper-change-me-min-32-chars-long-please';

async function hashPwd(plain: string): Promise<string> {
  return argon2.hash(plain + PEPPER, { type: argon2.argon2id });
}

async function main(): Promise<void> {
  console.log('🌱 Seeding development data…');

  // Idempotent: wipe the seed tenant if it already exists
  const existing = await prisma.tenant.findUnique({ where: { subdomain: 'acme' } });
  if (existing) {
    console.log('   Removing existing acme tenant…');
    await prisma.tenant.delete({ where: { id: existing.id } });
  }

  // 1. Tenant
  const tenant = await prisma.tenant.create({
    data: {
      subdomain: 'acme',
      name: 'Acme Real Estate',
      country: CountryCode.SA,
      currency: 'SAR',
      locale: 'ar-SA',
      timezone: 'Asia/Riyadh',
      planCode: PlanCode.PRO,
      status: TenantStatus.ACTIVE,
      hijriEnabled: true,
    },
  });

  // 2. Roles
  await prisma.role.createMany({
    data: Object.values(BUILTIN_ROLES).map((r) => ({
      tenantId: tenant.id,
      code: r.code,
      name: r.name,
      permissions: [...r.permissions],
      isSystem: true,
      isDefault: r.code === 'AGENT',
    })),
  });

  const ownerRole = await prisma.role.findFirstOrThrow({ where: { tenantId: tenant.id, code: 'OWNER' } });
  const managerRole = await prisma.role.findFirstOrThrow({ where: { tenantId: tenant.id, code: 'SALES_MANAGER' } });
  const agentRole = await prisma.role.findFirstOrThrow({ where: { tenantId: tenant.id, code: 'AGENT' } });

  // 3. Branch
  const branch = await prisma.branch.create({
    data: {
      tenantId: tenant.id,
      name: 'Acme Riyadh HQ',
      code: 'RUH',
      country: CountryCode.SA,
      city: 'Riyadh',
      isDefault: true,
      timezone: 'Asia/Riyadh',
    },
  });

  // 4. Users
  const owner = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'owner@acme.test',
      passwordHash: await hashPwd('Owner123!'),
      firstName: 'Abdulaziz',
      lastName: 'Al-Saud',
      fullNameAr: 'عبدالعزيز آل سعود',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      roles: { create: [{ roleId: ownerRole.id }] },
      branches: { create: [{ branchId: branch.id, isPrimary: true }] },
    },
  });
  await prisma.tenant.update({ where: { id: tenant.id }, data: { ownerId: owner.id } });

  const manager = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'manager@acme.test',
      passwordHash: await hashPwd('Manager123!'),
      firstName: 'Sara',
      lastName: 'Al-Qahtani',
      fullNameAr: 'سارة القحطاني',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      roles: { create: [{ roleId: managerRole.id }] },
      branches: { create: [{ branchId: branch.id, isPrimary: true }] },
    },
  });

  const agent = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'agent@acme.test',
      passwordHash: await hashPwd('Agent123!'),
      firstName: 'Mohammed',
      lastName: 'Al-Otaibi',
      fullNameAr: 'محمد العتيبي',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      roles: { create: [{ roleId: agentRole.id }] },
      branches: { create: [{ branchId: branch.id, isPrimary: true }] },
    },
  });

  // 5. Default pipeline
  const pipeline = await prisma.pipeline.create({
    data: {
      tenantId: tenant.id,
      code: 'SALES',
      name: 'Sales Pipeline',
      pipelineType: 'SALE',
      isDefault: true,
    },
  });
  await prisma.pipelineStage.createMany({
    data: [
      { pipelineId: pipeline.id, code: 'PROSPECTING', name: 'Prospecting', sortOrder: 0, probability: 10 },
      { pipelineId: pipeline.id, code: 'QUALIFIED', name: 'Qualified', sortOrder: 1, probability: 25 },
      { pipelineId: pipeline.id, code: 'VIEWING', name: 'Viewing', sortOrder: 2, probability: 40 },
      { pipelineId: pipeline.id, code: 'OFFER', name: 'Offer Sent', sortOrder: 3, probability: 60 },
      { pipelineId: pipeline.id, code: 'NEGOTIATION', name: 'Negotiation', sortOrder: 4, probability: 75 },
      { pipelineId: pipeline.id, code: 'WON', name: 'Won', sortOrder: 5, probability: 100, isWon: true },
      { pipelineId: pipeline.id, code: 'LOST', name: 'Lost', sortOrder: 6, probability: 0, isLost: true },
    ],
  });

  // 6. Sources
  const manualSource = await prisma.leadSource.create({
    data: { tenantId: tenant.id, code: 'MANUAL', name: 'Manual Entry', channel: LeadChannel.MANUAL },
  });
  const webSource = await prisma.leadSource.create({
    data: { tenantId: tenant.id, code: 'WEB', name: 'Website Form', channel: LeadChannel.WEB_FORM, webhookKey: 'demo-web-key-123' },
  });
  const metaSource = await prisma.leadSource.create({
    data: { tenantId: tenant.id, code: 'META', name: 'Meta Ads', channel: LeadChannel.META_AD, webhookKey: 'demo-meta-key-456' },
  });

  // 7. Distribution rule — round-robin between agent + manager
  await prisma.distributionRule.create({
    data: {
      tenantId: tenant.id,
      name: 'Default Round-Robin',
      priority: 100,
      isActive: true,
      conditions: {},
      strategy: 'round_robin',
      assigneeIds: [agent.id, manager.id],
    },
  });

  // 8. Commission rule — 2.5% sale, 50/25/25 split
  await prisma.commissionRule.create({
    data: {
      tenantId: tenant.id,
      code: 'STD-SALE',
      name: 'Standard Sale (2.5%)',
      isActive: true,
      priority: 100,
      conditions: { listingType: 'SALE' },
      calculation: { type: 'percentage', value: 2.5 },
      splits: [
        { role: 'PRIMARY_AGENT', pct: 50 },
        { role: 'BROKERAGE', pct: 25 },
        { role: 'MANAGER_OVERRIDE', pct: 25 },
      ],
      vatRate: 15,
      clawbackDays: 60,
    },
  });

  // 9. Master project + units
  const project = await prisma.masterProject.create({
    data: {
      tenantId: tenant.id,
      code: 'AQ-PARK',
      name: 'Aqar Park Towers',
      nameAr: 'أبراج عقار بارك',
      developerName: 'Acme Development',
      country: CountryCode.SA,
      city: 'Riyadh',
      district: 'Al Olaya',
      totalUnits: 200,
      isOffPlan: true,
      amenities: ['Pool', 'Gym', 'Garden', 'Mosque', 'Parking'],
    },
  });
  const building = await prisma.building.create({
    data: { tenantId: tenant.id, masterProjectId: project.id, code: 'A', name: 'Tower A', totalFloors: 20 },
  });
  const floor = await prisma.floor.create({
    data: { tenantId: tenant.id, buildingId: building.id, number: 5, totalUnits: 6 },
  });
  await prisma.property.createMany({
    data: [
      {
        tenantId: tenant.id,
        referenceCode: 'A-0501',
        masterProjectId: project.id,
        buildingId: building.id,
        floorId: floor.id,
        unitNumber: '0501',
        titleEn: '2BR Apartment with Skyline View',
        titleAr: 'شقة غرفتين بإطلالة على الأفق',
        propertyType: PropertyType.APARTMENT,
        listingType: ListingType.OFF_PLAN_SALE,
        inventoryStatus: InventoryStatus.AVAILABLE,
        bedrooms: 2,
        bathrooms: 2,
        builtArea: 110,
        price: 950_000,
        currency: 'SAR',
        country: CountryCode.SA,
        city: 'Riyadh',
        district: 'Al Olaya',
        floorNumber: 5,
        isPublished: true,
        publishedAt: new Date(),
      },
      {
        tenantId: tenant.id,
        referenceCode: 'A-0502',
        masterProjectId: project.id,
        buildingId: building.id,
        floorId: floor.id,
        unitNumber: '0502',
        titleEn: '3BR Family Apartment',
        titleAr: 'شقة عائلية ثلاث غرف',
        propertyType: PropertyType.APARTMENT,
        listingType: ListingType.OFF_PLAN_SALE,
        inventoryStatus: InventoryStatus.AVAILABLE,
        bedrooms: 3,
        bathrooms: 3,
        builtArea: 160,
        price: 1_350_000,
        currency: 'SAR',
        country: CountryCode.SA,
        city: 'Riyadh',
        district: 'Al Olaya',
        floorNumber: 5,
        isPublished: true,
        publishedAt: new Date(),
      },
    ],
  });

  // 10. Sample leads
  await prisma.lead.createMany({
    data: [
      {
        tenantId: tenant.id,
        sourceId: webSource.id,
        fullName: 'Khalid Al-Faisal',
        phone: '+966501112233',
        phoneNormalized: '+966501112233',
        email: 'khalid@example.com',
        emailLower: 'khalid@example.com',
        status: LeadStatus.NEW,
        channel: LeadChannel.WEB_FORM,
        assignedToId: agent.id,
        assignedAt: new Date(),
        interestType: InterestType.BUY,
        budgetMin: 800_000,
        budgetMax: 1_200_000,
        currency: 'SAR',
        preferredAreas: ['Al Olaya', 'Al Malqa'],
        propertyTypes: ['APARTMENT'],
        bedroomsMin: 2,
        score: 75,
        urgency: 'warm',
      },
      {
        tenantId: tenant.id,
        sourceId: metaSource.id,
        fullName: 'Layla Al-Harbi',
        phone: '+966554445566',
        phoneNormalized: '+966554445566',
        email: 'layla@example.com',
        emailLower: 'layla@example.com',
        status: LeadStatus.CONTACTED,
        channel: LeadChannel.META_AD,
        assignedToId: agent.id,
        assignedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        firstContactedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        interestType: InterestType.BUY,
        budgetMin: 1_000_000,
        budgetMax: 1_500_000,
        currency: 'SAR',
        preferredAreas: ['Al Olaya'],
        propertyTypes: ['APARTMENT', 'PENTHOUSE'],
        bedroomsMin: 3,
        score: 85,
        urgency: 'hot',
      },
    ],
  });

  console.log('✅ Seed complete.');
  console.log('   Tenant subdomain: acme');
  console.log('   Logins:');
  console.log('     owner@acme.test     / Owner123!');
  console.log('     manager@acme.test   / Manager123!');
  console.log('     agent@acme.test     / Agent123!');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
