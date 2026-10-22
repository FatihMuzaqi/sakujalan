import { runDemoSeeder } from './seeders/demo-seed.js';
import { seedPlans } from './seeders/20260905000001-plan-seeder.js';
import { seedDefaultSuperAdmin } from './services/superadmin.service.js';
import { sequelize } from './config/database.js';
import { logger } from './utils/logger.util.js';

const main = async () => {
  try {
    logger.info('🚀 Memulai proses Seeding Database TripEx...');
    
    // 1. Seed SaaS Subscription Plans
    await seedPlans();

    // 2. Seed Master SuperAdmin Account
    await seedDefaultSuperAdmin();

    // 3. Seed Demo Tenant, Users, Trips & Expenses
    await runDemoSeeder();

    logger.info('🎉 Seluruh proses Seeder Database selesai dengan sukses!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Gagal menjalankan seeder: ' + error.message, error);
    await sequelize.close();
    process.exit(1);
  }
};

main();
