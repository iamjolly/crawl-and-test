'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CompletedJob extends Model {
    /**
     * Helper method for defining associations.
     */
    static associate(models) {
      // CompletedJob belongs to User
      CompletedJob.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
    }

    /**
     * Get completed jobs for a specific user
     * @param {string} userId - User ID
     * @param {number} limit - Number of jobs to return (default: 10)
     * @returns {Promise<CompletedJob[]>} Array of completed jobs
     */
    static async getForUser(userId, limit = 10) {
      return CompletedJob.findAll({
        where: { user_id: userId },
        order: [['end_time', 'DESC']],
        limit: Math.min(limit, 50), // Max 50
      });
    }

    /**
     * Get a completed job by job ID
     * @param {string} jobId - Job ID
     * @param {string} userId - User ID (for access control)
     * @returns {Promise<CompletedJob|null>} Completed job or null
     */
    static async getByJobId(jobId, userId) {
      return CompletedJob.findOne({
        where: {
          job_id: jobId,
          user_id: userId,
        },
      });
    }
  }

  CompletedJob.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      job_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      url: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
          isIn: [['completed', 'failed']],
        },
      },
      report_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      start_time: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      end_time: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      wcag_version: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      wcag_level: {
        type: DataTypes.STRING(5),
        allowNull: true,
      },
      max_pages: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'CompletedJob',
      tableName: 'completed_jobs',
      underscored: true,
      timestamps: false, // We manage timestamps manually
    }
  );

  return CompletedJob;
};
