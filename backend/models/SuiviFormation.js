
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SuiviFormation = sequelize.define("SuiviFormation", {
  idSuivi: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  idApprenant: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  numFormation: {
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
}, {
  tableName: "suiviformation",
  timestamps: false,
  freezeTableName: true
});

module.exports = SuiviFormation;
