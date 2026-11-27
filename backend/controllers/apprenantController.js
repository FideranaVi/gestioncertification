const { Op } = require("sequelize");

const {
  Utilisateur,
  Formation,
  Module,
  SuiviFormation,
  SuiviModule,
  Quiz,
  TentativeQuiz,
  Evaluation,
  Certificat
} = require("../models");

// ======================================================
// OUTILS
// ======================================================

const obtenirIdApprenant = (req) =>
  Number(req.utilisateur.idUtilisateur);

const verifierInscription = async (
  idApprenant,
  numFormation
) => {
  return SuiviFormation.findOne({
    where: {
      idApprenant,
      numFormation
    }
  });
};

const obtenirQuizFinalFormation = async (numFormation) => {
  return Quiz.findOne({
    where: {
      numFormation: Number(numFormation),
      typeQuiz: "final"
    },
    order: [["codeQuiz", "DESC"]]
  });
};

// ======================================================
// PROGRESSION DES MODULES
// ======================================================

const calculerProgressionFormation = async (
  idApprenant,
  numFormation
) => {
  const modules = await Module.findAll({
    where: {
      numFormation: Number(numFormation)
    },
    order: [
      ["ordre", "ASC"],
      ["codeModule", "ASC"]
    ]
  });

  const codesModules = modules.map(
    module => Number(module.codeModule)
  );

  const suivisModules = codesModules.length
    ? await SuiviModule.findAll({
        where: {
          idApprenant,
          codeModule: {
            [Op.in]: codesModules
          }
        }
      })
    : [];

  const suivisMap = new Map(
    suivisModules.map(suivi => [
      Number(suivi.codeModule),
      suivi
    ])
  );

  const modulesAvecProgression = modules.map(module => {
    const suivi = suivisMap.get(
      Number(module.codeModule)
    );

    const donnees = module.toJSON();

    return {
      ...donnees,
      suiviModule: suivi ? suivi.toJSON() : null,
      statut: suivi?.statut || "non_commence",
      termine: suivi?.statut === "terminee"
    };
  });

  const totalModules = modulesAvecProgression.length;

  const modulesTermines = modulesAvecProgression.filter(
    module => module.statut === "terminee"
  ).length;

  const progression = totalModules > 0
    ? Math.round(
        (modulesTermines / totalModules) * 100
      )
    : 0;

  const prochainModule =
    modulesAvecProgression.find(
      module => module.statut !== "terminee"
    ) || null;

  return {
    modules: modulesAvecProgression,
    totalModules,
    modulesTermines,
    progression,
    prochainModule,
    tousModulesTermines:
      totalModules > 0 &&
      modulesTermines === totalModules
  };
};

// ======================================================
// AJOUTER LA PROGRESSION AUX FORMATIONS
// ======================================================

const ajouterProgression = async (
  formations,
  suivis,
  idApprenant,
  statutParDefaut = "en_cours"
) => {
  return Promise.all(
    formations.map(async formation => {
      const donnees = formation.toJSON
        ? formation.toJSON()
        : formation;

      const suivi = suivis.find(
        item =>
          Number(item.numFormation) ===
          Number(donnees.numFormation)
      );

      const progression =
        await calculerProgressionFormation(
          idApprenant,
          donnees.numFormation
        );

      return {
        ...donnees,
        modules: progression.modules,
        suivi: suivi ? suivi.toJSON() : null,
        inscrit: Boolean(suivi),
        statut: suivi?.statut || statutParDefaut,
        totalModules: progression.totalModules,
        modulesTermines: progression.modulesTermines,
        progression: progression.progression,
        prochainModule: progression.prochainModule,
        tousModulesTermines:
          progression.tousModulesTermines
      };
    })
  );
};

// ======================================================
// VÉRIFIER LA RÉUSSITE D'UN QUIZ
// ======================================================

const quizReussi = async (idApprenant, quiz) => {
  const tentatives = await TentativeQuiz.findAll({
    where: {
      idApprenant,
      codeQuiz: quiz.codeQuiz,
      statut: "terminee"
    },
    order: [["dateTentative", "DESC"]]
  });

  const seuil = Number(quiz.seuilReussite);

  return tentatives.some(tentative => {
    const score = Number(tentative.score);

    return (
      Number.isFinite(score) &&
      Number.isFinite(seuil) &&
      score >= seuil
    );
  });
};

