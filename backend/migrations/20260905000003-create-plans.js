export const up = async ({ context: queryInterface, Sequelize }) => {
  const DataTypes = Sequelize.DataTypes || Sequelize;
  await queryInterface.createTable('plans', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    price: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 50000.00,
      allowNull: false
    },
    billing_interval: {
      type: DataTypes.ENUM('MONTHLY', 'YEARLY'),
      defaultValue: 'MONTHLY',
      allowNull: false
    },
    trial_days: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      allowNull: false
    },
    max_users: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    max_active_trips: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    max_expenses: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    }
  });

  await queryInterface.addIndex('plans', ['code'], { unique: true });
  await queryInterface.addIndex('plans', ['is_active']);
};

export const down = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('plans');
};
