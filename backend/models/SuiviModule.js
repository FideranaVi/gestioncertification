
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SuiviModule = sequelize.define(
  "SuiviModule",
  {
    idSuiviModule: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    idApprenant: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    codeModule: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    statut: {
      type: DataTypes.ENUM("en_cours", "terminee"),
      allowNull: false,
      defaultValue: "en_cours"
    },
    dateDebut: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    dateFin: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: "SuiviModule",
    timestamps: false,
    freezeTableName: true
  }
);

module.exports = SuiviModule;