// ======================================================
// PROFIL APPRENANT
// ======================================================

const obtenirProfil = async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findOne({
      where: {
        idUtilisateur: obtenirIdApprenant(req),
        role: "apprenant"
      },
      attributes: {
        exclude: ["pwd"]
      }
    });

    if (!utilisateur) {
      return res.status(404).json({
        message: "Apprenant introuvable."
      });
    }

    return res.status(200).json({
      utilisateur
    });

  } catch (error) {
    console.error("Erreur profil apprenant :", error);

    return res.status(500).json({
      message: "Erreur lors de la récupération du profil."
    });
  }
};

// ======================================================
// CATALOGUE DES FORMATIONS
// ======================================================

const obtenirCatalogueFormations = async (req, res) => {
  try {
    const idApprenant = obtenirIdApprenant(req);

    const [formations, suivis] = await Promise.all([
      Formation.findAll({
        include: [{
          model: Module,
          as: "modules",
          include: [{
            model: Quiz,
            as: "quizzes",
            required: false
          }]
        }],
        order: [
          ["dateDebut", "DESC"],
          [
            { model: Module, as: "modules" },
            "ordre",
            "ASC"
          ]
        ]
      }),

      SuiviFormation.findAll({
        where: { idApprenant }
      })
    ]);

    const formationsAvecProgression =
      await ajouterProgression(
        formations,
        suivis,
        idApprenant,
        "non_inscrit"
      );

    const numFormations = formations.map(
      formation => Number(formation.numFormation)
    );

    const quizFinaux = numFormations.length
      ? await Quiz.findAll({
          where: {
            typeQuiz: "final",
            numFormation: {
              [Op.in]: numFormations
            }
          }
        })
      : [];

    const resultat = formationsAvecProgression.map(
      formation => {
        const quizFinal = quizFinaux.find(
          quiz =>
            Number(quiz.numFormation) ===
            Number(formation.numFormation)
        );

        return {
          ...formation,
          quizFinal: quizFinal
            ? quizFinal.toJSON()
            : null
        };
      }
    );

    return res.status(200).json({
      formations: resultat
    });

  } catch (error) {
    console.error("Erreur catalogue formations :", error);

    return res.status(500).json({
      message: "Erreur lors de la récupération des formations."
    });
  }
};

// ======================================================
// MES FORMATIONS
// ======================================================

const obtenirFormations = async (req, res) => {
  try {
    const idApprenant = obtenirIdApprenant(req);

    const suivis = await SuiviFormation.findAll({
      where: { idApprenant },
      order: [["dateDebut", "DESC"]]
    });

    const numFormations = suivis.map(
      suivi => Number(suivi.numFormation)
    );

    if (!numFormations.length) {
      return res.status(200).json({
        formations: []
      });
    }

    const formations = await Formation.findAll({
      where: {
        numFormation: {
          [Op.in]: numFormations
        }
      },
      include: [{
        model: Module,
        as: "modules",
        include: [{
          model: Quiz,
          as: "quizzes",
          required: false
        }]
      }],
      order: [
        ["dateDebut", "DESC"],
        [
          { model: Module, as: "modules" },
          "ordre",
          "ASC"
        ]
      ]
    });

    const formationsAvecProgression =
      await ajouterProgression(
        formations,
        suivis,
        idApprenant
      );

    const quizFinaux = await Quiz.findAll({
      where: {
        typeQuiz: "final",
        numFormation: {
          [Op.in]: numFormations
        }
      }
    });

    const resultat = formationsAvecProgression.map(
      formation => {
        const quizFinal = quizFinaux.find(
          quiz =>
            Number(quiz.numFormation) ===
            Number(formation.numFormation)
        );

        return {
          ...formation,
          quizFinal: quizFinal
            ? quizFinal.toJSON()
            : null
        };
      }
    );

    return res.status(200).json({
      formations: resultat
    });

  } catch (error) {
    console.error("Erreur formations apprenant :", error);

    return res.status(500).json({
      message: "Erreur lors de la récupération des formations."
    });
  }
};

// ======================================================
// S'INSCRIRE À UNE FORMATION
// ======================================================

