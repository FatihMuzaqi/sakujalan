export const up = async ({ context: queryInterface, Sequelize }) => {
  const DataTypes = Sequelize.DataTypes || Sequelize;
  await queryInterface.addColumn('expenses', 'latitude', {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  });
  await queryInterface.addColumn('expenses', 'longitude', {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  });
};

export const down = async ({ context: queryInterface }) => {
  await queryInterface.removeColumn('expenses', 'latitude');
  await queryInterface.removeColumn('expenses', 'longitude');
};
