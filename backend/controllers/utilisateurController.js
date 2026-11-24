
const { Utilisateur } = require("../models");
const { Op } = require("sequelize");
const bcrypt = require("bcrypt");

const ROLES = ["administrateur", "formateur", "apprenant"];

const obtenirUtilisateurs = async (req, res) => {
  try {
    const {
      search = "",
      role = "",
      page = 1,
      limit = 10,
      sortBy = "idUtilisateur",
      order = "DESC"
    } = req.query;

    const pageNumber = Math.max(1, parseInt(page) || 1);
    const limitNumber = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNumber - 1) * limitNumber;

    const allowedSort = [
      "idUtilisateur", "nom", "prenom", "email", "role"
    ];

    const sortColumn = allowedSort.includes(sortBy)
      ? sortBy
      : "idUtilisateur";

    const sortOrder = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const where = {};

    if (search.trim()) {
      where[Op.or] = [
        { nom: { [Op.like]: `%${search.trim()}%` } },
        { prenom: { [Op.like]: `%${search.trim()}%` } },
        { email: { [Op.like]: `%${search.trim()}%` } }
      ];
    }

    if (role) {
      if (!ROLES.includes(role)) {
        return res.status(400).json({ message: "Rôle invalide." });
      }
      where.role = role;
    }

    const { count, rows } = await Utilisateur.findAndCountAll({
      where,
      attributes: { exclude: ["pwd"] },
      limit: limitNumber,
      offset,
      order: [[sortColumn, sortOrder]]
    });

    res.json({
      utilisateurs: rows,
      pagination: {
        total: count,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(count / limitNumber)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Erreur lors de la récupération des utilisateurs."
    });
  }
};

const obtenirStatistiquesUtilisateurs = async (req, res) => {
  try {
    const total = await Utilisateur.count();

    const administrateurs = await Utilisateur.count({
      where: { role: "administrateur" }
    });

    const formateurs = await Utilisateur.count({
      where: { role: "formateur" }
    });

    const apprenants = await Utilisateur.count({
      where: { role: "apprenant" }
    });

    res.json({
      total,
      administrateurs,
      formateurs,
      apprenants
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Erreur lors du calcul des statistiques."
    });
  }
};

const obtenirUtilisateur = async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findByPk(req.params.id, {
      attributes: { exclude: ["pwd"] }
    });

    if (!utilisateur) {
      return res.status(404).json({
        message: "Utilisateur introuvable."
      });
    }

    res.json(utilisateur);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération de l'utilisateur."
    });
  }
};

const ajouterUtilisateur = async (req, res) => {
  try {
    const { nom, prenom, email, pwd, role } = req.body;

    if (!nom?.trim() || !prenom?.trim() || !email?.trim() || !pwd || !role) {
      return res.status(400).json({
        message: "Tous les champs sont obligatoires."
      });
    }

    if (!ROLES.includes(role)) {
      return res.status(400).json({ message: "Rôle invalide." });
    }

    if (pwd.length < 8) {
      return res.status(400).json({
        message: "Le mot de passe doit contenir au moins 8 caractères."
      });
    }

    const emailFinal = email.trim().toLowerCase();

    const existant = await Utilisateur.findOne({
      where: { email: emailFinal }
    });

    if (existant) {
      return res.status(409).json({
        message: "Cette adresse email est déjà utilisée."
      });
    }

    const hash = await bcrypt.hash(pwd, 10);

    const utilisateur = await Utilisateur.create({
      nom: nom.trim(),
      prenom: prenom.trim(),
      email: emailFinal,
      pwd: hash,
      role
    });

    const resultat = utilisateur.toJSON();
    delete resultat.pwd;

    res.status(201).json({
      message: "Utilisateur ajouté avec succès.",
      utilisateur: resultat
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Erreur lors de l'ajout de l'utilisateur."
    });
  }
};

const modifierUtilisateur = async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findByPk(req.params.id);

    if (!utilisateur) {
      return res.status(404).json({
        message: "Utilisateur introuvable."
      });
    }

    const { nom, prenom, email, pwd, role } = req.body;

    if (role && !ROLES.includes(role)) {
      return res.status(400).json({ message: "Rôle invalide." });
    }

    if (email !== undefined) {
      const emailFinal = email.trim().toLowerCase();

      const existant = await Utilisateur.findOne({
        where: {
          email: emailFinal,
          idUtilisateur: { [Op.ne]: utilisateur.idUtilisateur }
        }
      });

      if (existant) {
        return res.status(409).json({
          message: "Cette adresse email est déjà utilisée."
        });
      }
    }

    const modifications = {};

    if (nom !== undefined) modifications.nom = nom.trim();
    if (prenom !== undefined) modifications.prenom = prenom.trim();
    if (email !== undefined) modifications.email = email.trim().toLowerCase();
    if (role !== undefined) modifications.role = role;

    if (pwd) {
      if (pwd.length < 8) {
        return res.status(400).json({
          message: "Le mot de passe doit contenir au moins 8 caractères."
        });
      }

      modifications.pwd = await bcrypt.hash(pwd, 10);
    }

    await utilisateur.update(modifications);

    const resultat = utilisateur.toJSON();
    delete resultat.pwd;

    res.json({
      message: "Utilisateur modifié avec succès.",
      utilisateur: resultat
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Erreur lors de la modification de l'utilisateur."
    });
  }
};

const supprimerUtilisateur = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Identifiant invalide." });
    }

    if (id === req.utilisateur.idUtilisateur) {
      return res.status(400).json({
        message: "Vous ne pouvez pas supprimer votre propre compte."
      });
    }

    const utilisateur = await Utilisateur.findByPk(id);

    if (!utilisateur) {
      return res.status(404).json({
        message: "Utilisateur introuvable."
      });
    }

    if (utilisateur.role === "administrateur") {
      const nombreAdmins = await Utilisateur.count({
        where: { role: "administrateur" }
      });

      if (nombreAdmins <= 1) {
        return res.status(400).json({
          message: "Impossible de supprimer le dernier administrateur."
        });
      }
    }

    await utilisateur.destroy();

    res.json({ message: "Utilisateur supprimé avec succès." });
  } catch (error) {
    console.error(error);
    res.status(409).json({
      message: "Suppression impossible : cet utilisateur possède peut-être des données associées."
    });
  }
};

module.exports = {
  obtenirUtilisateurs,
  obtenirStatistiquesUtilisateurs,
  obtenirUtilisateur,
  ajouterUtilisateur,
  modifierUtilisateur,
  supprimerUtilisateur
};