const suivreFormation = async (req, res) => {
  try {
    const idApprenant = obtenirIdApprenant(req);
    const numFormation = Number(req.params.id);

    if (
      !Number.isInteger(numFormation) ||
      numFormation < 1
    ) {
      return res.status(400).json({
        message: "Identifiant de formation invalide."
      });
    }

    const formation = await Formation.findByPk(
      numFormation
    );

    if (!formation) {
      return res.status(404).json({
        message: "Formation introuvable."
      });
    }

    const ancienSuivi = await verifierInscription(
      idApprenant,
      numFormation
    );

    if (ancienSuivi) {
      return res.status(200).json({
        message: "Vous êtes déjà inscrit à cette formation.",
        suivi: ancienSuivi
      });
    }

    const suivi = await SuiviFormation.create({
      idApprenant,
      numFormation,
      statut: "en_cours",
      dateDebut: new Date()
    });

    return res.status(201).json({
      message: "Inscription à la formation réussie.",
      suivi
    });

  } catch (error) {
    console.error("Erreur inscription formation :", error);

    return res.status(500).json({
      message: "Erreur lors de l'inscription à la formation."
    });
  }
};

// ======================================================
// OBTENIR LES MODULES DE L'APPRENANT
// ======================================================

const obtenirModules = async (req, res) => {
  try {
    const idApprenant = obtenirIdApprenant(req);

    const inscriptions = await SuiviFormation.findAll({
      where: { idApprenant },
      attributes: ["numFormation"]
    });

    const numFormations = inscriptions.map(
      suivi => Number(suivi.numFormation)
    );

    if (!numFormations.length) {
      return res.status(200).json({
        modules: [],
        suivisModules: []
      });
    }

    const [modules, suivisModules] = await Promise.all([
      Module.findAll({
        where: {
          numFormation: {
            [Op.in]: numFormations
          }
        },
        include: [{
          model: Formation,
          as: "formation",
          required: false
        }],
        order: [
          ["numFormation", "ASC"],
          ["ordre", "ASC"]
        ]
      }),

      SuiviModule.findAll({
        where: { idApprenant }
      })
    ]);

    const suivisMap = new Map(
      suivisModules.map(suivi => [
        Number(suivi.codeModule),
        suivi
      ])
    );

    const modulesAvecProgression = modules.map(module => {
      const suivi = suivisMap.get(
        Number(module.codeModule)
      );

      return {
        ...module.toJSON(),
        suiviModule: suivi ? suivi.toJSON() : null,
        statut: suivi?.statut || "non_commence",
        termine: suivi?.statut === "terminee",
        progression: suivi?.statut === "terminee"
          ? 100
          : suivi?.statut === "en_cours"
            ? 50
            : 0
      };
    });

    return res.status(200).json({
      modules: modulesAvecProgression,
      suivisModules
    });

  } catch (error) {
    console.error("Erreur modules apprenant :", error);

    return res.status(500).json({
      message: "Erreur lors de la récupération des modules.",
      detail: error.message
    });
  }
};

// ======================================================
// COMMENCER UN MODULE
// ======================================================

const commencerModule = async (req, res) => {
  try {
    const idApprenant = obtenirIdApprenant(req);
    const codeModule = Number(req.params.id);

    if (
      !Number.isInteger(idApprenant) ||
      idApprenant < 1 ||
      !Number.isInteger(codeModule) ||
      codeModule < 1
    ) {
      return res.status(400).json({
        message: "Identifiant de module invalide."
      });
    }

    const module = await Module.findByPk(codeModule);

    if (!module) {
      return res.status(404).json({
        message: "Module introuvable."
      });
    }

    const numFormation = Number(module.numFormation);

    const inscription = await verifierInscription(
      idApprenant,
      numFormation
    );

    if (!inscription) {
      return res.status(403).json({
        message: "Vous devez vous inscrire à cette formation avant de commencer ses modules."
      });
    }

    if (inscription.statut === "terminee") {
      return res.status(400).json({
        message: "Cette formation est déjà terminée."
      });
    }

    let suiviModule = await SuiviModule.findOne({
      where: {
        idApprenant,
        codeModule
      }
    });

    if (!suiviModule) {
      suiviModule = await SuiviModule.create({
        idApprenant,
        codeModule,
        statut: "en_cours",
        dateDebut: new Date(),
        dateFin: null
      });
    }

    const progression = await calculerProgressionFormation(
      idApprenant,
      numFormation
    );

    return res.status(200).json({
      message: "Module ouvert avec succès.",
      module: module.toJSON(),
      suiviModule,
      progression: progression.progression,
      modulesTermines: progression.modulesTermines,
      totalModules: progression.totalModules,
      prochainModule: progression.prochainModule,
      termine: suiviModule.statut === "terminee"
    });

  } catch (error) {
    console.error("Erreur démarrage module :", error);

    return res.status(500).json({
      message: "Erreur lors du démarrage du module.",
      detail: error.message
    });
  }
};

