
const { Op } = require("sequelize");
const { db, obtenirIdUtilisateur } = require("./utilsController");
const sequelize = require("../config/database");
const ActiviteTentative = require("../models/ActiviteTentative");

const { TentativeQuiz } = db;

const TYPES_AUTORISES = [
  "sortie_onglet",
  "sortie_fenetre",
  "page_quittee",
  "retour"
];

const TYPES_SORTIE = [
  "sortie_onglet",
  "sortie_fenetre",
  "page_quittee"
];

const SEUIL_VERIFICATION = 4;

// POST /api/apprenant/tentatives/:idTentative/activite
exports.signalerActivite = async (req, res) => {
  let transaction;

  try {
    const idApprenant = Number(obtenirIdUtilisateur(req));
    const idTentative = Number(req.params.idTentative);
    const type = String(req.body?.type || "");

    if (
      !Number.isInteger(idApprenant) ||
      idApprenant <= 0 ||
      !Number.isInteger(idTentative) ||
      idTentative <= 0
    ) {
      return res.status(400).json({
        message: "Identifiant invalide."
      });
    }

    if (!TYPES_AUTORISES.includes(type)) {
      return res.status(400).json({
        message: "Type d'activité invalide."
      });
    }

    transaction = await sequelize.transaction();

    const tentative = await TentativeQuiz.findOne({
      where: {
        idTentative,
        idApprenant
      },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!tentative) {
      await transaction.rollback();
      transaction = null;

      return res.status(404).json({
        message: "Tentative introuvable."
      });
    }

    if (tentative.statut !== "en_cours") {
      await transaction.rollback();
      transaction = null;

      return res.status(200).json({
        message: "Tentative terminée : activité ignorée.",
        nbSorties: Number(tentative.nbSortiesEcran || 0),
        statutSurveillance: tentative.statutSurveillance
      });
    }

    const maintenant = new Date();

    let dureeSecondes = Number(req.body?.dureeSecondes);

    dureeSecondes =
      Number.isFinite(dureeSecondes) && dureeSecondes >= 0
        ? Math.min(Math.round(dureeSecondes), 86400)
        : null;

    await ActiviteTentative.create(
      {
        idTentative,
        type,
        dateActivite: maintenant,
        dureeSecondes: type === "retour"
          ? dureeSecondes
          : null
      },
      { transaction }
    );

    let nbSorties = Number(tentative.nbSortiesEcran || 0);

    const donneesMiseAJour = {
      derniereActivite: maintenant
    };

    if (TYPES_SORTIE.includes(type)) {
      nbSorties = await ActiviteTentative.count({
        where: {
          idTentative,
          type: {
            [Op.in]: TYPES_SORTIE
          }
        },
        transaction
      });

      donneesMiseAJour.nbSortiesEcran = nbSorties;
      donneesMiseAJour.derniereSortie = maintenant;
      donneesMiseAJour.estEnLigne = false;

      if (
        nbSorties >= SEUIL_VERIFICATION &&
        tentative.statutSurveillance !== "validee" &&
        tentative.statutSurveillance !== "invalidee"
      ) {
        donneesMiseAJour.statutSurveillance = "a_verifier";
      }
    }

    if (type === "retour") {
      donneesMiseAJour.estEnLigne = true;
    }

    await tentative.update(
      donneesMiseAJour,
      { transaction }
    );

    await transaction.commit();
    transaction = null;

    return res.status(201).json({
      message: "Activité enregistrée.",
      idTentative,
      type,
      nbSorties,
      statutSurveillance: tentative.statutSurveillance,
      estEnLigne: tentative.estEnLigne,
      derniereActivite: tentative.derniereActivite
    });

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("Erreur signalerActivite :", error);

    return res.status(500).json({
      message: "Impossible d'enregistrer l'activité.",
      erreur: error.message
    });
  }
};
