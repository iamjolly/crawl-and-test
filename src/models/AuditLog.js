'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AuditLog extends Model {
    static associate(models) {
      AuditLog.belongsTo(models.User, {
        foreignKey: 'actor_id',
        as: 'actor',
      });
    }

    /**
     * Helper method to create an audit log entry
     * @param {object} options - Audit log options
     * @param {string} options.actorId - ID of user performing action
     * @param {string} options.action - Action performed (e.g., 'user.approve', 'user.reject')
     * @param {string} options.resourceType - Type of resource (e.g., 'user')
     * @param {string} options.resourceId - ID of affected resource
     * @param {object} options.details - Additional details about the action
     * @param {string} options.ipAddress - IP address of requester
     * @param {string} options.userAgent - User agent string
     */
    static async log({
      actorId,
      action,
      resourceType,
      resourceId = null,
      details = null,
      ipAddress = null,
      userAgent = null,
    }) {
      return await AuditLog.create({
        actor_id: actorId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
    }
  }

  AuditLog.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      actor_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      action: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      resource_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      resource_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      details: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      user_agent: {
        type: DataTypes.TEXT,
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
      modelName: 'AuditLog',
      tableName: 'audit_logs',
      timestamps: false,
      underscored: true,
    }
  );

  return AuditLog;
};
