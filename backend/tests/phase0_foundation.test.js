import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import {
  sequelize,
  Company,
  User,
  Plan,
  Subscription,
  Payment,
  PaymentWebhookLog
} from '../model/index.js';
import {
  COMPANY_STATUS,
  SUBSCRIPTION_STATUS,
  ROLES,
  DEFAULT_PLANS
} from '../config/constants.js';
import {
  createTrialSubscription,
  getCompanySubscription,
  checkSubscriptionStatus,
  isSubscriptionActive,
  expireSubscriptionIfNeeded
} from '../services/subscription.service.js';
import { seedPlans } from '../seeders/20260905000001-plan-seeder.js';

describe('PHASE 0: SaaS & Multi-Tenant Foundation Test Suite', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    await sequelize.sync({ force: true });
    // Seed initial SaaS plans
    await seedPlans();
  });

  after(async () => {
    await sequelize.close();
  });

  let companyA;
  let companyB;
  let userA;
  let userB;
  let subA;
  let monthlyPlan;

  it('Requirement 3: Plan MONTHLY tersedia di database', async () => {
    monthlyPlan = await Plan.findOne({ where: { code: 'MONTHLY' } });
    assert.ok(monthlyPlan, 'Plan with code MONTHLY must exist in database');
    assert.strictEqual(monthlyPlan.name, 'Monthly');
    assert.strictEqual(parseFloat(monthlyPlan.price), 50000.00);
    assert.strictEqual(monthlyPlan.billing_interval, 'MONTHLY');
    assert.strictEqual(monthlyPlan.trial_days, 30);
    assert.strictEqual(monthlyPlan.is_active, true);
  });

  it('Requirement 1 & 2: Company dapat memiliki subscription dan Subscription memiliki plan', async () => {
    companyA = await Company.create({
      name: 'PT Sinar Nusantara',
      email: 'contact@sinarnusantara.com',
      status: COMPANY_STATUS.TRIAL
    });

    const result = await createTrialSubscription(companyA.id, 'MONTHLY');
    subA = result.subscription;

    assert.ok(subA.id, 'Subscription must have valid ID');
    assert.strictEqual(subA.company_id, companyA.id);
    assert.strictEqual(subA.plan_id, monthlyPlan.id);

    // Verify relations via Sequelize include
    const fetchedSub = await Subscription.findByPk(subA.id, {
      include: [
        { model: Company, as: 'company' },
        { model: Plan, as: 'plan' }
      ]
    });

    assert.strictEqual(fetchedSub.company.name, 'PT Sinar Nusantara');
    assert.strictEqual(fetchedSub.plan.code, 'MONTHLY');
  });

  it('Requirement 4: Trial memiliki durasi 30 hari', async () => {
    assert.ok(subA.trial_started_at, 'Trial started date must exist');
    assert.ok(subA.trial_ends_at, 'Trial end date must exist');

    const startDate = new Date(subA.trial_started_at);
    const endDate = new Date(subA.trial_ends_at);
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    assert.strictEqual(diffDays, 30, 'Trial duration must be exactly 30 days');
    assert.strictEqual(subA.status, SUBSCRIPTION_STATUS.TRIAL);
  });

  it('Requirement 5: User dari Company A tidak dapat memperoleh Company B melalui tenant context', async () => {
    companyB = await Company.create({
      name: 'PT Logistik Khatulistiwa',
      email: 'contact@khatulistiwa.com',
      status: COMPANY_STATUS.TRIAL
    });

    userA = await User.create({
      company_id: companyA.id,
      name: 'Ahmad Owner A',
      email: 'ahmad@sinarnusantara.com',
      password: 'hashed_password_123',
      role: ROLES.OWNER
    });

    userB = await User.create({
      company_id: companyB.id,
      name: 'Budi Owner B',
      email: 'budi@khatulistiwa.com',
      password: 'hashed_password_123',
      role: ROLES.OWNER
    });

    // Simulating Tenant Context derivation (JWT -> User -> Company)
    const getUserTenantContext = async (user) => {
      // In our tenant middleware, tenant context is derived strictly from verified user
      const userWithCompany = await User.findByPk(user.id, {
        include: [{ model: Company, as: 'company' }]
      });
      return {
        currentUser: userWithCompany,
        currentCompany: userWithCompany.company,
        currentRole: userWithCompany.role,
        tenantScope: { company_id: userWithCompany.company_id }
      };
    };

    const contextA = await getUserTenantContext(userA);
    const contextB = await getUserTenantContext(userB);

    // Tenant Isolation assertions
    assert.strictEqual(contextA.currentCompany.id, companyA.id);
    assert.strictEqual(contextB.currentCompany.id, companyB.id);
    assert.notStrictEqual(contextA.tenantScope.company_id, contextB.tenantScope.company_id);

    // Ensure querying with Tenant A scope will NEVER return Company B's data
    const scopedUsersForA = await User.findAll({
      where: { company_id: contextA.tenantScope.company_id }
    });

    assert.strictEqual(scopedUsersForA.length, 1);
    assert.strictEqual(scopedUsersForA[0].email, 'ahmad@sinarnusantara.com');
    assert.ok(!scopedUsersForA.some(u => u.company_id === companyB.id));
  });

  it('Requirement 6: Subscription EXPIRED dapat dideteksi', async () => {
    // Simulate past trial date
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
    await subA.update({
      trial_ends_at: pastDate,
      status: SUBSCRIPTION_STATUS.TRIAL
    });

    // Run expiration check
    await expireSubscriptionIfNeeded(companyA.id);
    const statusInfo = await checkSubscriptionStatus(companyA.id);

    assert.strictEqual(statusInfo.status, SUBSCRIPTION_STATUS.EXPIRED);
    assert.strictEqual(statusInfo.is_active, false);
    assert.strictEqual(statusInfo.is_read_only, true);

    const active = await isSubscriptionActive(companyA.id);
    assert.strictEqual(active, false);
  });

  it('Requirement 7: Subscription ACTIVE dapat dideteksi', async () => {
    // Simulate active paid period in future
    const now = new Date();
    const futurePeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await subA.update({
      status: SUBSCRIPTION_STATUS.ACTIVE,
      current_period_start: now,
      current_period_end: futurePeriodEnd
    });
    await companyA.update({ status: COMPANY_STATUS.ACTIVE });

    const statusInfo = await checkSubscriptionStatus(companyA.id);
    assert.strictEqual(statusInfo.status, SUBSCRIPTION_STATUS.ACTIVE);
    assert.strictEqual(statusInfo.is_active, true);
    assert.strictEqual(statusInfo.is_read_only, false);
    assert.ok(statusInfo.days_remaining > 0);

    const active = await isSubscriptionActive(companyA.id);
    assert.strictEqual(active, true);
  });
});
