'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('session', {
      sid: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false,
      },
      sess: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      expire: {
        type: Sequelize.DATE(6),
        allowNull: false,
      },
    });

    // Add index on expire for session cleanup queries
    await queryInterface.addIndex('session', ['expire'], {
      name: 'IDX_session_expire',
    });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable('session');
  },
};
