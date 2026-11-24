
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SuiviLecon = sequelize.define(
  "SuiviLecon",
  {
    idSuiviLecon: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    idApprenant: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "utilisateur",
        key: "idUtilisateur"
      }
    },
    idLecon: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "lecon",
        key: "idLecon"
      }
    },
    statut: {
      type: DataTypes.ENUM("en_cours", "terminee"),
      allowNull: false,
      defaultValue: "en_cours"
    },
    dateDebut: {
      type: DataTypes.DATE,
      allowNull: true
    },
    dateFin: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: "suivilecon",
    timestamps: false,
    freezeTableName: true
  }
);

module.exports = SuiviLecon;
