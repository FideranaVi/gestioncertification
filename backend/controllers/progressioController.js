
const {
  Formation,
  Module,
  Quiz,
  SuiviFormation,
  SuiviModule
} = require("../models");

const obtenirIdApprenant = (req) => req.utilisateur.idUtilisateur;

const obtenirFormations = async (req, res) => {
  try {
    const idApprenant = obtenirIdApprenant(req);

    const formations = await Formation.findAll({
      order: [["numFormation", "DESC"]]
    });

    const suivis = await SuiviModule.findAll({
      where: { idApprenant }
    });

    const modules = await Module.findAll({
      order: [["ordre", "ASC"]]
    });

    const resultat = formations.map((formation) => {
      const modulesFormation = modules.filter(
        (module) => module.numFormation === formation.numFormation
      );

      const terminees = modulesFormation.filter((module) =>
        suivis.some(
          (suivi) =>
            suivi.codeModule === module.codeModule &&
            suivi.statut === "terminee"
        )
      ).length;

      const total = modulesFormation.length;
      const progression = total === 0
        ? 0
        : Math.round((terminees / total) * 100);

      return {
        ...formation.toJSON(),
        totalModules: total,
        modulesTermines: terminees,
        progression,
        terminee: total > 0 && terminees === total
      };
    });

    return res.json(resultat);
  } catch (error) {
    console.error("Erreur obtenirFormations :", error);
    return res.status(500).json({
      message: "Erreur lors du chargement des formations."
    });
  }
};

const obtenirModules = async (req, res) => {
  try {
    const idApprenant = obtenirIdApprenant(req);

    const modules = await Module.findAll({
      include: [{
        model: Formation,
        as: "formation"
      }],
      order: [
        ["numFormation", "ASC"],
        ["ordre", "ASC"]
      ]
    });

    const suivis = await SuiviModule.findAll({
      where: { idApprenant }
    });

    const resultat = modules.map((module) => {
      const suivi = suivis.find(
        (item) => item.codeModule === module.codeModule
      );

      return {
        ...module.toJSON(),
        terminee: suivi?.statut === "terminee",
        statut: suivi?.statut || "en_cours"
      };
    });

    return res.json(resultat);
  } catch (error) {
    console.error("Erreur obtenirModules :", error);
    return res.status(500).json({
      message: "Erreur lors du chargement des leçons."
    });
  }
};

const obtenirProgression = async (req, res) => {
  try {
    const idApprenant = obtenirIdApprenant(req);
    const numFormation = Number(req.params.id);

    const modules = await Module.findAll({
      where: { numFormation },
      order: [["ordre", "ASC"]]
    });

    const suivis = await SuiviModule.findAll({
      where: { idApprenant }
    });

    const resultat = modules.map((module) => {
      const suivi = suivis.find(
        (item) => item.codeModule === module.codeModule
      );

      return {
        ...module.toJSON(),
        terminee: suivi?.statut === "terminee",
        statut: suivi?.statut || "en_cours"
      };
    });

    const total = resultat.length;
    const terminees = resultat.filter((module) => module.terminee).length;

    return res.json({
      numFormation,
      totalModules: total,
      modulesTermines: terminees,
      progression: total === 0 ? 0 : Math.round((terminees / total) * 100),
      terminee: total > 0 && total === terminees,
      modules: resultat
    });
  } catch (error) {
    console.error("Erreur obtenirProgression :", error);
    return res.status(500).json({
      message: "Erreur lors du chargement de la progression."
    });
  }
};

const terminerLecon = async (req, res) => {
  try {
    const idApprenant = obtenirIdApprenant(req);
    const codeModule = Number(req.params.id);

    const module = await Module.findByPk(codeModule);

    if (!module) {
      return res.status(404).json({
        message: "Leçon introuvable."
      });
    }

    const [suivi] = await SuiviModule.findOrCreate({
      where: {
        idApprenant,
        codeModule
      },
      defaults: {
        idApprenant,
        codeModule,
        statut: "terminee",
        dateFin: new Date()
      }
    });

    if (suivi.statut !== "terminee") {
      await suivi.update({
        statut: "terminee",
        dateFin: new Date()
      });
    }

    const modulesFormation = await Module.findAll({
      where: { numFormation: module.numFormation }
    });

    const suivisFormation = await SuiviModule.findAll({
      where: {
        idApprenant,
        codeModule: modulesFormation.map((item) => item.codeModule),
        statut: "terminee"
      }
    });

    const formationTerminee =
      modulesFormation.length > 0 &&
      suivisFormation.length === modulesFormation.length;

    const [suiviFormation] = await SuiviFormation.findOrCreate({
      where: {
        idApprenant,
        numFormation: module.numFormation
      },
      defaults: {
        idApprenant,
        numFormation: module.numFormation,
        statut: formationTerminee ? "terminee" : "en_cours",
        dateFin: formationTerminee ? new Date() : null
      }
    });

    await suiviFormation.update({
      statut: formationTerminee ? "terminee" : "en_cours",
      dateFin: formationTerminee ? new Date() : null
    });

    return res.json({
      message: "Leçon terminée avec succès.",
      codeModule,
      formationTerminee,
      totalModules: modulesFormation.length,
      modulesTermines: suivisFormation.length,
      progression: Math.round(
        (suivisFormation.length / modulesFormation.length) * 100
      )
    });
  } catch (error) {
    console.error("Erreur terminerLecon :", error);
    return res.status(500).json({
      message: "Erreur lors de l'enregistrement de la leçon."
    });
  }
};

