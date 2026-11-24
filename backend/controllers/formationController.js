
const { Op } = require("sequelize");

const {
  db,
  reponseErreur
} = require("./utilsController");

const Formation = db.Formation;
const Module = db.Module;

const obtenirIdFormateur = (req) => {
  return (
    req.utilisateur?.idUtilisateur ||
    req.user?.idUtilisateur ||
    req.utilisateur?.id ||
    req.user?.id ||
    null
  );
};

const obtenirRole = (req) => {
  return String(
    req.utilisateur?.role || req.user?.role || ""
  ).toLowerCase();
};

const estAdministrateur = (req) => {
  return ["admin", "administrateur"].includes(obtenirRole(req));
};

const verifierAccesFormation = async (req, numFormation) => {
  const formation = await Formation.findByPk(numFormation);

  if (!formation) {
    return {
      autorise: false,
      formation: null,
      statut: 404
    };
  }

  if (estAdministrateur(req)) {
    return {
      autorise: true,
      formation,
      statut: 200
    };
  }

  const idFormateur = obtenirIdFormateur(req);

  if (
    !idFormateur ||
    Number(formation.idFormateur) !== Number(idFormateur)
  ) {
    return {
      autorise: false,
      formation: null,
      statut: 403
    };
  }

  return {
    autorise: true,
    formation,
    statut: 200
  };
};

// AFFICHER LES FORMATIONS
exports.obtenirFormations = async (req, res) => {
  try {
    const {
      search = "",
      page = 1,
      limit = 10
    } = req.query;

    const pageActuelle = Math.max(1, Number(page) || 1);
    const limite = Math.min(100, Math.max(1, Number(limit) || 10));

    const where = {};

    if (!estAdministrateur(req)) {
      const idFormateur = obtenirIdFormateur(req);

      if (!idFormateur) {
        return res.status(401).json({
          message: "Impossible d'identifier le formateur connecté."
        });
      }

      where.idFormateur = idFormateur;
    }

    if (String(search).trim()) {
      where[Op.or] = [
        {
          titre: {
            [Op.like]: `%${String(search).trim()}%`
          }
        },
        {
          description: {
            [Op.like]: `%${String(search).trim()}%`
          }
        }
      ];
    }

    const { count, rows } = await Formation.findAndCountAll({
      where,
      include: [
        {
          model: Module,
          as: "modules",
          attributes: [
            "codeModule",
            "titreModule",
            "descriptionModule",
            "ordre"
          ],
          required: false
        }
      ],
      order: [["numFormation", "DESC"]],
      limit: limite,
      offset: (pageActuelle - 1) * limite,
      distinct: true
    });

    return res.status(200).json({
      formations: rows,
      total: count,
      page: pageActuelle,
      totalPages: Math.ceil(count / limite)
    });
  } catch (error) {
    return reponseErreur(res, error);
  }
};

// STATISTIQUES DES FORMATIONS
exports.obtenirStatistiquesFormations = async (req, res) => {
  try {
    const whereFormation = {};

    if (!estAdministrateur(req)) {
      const idFormateur = obtenirIdFormateur(req);

      if (!idFormateur) {
        return res.status(401).json({
          message: "Impossible d'identifier le formateur connecté."
        });
      }

      whereFormation.idFormateur = idFormateur;
    }

    const formations = await Formation.findAll({
      where: whereFormation,
      attributes: ["numFormation"]
    });

    const idsFormations = formations.map(
      (formation) => formation.numFormation
    );

    const totalFormations = formations.length;

    const totalModules = await Module.count({
      where: {
        numFormation: {
          [Op.in]: idsFormations
        }
      }
    });

    return res.status(200).json({
      totalFormations,
      totalModules
    });
  } catch (error) {
    return reponseErreur(res, error);
  }
};

// AFFICHER UNE FORMATION
exports.obtenirFormation = async (req, res) => {
  try {
    const acces = await verifierAccesFormation(
      req,
      req.params.id
    );

    if (!acces.autorise) {
      return res.status(acces.statut).json({
        message: acces.statut === 404
          ? "Formation introuvable."
          : "Accès refusé à cette formation."
      });
    }

    const formation = await Formation.findByPk(req.params.id, {
      include: [
        {
          model: Module,
          as: "modules",
          attributes: [
            "codeModule",
            "titreModule",
            "descriptionModule",
            "ordre",
            "contenu"
          ],
          required: false
        }
      ]
    });

    return res.status(200).json(formation);
  } catch (error) {
    return reponseErreur(res, error);
  }
};

