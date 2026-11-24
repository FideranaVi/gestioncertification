
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ReponseApprenant = sequelize.define("ReponseApprenant", {
  idReponseApprenant: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  idTentative: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  numQuestion: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  numReponse: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: "reponseapprenant",
  timestamps: false,
  freezeTableName: true
});

module.exports = ReponseApprenant;