// ======================================================
// TERMINER UN MODULE
// ======================================================

const terminerModule = async (req, res) => {
  try {
    const idApprenant = obtenirIdApprenant(req);
    const codeModule = Number(req.params.id);

    if (
      !Number.isInteger(idApprenant) ||
      idApprenant < 1 ||
      !Number.isInteger(codeModule) ||
      codeModule < 1
    ) {
      return res.status(400).json({
        message: "Identifiant de module invalide."
      });
    }

    const module = await Module.findByPk(codeModule);

    if (!module) {
      return res.status(404).json({
        message: "Module introuvable."
      });
    }

    const numFormation = Number(module.numFormation);

    const inscription = await verifierInscription(
      idApprenant,
      numFormation
    );

    if (!inscription) {
      return res.status(403).json({
        message: "Vous ne suivez pas cette formation."
      });
    }

    if (inscription.statut === "terminee") {
      return res.status(400).json({
        message: "Cette formation est déjà terminée."
      });
    }

    let suiviModule = await SuiviModule.findOne({
      where: {
        idApprenant,
        codeModule
      }
    });

    if (!suiviModule) {
      return res.status(400).json({
        message: "Ouvrez d'abord ce module avant de le terminer."
      });
    }

    if (suiviModule.statut !== "terminee") {
      await suiviModule.update({
        statut: "terminee",
        dateFin: new Date()
      });

      await suiviModule.reload();
    }

    const progression = await calculerProgressionFormation(
      idApprenant,
      numFormation
    );

    const quizFinal = progression.tousModulesTermines
      ? await obtenirQuizFinalFormation(numFormation)
      : null;

    return res.status(200).json({
      message: "Module terminé avec succès.",
      suiviModule,
      codeModule,
      numFormation,
      progression: progression.progression,
      modulesTermines: progression.modulesTermines,
      totalModules: progression.totalModules,
      tousModulesTermines: progression.tousModulesTermines,
      prochainModule: progression.prochainModule,
      dernierModule: progression.tousModulesTermines,
      quizFinalAccessible: progression.tousModulesTermines,
      quizFinalDisponible: Boolean(quizFinal),
      quizFinal: quizFinal
        ? {
            codeQuiz: quizFinal.codeQuiz,
            nomQuiz: quizFinal.nomQuiz
          }
        : null,
      redirect: "/dashboard/apprenant/formations",
      messageFormation: progression.tousModulesTermines
        ? "Félicitations ! Tous les modules sont terminés. Le quiz final est maintenant accessible."
        : "Module validé ! Vous pouvez continuer les autres modules de cette formation."
    });

  } catch (error) {
    console.error("Erreur fin module :", error);

    return res.status(500).json({
      message: "Erreur lors de la validation du module.",
      detail: error.message
    });
  }
};

// ======================================================
// OBTENIR LES QUIZ
// ======================================================

