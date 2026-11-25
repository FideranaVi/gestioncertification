
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Utilisateur = sequelize.define(
  "Utilisateur",
  {
    idUtilisateur: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    nom: {
      type: DataTypes.STRING(50),
      allowNull: false
    },

    prenom: {
      type: DataTypes.STRING(50),
      allowNull: false
    },

    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },

    pwd: {
      type: DataTypes.STRING(255),
      allowNull: false
    },

    role: {
      type: DataTypes.ENUM(
        "administrateur",
        "formateur",
        "apprenant"
      ),
      allowNull: false,
      defaultValue: "apprenant"
    }
  },
  {
    tableName: "utilisateur",
    timestamps: false,
    freezeTableName: true
  }
);

module.exports = Utilisateur;
