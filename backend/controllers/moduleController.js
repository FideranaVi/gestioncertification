
const { Op } = require("sequelize");
const Module = require("../models/Module");
const Formation = require("../models/Formation");

const obtenirIdFormateur = (req) => {
  return Number(req.utilisateur.idUtilisateur);
};

const obtenirFormationsDuFormateur = async (req) => {
  return Formation.findAll({
    where: {
      idFormateur: obtenirIdFormateur(req)
    },
    order: [["numFormation", "ASC"]]
  });
};

const verifierAccesFormation = async (req, numFormation) => {
  const id = Number(numFormation);

  if (!Number.isInteger(id) || id < 1) {
    return { autorise: false, statut: 400 };
  }

  const formation = await Formation.findOne({
    where: {
      numFormation: id,
      idFormateur: obtenirIdFormateur(req)
    }
  });

  return formation
    ? { autorise: true, formation }
    : { autorise: false, statut: 403 };
};

const validerContenu = (contenu) => {
  if (contenu === null || contenu === undefined || contenu === "") {
    return { valide: true, valeur: null };
  }

  let data = contenu;

  if (typeof contenu === "string") {
    try {
      data = JSON.parse(contenu);
    } catch {
      return {
        valide: false,
        message: "Le contenu doit être un objet JSON valide."
      };
    }
  }

  if (typeof data !== "object" || Array.isArray(data)) {
    return {
      valide: false,
      message: "Le contenu du module est invalide."
    };
  }

  const type = String(data.type || "").toLowerCase().trim();
  const url = typeof data.url === "string" ? data.url.trim() : "";

  if (!["video", "pdf", "url"].includes(type)) {
    return {
      valide: false,
      message: "Le type de contenu doit être video, pdf ou url."
    };
  }

  if (!url) {
    return {
      valide: false,
      message: "Une URL ou un chemin de fichier est obligatoire."
    };
  }

  if (url.length > 2000) {
    return {
      valide: false,
      message: "Le lien du contenu est trop long."
    };
  }

  if (type === "pdf" && url.startsWith("/uploads/")) {
    data.url = url;
  } else {
    try {
      const parsedUrl = new URL(url);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return {
          valide: false,
          message: "Le lien doit utiliser HTTP ou HTTPS."
        };
      }
    } catch {
      return {
        valide: false,
        message: "L'URL du contenu est invalide."
      };
    }
  }

  return {
    valide: true,
    valeur: JSON.stringify({
      type,
      url
    })
  };
};

const reponseErreur = (res, error) => {
  console.error("Erreur gestion des modules :", error);

  return res.status(500).json({
    message: "Une erreur est survenue lors du traitement du module."
  });
};

exports.obtenirFormationsModules = async (req, res) => {
  try {
    const formations = await obtenirFormationsDuFormateur(req);

    return res.status(200).json({ formations });
  } catch (error) {
    return reponseErreur(res, error);
  }
};

exports.obtenirStatistiquesModules = async (req, res) => {
  try {
    const formations = await obtenirFormationsDuFormateur(req);
    const numeros = formations.map((formation) => formation.numFormation);

    const totalModules = numeros.length
      ? await Module.count({
          where: {
            numFormation: { [Op.in]: numeros }
          }
        })
      : 0;

    return res.status(200).json({
      statistiques: {
        totalModules,
        totalFormations: formations.length
      }
    });
  } catch (error) {
    return reponseErreur(res, error);
  }
};

exports.obtenirModules = async (req, res) => {
  try {
    const formations = await obtenirFormationsDuFormateur(req);
    const numeros = formations.map((formation) => formation.numFormation);

    if (numeros.length === 0) {
      return res.status(200).json({ modules: [] });
    }

    const modules = await Module.findAll({
      where: {
        numFormation: { [Op.in]: numeros }
      },
      order: [
        ["numFormation", "ASC"],
        ["ordre", "ASC"],
        ["codeModule", "ASC"]
      ]
    });

    const formationsParId = new Map(
      formations.map((formation) => [
        String(formation.numFormation),
        formation
      ])
    );

    const modulesAvecFormation = modules.map((module) => {
      const donnees = module.toJSON();

      donnees.formation =
        formationsParId.get(String(module.numFormation)) || null;

      return donnees;
    });

    return res.status(200).json({
      modules: modulesAvecFormation
    });
  } catch (error) {
    return reponseErreur(res, error);
  }
};

exports.obtenirModule = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        message: "Identifiant de module invalide."
      });
    }

    const module = await Module.findByPk(id);

    if (!module) {
      return res.status(404).json({
        message: "Module introuvable."
      });
    }

    const acces = await verifierAccesFormation(
      req,
      module.numFormation
    );

    if (!acces.autorise) {
      return res.status(403).json({
        message: "Vous ne pouvez pas consulter ce module."
      });
    }

    return res.status(200).json({ module });
  } catch (error) {
    return reponseErreur(res, error);
  }
};