const obtenirQuiz = async (req, res) => {
  try {
    const idApprenant = obtenirIdApprenant(req);

    const inscriptions = await SuiviFormation.findAll({
      where: { idApprenant },
      attributes: ["numFormation"]
    });

    const numFormations = inscriptions.map(
      suivi => Number(suivi.numFormation)
    );

    if (!numFormations.length) {
      return res.status(200).json({
        quiz: []
      });
    }

    const modules = await Module.findAll({
      where: {
        numFormation: {
          [Op.in]: numFormations
        }
      },
      include: [{
        model: Formation,
        as: "formation",
        required: false
      }],
      order: [
        ["numFormation", "ASC"],
        ["ordre", "ASC"]
      ]
    });

    const codesModules = modules.map(
      module => Number(module.codeModule)
    );

    const conditions = [{
      typeQuiz: "final",
      numFormation: {
        [Op.in]: numFormations
      }
    }];

    if (codesModules.length) {
      conditions.push({
        typeQuiz: "module",
        codeModule: {
          [Op.in]: codesModules
        }
      });
    }

    const quizzes = await Quiz.findAll({
      where: {
        [Op.or]: conditions
      },
      order: [["codeQuiz", "ASC"]]
    });

    const quizAvecAcces = await Promise.all(
      quizzes.map(async quiz => {
        const donnees = quiz.toJSON();

        if (quiz.typeQuiz === "final") {
          const numFormation = Number(quiz.numFormation);

          const progression =
            await calculerProgressionFormation(
              idApprenant,
              numFormation
            );

          const formation = await Formation.findByPk(
            numFormation
          );

          donnees.type = "final";
          donnees.accessible =
            progression.tousModulesTermines;
          donnees.progressionFormation =
            progression.progression;
          donnees.formation = formation;
          donnees.modules = progression.modules;

        } else if (quiz.typeQuiz === "module") {
          const module = modules.find(
            item =>
              Number(item.codeModule) ===
              Number(quiz.codeModule)
          );

          const suiviModule = module
            ? await SuiviModule.findOne({
                where: {
                  idApprenant,
                  codeModule: module.codeModule
                }
              })
            : null;

          donnees.type = "module";
          donnees.accessible =
            suiviModule?.statut === "terminee";
          donnees.suiviModule = suiviModule;
          donnees.module = module || null;
        }

        donnees.reussi = await quizReussi(
          idApprenant,
          quiz
        );

        return donnees;
      })
    );

    return res.status(200).json({
      quiz: quizAvecAcces
    });

  } catch (error) {
    console.error("Erreur quiz apprenant :", error);

    return res.status(500).json({
      message: "Erreur lors de la récupération des quiz.",
      detail: error.message
    });
  }
};

// ======================================================
// OBTENIR LES TENTATIVES
// ======================================================

const obtenirTentatives = async (req, res) => {
  try {
    const tentatives = await TentativeQuiz.findAll({
      where: {
        idApprenant: obtenirIdApprenant(req)
      },
      include: [
        {
          model: Quiz,
          as: "quiz",
          required: false,
          include: [{
            model: Module,
            as: "module",
            required: false,
            include: [{
              model: Formation,
              as: "formation",
              required: false
            }]
          }]
        },
        {
          model: Evaluation,
          as: "evaluation",
          required: false
        }
      ],
      order: [["dateTentative", "DESC"]]
    });

    return res.status(200).json({
      tentatives
    });

  } catch (error) {
    console.error("Erreur tentatives apprenant :", error);

    return res.status(500).json({
      message: "Erreur lors de la récupération des tentatives."
    });
  }
};

// ======================================================
// OBTENIR LES CERTIFICATS - CORRIGÉ
// Inclut maintenant apprenant + formateur
// pour que le frontend n'affiche plus "Non renseigné"
// ======================================================

const obtenirCertificats = async (req, res) => {
  try {
    const certificats = await Certificat.findAll({
      where: {
        idApprenant: obtenirIdApprenant(req)
      },
      include: [
        {
          model: Formation,
          as: "formation",
          required: false
        },
        {
          model: Utilisateur,
          as: "apprenant",
          required: false,
          attributes: [
            "idUtilisateur",
            "nom",
            "prenom",
            "email"
          ]
        },
        {
          model: Utilisateur,
          as: "formateur",
          required: false,
          attributes: [
            "idUtilisateur",
            "nom",
            "prenom",
            "email"
          ]
        }
      ],
      order: [["dateObtention", "DESC"]]
    });

    return res.status(200).json({
      certificats
    });

  } catch (error) {
    console.error("Erreur certificats apprenant :", error);

    return res.status(500).json({
      message: "Erreur lors de la récupération des certificats."
    });
  }
};

// ======================================================
// TERMINER UNE FORMATION
// ======================================================

