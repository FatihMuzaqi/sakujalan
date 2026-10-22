import { Sequelize } from 'sequelize';
import { ENV } from './env.js';

const sequelizeOptions = process.env.NODE_ENV === 'test'
  ? {
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false,
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
      }
    }
  : {
      host: ENV.DB_HOST,
      port: ENV.DB_PORT,
      dialect: ENV.DB_DIALECT,
      logging: ENV.DB_LOGGING ? console.log : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
      }
    };

export const sequelize = process.env.NODE_ENV === 'test'
  ? new Sequelize(sequelizeOptions)
  : new Sequelize(ENV.DB_NAME, ENV.DB_USER, ENV.DB_PASSWORD, sequelizeOptions);

export const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully to', `${ENV.DB_HOST}:${ENV.DB_PORT}/${ENV.DB_NAME}`);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    // In local dev without MySQL running immediately, we log warning
  }
};
