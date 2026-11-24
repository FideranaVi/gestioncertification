const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Un événement de surveillance pendant une tentative de quiz :
// sortie d'onglet, sortie de fenêtre, fermeture de page, retour.
const ActiviteTentative = sequelize.define(
  "ActiviteTentative",
  {
    idActivite: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    idTentative: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    dateActivite: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    dureeSecondes: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    tableName: "activites_tentative",
    timestamps: false,
    indexes: [{ fields: ["idTentative"] }]
  }
);

module.exports = ActiviteTentative;