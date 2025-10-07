'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CrawlJob extends Model {
    /**
     * Helper method for defining associations.
     */
    static associate(models) {
      // CrawlJob belongs to User
      CrawlJob.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
    }

    /**
     * Check if a user can modify this job (owner or admin)
     * @param {string} userId - User ID to check
     * @param {string} userRole - User role ('admin' or 'user')
     * @returns {boolean} True if user can modify
     */
    canUserModify(userId, userRole) {
      // Admins can modify any job
      if (userRole === 'admin') {
        return true;
      }
      // Users can only modify their own jobs
      return this.user_id === userId;
    }

    /**
     * Mark job as started
     * @returns {Promise<CrawlJob>} Updated job
     */
    async markStarted() {
      return this.update({
        status: 'running',
        started_at: new Date(),
      });
    }

    /**
     * Mark job as completed
     * @returns {Promise<CrawlJob>} Updated job
     */
    async markCompleted() {
      return this.update({
        status: 'completed',
        completed_at: new Date(),
      });
    }

    /**
     * Mark job as error
     * @param {string} errorMessage - Error description
     * @returns {Promise<CrawlJob>} Updated job
     */
    async markError(errorMessage) {
      return this.update({
        status: 'error',
        error: errorMessage,
        completed_at: new Date(),
      });
    }

    /**
     * Mark job as cancelled
     * @returns {Promise<CrawlJob>} Updated job
     */
    async markCancelled() {
      return this.update({
        status: 'cancelled',
        completed_at: new Date(),
      });
    }

    /**
     * Mark job as timeout
     * @returns {Promise<CrawlJob>} Updated job
     */
    async markTimeout() {
      return this.update({
        status: 'timeout',
        error: 'Job exceeded maximum runtime limit',
        completed_at: new Date(),
      });
    }

    /**
     * Get stats for a specific user
     * @param {string} userId - User ID
     * @returns {Promise<object>} Job statistics
     */
    static async getStatsForUser(userId) {
      const [total, running, completed, failed] = await Promise.all([
        CrawlJob.count({ where: { user_id: userId } }),
        CrawlJob.count({ where: { user_id: userId, status: 'running' } }),
        CrawlJob.count({ where: { user_id: userId, status: 'completed' } }),
        CrawlJob.count({ where: { user_id: userId, status: 'error' } }),
      ]);

      return { total, running, completed, failed };
    }

    /**
     * Get all stats (admin view)
     * @returns {Promise<object>} Job statistics
     */
    static async getAllStats() {
      const [total, running, completed, failed] = await Promise.all([
        CrawlJob.count(),
        CrawlJob.count({ where: { status: 'running' } }),
        CrawlJob.count({ where: { status: 'completed' } }),
        CrawlJob.count({ where: { status: 'error' } }),
      ]);

      return { total, running, completed, failed };
    }
  }

  CrawlJob.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      domain: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
          isIn: [['queued', 'running', 'completed', 'error', 'cancelled', 'timeout']],
        },
      },
      options: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      started_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      error: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'CrawlJob',
      tableName: 'crawl_jobs',
      underscored: true,
      timestamps: false, // We manage timestamps manually
    }
  );

  return CrawlJob;
};