const marquerFormationTerminee = async (req, res) => {
  try {
    const idApprenant = obtenirIdApprenant(req);
    const numFormation = Number(req.params.id);

    if (
      !Number.isInteger(numFormation) ||
      numFormation < 1
    ) {
      return res.status(400).json({
        message: "Identifiant de formation invalide."
      });
    }

    const suivi = await verifierInscription(
      idApprenant,
      numFormation
    );

    if (!suivi) {
      return res.status(404).json({
        message: "Vous ne suivez pas cette formation."
      });
    }

    if (suivi.statut === "terminee") {
      return res.status(200).json({
        message: "Cette formation est déjà terminée.",
        suivi
      });
    }

    const progression =
      await calculerProgressionFormation(
        idApprenant,
        numFormation
      );

    if (!progression.tousModulesTermines) {
      return res.status(400).json({
        message: "Tous les modules doivent être terminés avant le quiz final.",
        progression: progression.progression,
        modulesTermines: progression.modulesTermines,
        totalModules: progression.totalModules
      });
    }

    const quizFinal = await obtenirQuizFinalFormation(
      numFormation
    );

    if (!quizFinal) {
      return res.status(404).json({
        message: "Le quiz final de cette formation est introuvable."
      });
    }

    const reussi = await quizReussi(
      idApprenant,
      quizFinal
    );

    if (!reussi) {
      return res.status(400).json({
        message: "Vous devez réussir le quiz final avant de terminer la formation."
      });
    }

    await suivi.update({
      statut: "terminee",
      dateFin: new Date()
    });

    return res.status(200).json({
      message: "Formation terminée avec succès.",
      suivi
    });

  } catch (error) {
    console.error("Erreur fin formation :", error);

    return res.status(500).json({
      message: "Erreur lors de la validation de la formation.",
      detail: error.message
    });
  }
};

// ======================================================
// DASHBOARD APPRENANT
// ======================================================

const obtenirDashboard = async (req, res) => {
  try {
    const idApprenant = obtenirIdApprenant(req);

    const utilisateur = await Utilisateur.findOne({
      where: {
        idUtilisateur: idApprenant,
        role: "apprenant"
      },
      attributes: {
        exclude: ["pwd"]
      }
    });

    if (!utilisateur) {
      return res.status(404).json({
        message: "Apprenant introuvable."
      });
    }

    const [
      suivis,
      suivisModules,
      tentatives,
      certificats
    ] = await Promise.all([
      SuiviFormation.findAll({
        where: { idApprenant },
        order: [["dateDebut", "DESC"]]
      }),

      SuiviModule.findAll({
        where: { idApprenant }
      }),

      TentativeQuiz.findAll({
        where: { idApprenant },
        include: [{
          model: Quiz,
          as: "quiz",
          required: false,
          include: [{
            model: Module,
            as: "module",
            required: false,
            include: [{
              model: Formation,
              as: "formation",
              required: false
            }]
          }]
        }],
        order: [["dateTentative", "DESC"]]
      }),

      Certificat.findAll({
        where: { idApprenant },
        include: [
          {
            model: Formation,
            as: "formation",
            required: false
          },
          {
            model: Utilisateur,
            as: "apprenant",
            required: false,
            attributes: [
              "idUtilisateur",
              "nom",
              "prenom",
              "email"
            ]
          },
          {
            model: Utilisateur,
            as: "formateur",
            required: false,
            attributes: [
              "idUtilisateur",
              "nom",
              "prenom",
              "email"
            ]
          }
        ],
        order: [["dateObtention", "DESC"]]
      })
    ]);

    const numFormations = suivis.map(
      suivi => Number(suivi.numFormation)
    );

    let formations = [];

    if (numFormations.length) {
      formations = await Formation.findAll({
        where: {
          numFormation: {
            [Op.in]: numFormations
          }
        },
        include: [{
          model: Module,
          as: "modules",
          include: [{
            model: Quiz,
            as: "quizzes",
            required: false
          }]
        }],
        order: [
          ["dateDebut", "DESC"],
          [
            { model: Module, as: "modules" },
            "ordre",
            "ASC"
          ]
        ]
      });
    }

    const formationsAvecProgression =
      await ajouterProgression(
        formations,
        suivis,
        idApprenant
      );

    const modules = formationsAvecProgression.flatMap(
      formation =>
        (formation.modules || []).map(module => ({
          ...module,
          formation: {
            numFormation: formation.numFormation,
            titre: formation.titre
          }
        }))
    );

    const quizModules = modules.flatMap(module =>
      (module.quizzes || [])
        .filter(quiz => quiz.typeQuiz === "module")
        .map(quiz => ({
          ...quiz,
          type: "module",
          accessible: module.statut === "terminee",
          module: {
            codeModule: module.codeModule,
            titreModule: module.titreModule,
            formation: module.formation
          }
        }))
    );

    const quizFinaux = numFormations.length
      ? await Quiz.findAll({
          where: {
            typeQuiz: "final",
            numFormation: {
              [Op.in]: numFormations
            }
          },
          order: [["codeQuiz", "ASC"]]
        })
      : [];

    const quizFinauxAvecAcces = await Promise.all(
      quizFinaux.map(async quiz => {
        const progression =
          await calculerProgressionFormation(
            idApprenant,
            Number(quiz.numFormation)
          );

        const formation =
          formationsAvecProgression.find(
            item =>
              Number(item.numFormation) ===
              Number(quiz.numFormation)
          ) || null;

        return {
          ...quiz.toJSON(),
          type: "final",
          accessible: progression.tousModulesTermines,
          progressionFormation: progression.progression,
          formation
        };
      })
    );

    const quiz = [
      ...quizModules,
      ...quizFinauxAvecAcces
    ];

    const tentativesTerminees = tentatives.filter(
      tentative => tentative.statut === "terminee"
    );

    const reussites = tentativesTerminees.filter(
      tentative => {
        const seuil = Number(
          tentative.quiz?.seuilReussite
        );

        const score = Number(tentative.score);

        return (
          Number.isFinite(seuil) &&
          Number.isFinite(score) &&
          score >= seuil
        );
      }
    );

    const certificatsValides = certificats.filter(
      certificat =>
        certificat.statutCertificat === "validee"
    );

    const formationsTerminees = suivis.filter(
      suivi => suivi.statut === "terminee"
    );

    const modulesTermines = suivisModules.filter(
      suivi => suivi.statut === "terminee"
    );

    return res.status(200).json({
      message: "Dashboard apprenant récupéré avec succès.",

      utilisateur,

      statistiques: {
        nombreFormations: formations.length,
        formationsTerminees: formationsTerminees.length,
        nombreModules: modules.length,
        modulesTermines: modulesTermines.length,
        nombreQuiz: quiz.length,
        nombreTentatives: tentatives.length,
        tentativesTerminees: tentativesTerminees.length,
        nombreReussites: reussites.length,
        nombreCertificats: certificatsValides.length
      },

      formations: formationsAvecProgression,
      modules,
      quiz,
      tentatives,
      certificats,
      suivisModules
    });

  } catch (error) {
    console.error("Erreur dashboard apprenant :", error);

    return res.status(500).json({
      message: "Erreur lors du chargement du dashboard.",
      detail: error.message
    });
  }
};

