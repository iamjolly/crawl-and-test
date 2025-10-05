'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('crawl_jobs', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      domain: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        validate: {
          isIn: [['queued', 'running', 'completed', 'error', 'cancelled', 'timeout']],
        },
      },
      options: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex('crawl_jobs', ['user_id']);
    await queryInterface.addIndex('crawl_jobs', ['domain']);
    await queryInterface.addIndex('crawl_jobs', ['status']);
    await queryInterface.addIndex('crawl_jobs', ['created_at']);
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable('crawl_jobs');
  },
};
