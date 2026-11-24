
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Lecon = sequelize.define(
  "Lecon",
  {
    idLecon: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: "idLecon"
    },
    titre: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: "titre"
    },
    contenu: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "contenu"
    },
    ordre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: "ordre"
    },
    codeModule: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "codeModule",
      references: {
        model: "module",
        key: "codeModule"
      }
    }
  },
  {
    tableName: "lecon",
    timestamps: false,
    freezeTableName: true
  }
);

module.exports = Lecon;