// ======================================================
// ARRÊTER DE SUIVRE UNE FORMATION
// ======================================================

const arreterSuivreFormation = async (req, res) => {
  try {
    const idApprenant = obtenirIdApprenant(req);
    const numFormation = Number(req.params.id);

    if (
      !Number.isInteger(numFormation) ||
      numFormation < 1
    ) {
      return res.status(400).json({
        message: "Identifiant de formation invalide."
      });
    }

    const suivi = await verifierInscription(
      idApprenant,
      numFormation
    );

    if (!suivi) {
      return res.status(404).json({
        message: "Vous ne suivez pas cette formation."
      });
    }

    const modules = await Module.findAll({
      where: { numFormation },
      attributes: ["codeModule"]
    });

    const codesModules = modules.map(
      module => module.codeModule
    );

    if (codesModules.length) {
      await SuiviModule.destroy({
        where: {
          idApprenant,
          codeModule: {
            [Op.in]: codesModules
          }
        }
      });
    }

    await suivi.destroy();

    return res.status(200).json({
      message: "Vous avez arrêté de suivre cette formation."
    });

  } catch (error) {
    console.error("Erreur désinscription formation :", error);

    return res.status(500).json({
      message: "Impossible d'arrêter de suivre cette formation.",
      detail: error.message
    });
  }
};

module.exports = {
  obtenirProfil,
  obtenirCatalogueFormations,
  obtenirFormations,
  suivreFormation,
  arreterSuivreFormation,
  commencerModule,
  terminerModule,
  marquerFormationTerminee,
  obtenirModules,
  obtenirQuiz,
  obtenirTentatives,
  obtenirCertificats,
  obtenirDashboard
};