// AJOUTER UNE FORMATION
exports.ajouterFormation = async (req, res) => {
  try {
    const {
      titre,
      description,
      dateDebut,
      dateFin
    } = req.body;

    const idFormateur = obtenirIdFormateur(req);

    if (!idFormateur) {
      return res.status(401).json({
        message: "Impossible d'identifier le formateur connecté."
      });
    }

    if (!titre || !String(titre).trim()) {
      return res.status(400).json({
        message: "Le nom de la formation est obligatoire."
      });
    }

    if (String(titre).trim().length > 150) {
      return res.status(400).json({
        message: "Le nom ne doit pas dépasser 150 caractères."
      });
    }

    if (
      description &&
      String(description).length > 255
    ) {
      return res.status(400).json({
        message: "La description ne doit pas dépasser 255 caractères."
      });
    }

    if (
      dateDebut &&
      dateFin &&
      new Date(dateFin) < new Date(dateDebut)
    ) {
      return res.status(400).json({
        message: "La date de fin doit être postérieure à la date de début."
      });
    }

    const formation = await Formation.create({
      titre: String(titre).trim(),
      description: description?.trim() || null,
      dateDebut: dateDebut || null,
      dateFin: dateFin || null,
      idFormateur: Number(idFormateur)
    });

    return res.status(201).json({
      message: "Formation créée avec succès.",
      formation
    });
  } catch (error) {
    return reponseErreur(res, error);
  }
};

// MODIFIER UNE FORMATION
exports.modifierFormation = async (req, res) => {
  try {
    const acces = await verifierAccesFormation(
      req,
      req.params.id
    );

    if (!acces.autorise) {
      return res.status(acces.statut).json({
        message: acces.statut === 404
          ? "Formation introuvable."
          : "Modification non autorisée."
      });
    }

    const formation = acces.formation;

    const {
      titre,
      description,
      dateDebut,
      dateFin
    } = req.body;

    const nouveauTitre = titre === undefined
      ? formation.titre
      : String(titre).trim();

    const nouvelleDescription = description === undefined
      ? formation.description
      : description?.trim() || null;

    const nouveauDebut = dateDebut === undefined
      ? formation.dateDebut
      : dateDebut || null;

    const nouvelleFin = dateFin === undefined
      ? formation.dateFin
      : dateFin || null;

    if (!nouveauTitre) {
      return res.status(400).json({
        message: "Le nom de la formation est obligatoire."
      });
    }

    if (nouveauTitre.length > 150) {
      return res.status(400).json({
        message: "Le nom ne doit pas dépasser 150 caractères."
      });
    }

    if (
      nouvelleDescription &&
      nouvelleDescription.length > 255
    ) {
      return res.status(400).json({
        message: "La description ne doit pas dépasser 255 caractères."
      });
    }

    if (
      nouveauDebut &&
      nouvelleFin &&
      new Date(nouvelleFin) < new Date(nouveauDebut)
    ) {
      return res.status(400).json({
        message: "La date de fin doit être postérieure à la date de début."
      });
    }

    formation.titre = nouveauTitre;
    formation.description = nouvelleDescription;
    formation.dateDebut = nouveauDebut;
    formation.dateFin = nouvelleFin;

    await formation.save();

    return res.status(200).json({
      message: "Formation modifiée avec succès.",
      formation
    });
  } catch (error) {
    return reponseErreur(res, error);
  }
};

// SUPPRIMER UNE FORMATION
exports.supprimerFormation = async (req, res) => {
  try {
    const acces = await verifierAccesFormation(
      req,
      req.params.id
    );

    if (!acces.autorise) {
      return res.status(acces.statut).json({
        message: acces.statut === 404
          ? "Formation introuvable."
          : "Suppression non autorisée."
      });
    }

    await acces.formation.destroy();

    return res.status(200).json({
      message: "Formation supprimée avec succès."
    });
  } catch (error) {
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(409).json({
        message: "Impossible de supprimer cette formation : des modules ou certificats y sont associés."
      });
    }

    return reponseErreur(res, error);
  }
};
