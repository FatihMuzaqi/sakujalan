export const up = async ({ context: queryInterface, Sequelize }) => {
  const DataTypes = Sequelize.DataTypes || Sequelize;
  await queryInterface.createTable('companies', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    logo: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('TRIAL', 'ACTIVE', 'PAST_DUE', 'EXPIRED', 'CANCELLED', 'SUSPENDED'),
      defaultValue: 'TRIAL',
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

  await queryInterface.addIndex('companies', ['email'], { unique: true });
  await queryInterface.addIndex('companies', ['status']);
};

export const down = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('companies');
};
