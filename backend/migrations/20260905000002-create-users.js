export const up = async ({ context: queryInterface, Sequelize }) => {
  const DataTypes = Sequelize.DataTypes || Sequelize;
  await queryInterface.createTable('users', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    company_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
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
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('OWNER', 'ADMIN', 'MANAGER', 'OFFICER'),
      defaultValue: 'OFFICER',
      allowNull: false
    },
    avatar_url: {
      type: DataTypes.STRING(255),
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
};

export const down = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('users');
};
