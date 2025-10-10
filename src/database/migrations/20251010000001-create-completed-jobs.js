'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('completed_jobs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      job_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      url: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        validate: {
          isIn: [['completed', 'failed']],
        },
      },
      report_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Foreign key to reports table, NULL if job failed',
      },
      start_time: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      end_time: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error details if status is failed',
      },
      wcag_version: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      wcag_level: {
        type: Sequelize.STRING(5),
        allowNull: true,
      },
      max_pages: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex('completed_jobs', ['user_id', 'end_time'], {
      name: 'idx_completed_jobs_user_end_time',
    });
    await queryInterface.addIndex('completed_jobs', ['job_id'], {
      name: 'idx_completed_jobs_job_id',
    });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable('completed_jobs');
  },
};