exports.ajouterModule = async (req, res) => {
  try {
    const {
      titreModule,
      descriptionModule,
      contenu,
      ordre,
      numFormation
    } = req.body;

    if (
      typeof titreModule !== "string" ||
      !titreModule.trim() ||
      numFormation === undefined ||
      numFormation === null ||
      ordre === undefined ||
      !Number.isInteger(Number(ordre)) ||
      Number(ordre) < 1
    ) {
      return res.status(400).json({
        message: "Le titre, l'ordre et la formation sont obligatoires."
      });
    }

    if (titreModule.trim().length > 150) {
      return res.status(400).json({
        message: "Le titre ne doit pas dépasser 150 caractères."
      });
    }

    if (
      descriptionModule !== undefined &&
      descriptionModule !== null &&
      String(descriptionModule).length > 255
    ) {
      return res.status(400).json({
        message: "La description ne doit pas dépasser 255 caractères."
      });
    }

    const acces = await verifierAccesFormation(req, numFormation);

    if (!acces.autorise) {
      return res.status(acces.statut).json({
        message: "Formation introuvable ou accès refusé."
      });
    }

    const resultatContenu = validerContenu(contenu);

    if (!resultatContenu.valide) {
      return res.status(400).json({
        message: resultatContenu.message
      });
    }

    const module = await Module.create({
      titreModule: titreModule.trim(),
      descriptionModule: descriptionModule?.trim() || null,
      contenu: resultatContenu.valeur,
      ordre: Number(ordre),
      numFormation: Number(numFormation)
    });

    return res.status(201).json({
      message: "Module ajouté avec succès.",
      module
    });
  } catch (error) {
    return reponseErreur(res, error);
  }
};

exports.modifierModule = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        message: "Identifiant de module invalide."
      });
    }

    const module = await Module.findByPk(id);

    if (!module) {
      return res.status(404).json({
        message: "Module introuvable."
      });
    }

    const accesActuel = await verifierAccesFormation(
      req,
      module.numFormation
    );

    if (!accesActuel.autorise) {
      return res.status(403).json({
        message: "Modification non autorisée."
      });
    }

    const {
      titreModule,
      descriptionModule,
      contenu,
      ordre,
      numFormation
    } = req.body;

    if (titreModule !== undefined) {
      if (
        typeof titreModule !== "string" ||
        !titreModule.trim() ||
        titreModule.trim().length > 150
      ) {
        return res.status(400).json({
          message: "Le titre est invalide."
        });
      }

      module.titreModule = titreModule.trim();
    }

    if (descriptionModule !== undefined) {
      if (
        descriptionModule !== null &&
        String(descriptionModule).length > 255
      ) {
        return res.status(400).json({
          message: "La description ne doit pas dépasser 255 caractères."
        });
      }

      module.descriptionModule =
        descriptionModule?.trim() || null;
    }

    if (contenu !== undefined) {
      const resultatContenu = validerContenu(contenu);

      if (!resultatContenu.valide) {
        return res.status(400).json({
          message: resultatContenu.message
        });
      }

      module.contenu = resultatContenu.valeur;
    }

    if (ordre !== undefined) {
      if (
        !Number.isInteger(Number(ordre)) ||
        Number(ordre) < 1
      ) {
        return res.status(400).json({
          message: "L'ordre doit être un nombre entier positif."
        });
      }

      module.ordre = Number(ordre);
    }

    if (numFormation !== undefined) {
      if (Number(numFormation) !== Number(module.numFormation)) {
        const nouvelAcces = await verifierAccesFormation(
          req,
          numFormation
        );

        if (!nouvelAcces.autorise) {
          return res.status(nouvelAcces.statut).json({
            message: "Vous ne pouvez pas déplacer ce module vers cette formation."
          });
        }

        module.numFormation = Number(numFormation);
      }
    }

    await module.save();

    return res.status(200).json({
      message: "Module modifié avec succès.",
      module
    });
  } catch (error) {
    return reponseErreur(res, error);
  }
};

exports.supprimerModule = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        message: "Identifiant de module invalide."
      });
    }

    const module = await Module.findByPk(id);

    if (!module) {
      return res.status(404).json({
        message: "Module introuvable."
      });
    }

    const acces = await verifierAccesFormation(
      req,
      module.numFormation
    );

    if (!acces.autorise) {
      return res.status(403).json({
        message: "Suppression non autorisée."
      });
    }

    await module.destroy();

    return res.status(200).json({
      message: "Module supprimé avec succès."
    });
  } catch (error) {
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(409).json({
        message: "Impossible de supprimer ce module : des suivis ou d'autres éléments y sont associés."
      });
    }

    return reponseErreur(res, error);
  }
};