const obtenirQuiz = async (req, res) => {
  try {
    const idApprenant = obtenirIdApprenant(req);

    const quiz = await Quiz.findAll({
      include: [{
        model: Module,
        as: "module",
        include: [{
          model: Formation,
          as: "formation"
        }]
      }],
      order: [["codeQuiz", "DESC"]]
    });

    const modules = await Module.findAll();
    const suivis = await SuiviModule.findAll({
      where: {
        idApprenant,
        statut: "terminee"
      }
    });

    const resultat = quiz.map((item) => {
      const formationId = item.module?.numFormation;

      const modulesFormation = modules.filter(
        (module) => module.numFormation === formationId
      );

      const nombreTermines = modulesFormation.filter((module) =>
        suivis.some(
          (suivi) => suivi.codeModule === module.codeModule
        )
      ).length;

      const debloque =
        modulesFormation.length > 0 &&
        nombreTermines === modulesFormation.length;

      return {
        ...item.toJSON(),
        debloque,
        progressionFormation: modulesFormation.length === 0
          ? 0
          : Math.round(
              (nombreTermines / modulesFormation.length) * 100
            )
      };
    });

    return res.json(resultat);
  } catch (error) {
    console.error("Erreur obtenirQuiz :", error);
    return res.status(500).json({
      message: "Erreur lors du chargement des quiz."
    });
  }
};

const verifierQuizDebloque = async (req, res, next) => {
  try {
    const codeQuiz = Number(req.body.codeQuiz);

    if (!codeQuiz) {
      return res.status(400).json({
        message: "Le code du quiz est obligatoire."
      });
    }

    const quiz = await Quiz.findByPk(codeQuiz, {
      include: [{
        model: Module,
        as: "module"
      }]
    });

    if (!quiz || !quiz.module) {
      return res.status(404).json({
        message: "Quiz introuvable."
      });
    }

    const modules = await Module.findAll({
      where: {
        numFormation: quiz.module.numFormation
      }
    });

    const idApprenant = obtenirIdApprenant(req);

    const suivis = await SuiviModule.findAll({
      where: {
        idApprenant,
        codeModule: modules.map((module) => module.codeModule),
        statut: "terminee"
      }
    });

    if (
      modules.length === 0 ||
      suivis.length !== modules.length
    ) {
      return res.status(403).json({
        message: "Terminez toutes les leçons de cette formation avant de passer le quiz.",
        debloque: false,
        modulesTermines: suivis.length,
        totalModules: modules.length
      });
    }

    next();
  } catch (error) {
    console.error("Erreur verifierQuizDebloque :", error);
    return res.status(500).json({
      message: "Impossible de vérifier le déverrouillage du quiz."
    });
  }
};

const marquerFormationTerminee = async (req, res) => {
  try {
    const idApprenant = obtenirIdApprenant(req);
    const numFormation = Number(req.params.id);

    const modules = await Module.findAll({
      where: { numFormation }
    });

    const suivis = await SuiviModule.findAll({
      where: {
        idApprenant,
        codeModule: modules.map((module) => module.codeModule),
        statut: "terminee"
      }
    });

    if (modules.length === 0 || suivis.length !== modules.length) {
      return res.status(403).json({
        message: "Toutes les leçons doivent être terminées.",
        debloque: false
      });
    }

    const [suivi] = await SuiviFormation.findOrCreate({
      where: {
        idApprenant,
        numFormation
      },
      defaults: {
        idApprenant,
        numFormation,
        statut: "terminee",
        dateFin: new Date()
      }
    });

    await suivi.update({
      statut: "terminee",
      dateFin: new Date()
    });

    return res.json({
      message: "Formation terminée.",
      terminee: true
    });
  } catch (error) {
    console.error("Erreur marquerFormationTerminee :", error);
    return res.status(500).json({
      message: "Erreur lors de la validation de la formation."
    });
  }
};

module.exports = {
  obtenirFormations,
  obtenirModules,
  obtenirProgression,
  terminerLecon,
  obtenirQuiz,
  verifierQuizDebloque,
  marquerFormationTerminee
};
