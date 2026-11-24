
"use client";

import Link from "next/link";
import { useState } from "react";

const features = [
  {
    icon: "📚",
    title: "Formations structurées",
    description:
      "Explorez des formations organisées en modules et leçons pour apprendre progressivement.",
    color: "bg-emerald-50",
    number: "01"
  },
  {
    icon: "✍️",
    title: "Évaluations interactives",
    description:
      "Testez vos connaissances avec des quiz et suivez vos résultats après chaque évaluation.",
    color: "bg-blue-50",
    number: "02"
  },
  {
    icon: "🏆",
    title: "Certifications",
    description:
      "Validez vos acquis et obtenez un certificat à la fin de votre parcours.",
    color: "bg-amber-50",
    number: "03"
  }
];

const steps = [
  {
    number: "01",
    title: "Créez votre compte",
    description: "Inscrivez-vous gratuitement et accédez à votre espace personnel."
  },
  {
    number: "02",
    title: "Apprenez à votre rythme",
    description: "Suivez les formations, consultez les leçons et progressez."
  },
  {
    number: "03",
    title: "Validez vos compétences",
    description: "Passez les évaluations et obtenez vos certifications."
  }
];

const faqs = [
  {
    question: "Comment accéder aux formations ?",
    answer:
      "Créez un compte apprenant, connectez-vous et consultez les formations disponibles depuis votre tableau de bord."
  },
  {
    question: "Puis-je suivre une formation à mon rythme ?",
    answer:
      "Oui ! Vous pouvez consulter les leçons progressivement et retrouver votre avancement dans votre espace apprenant."
  },
  {
    question: "Comment obtenir un certificat ?",
    answer:
      "Terminez les leçons de votre formation, réussissez l'évaluation finale et accédez à votre certificat."
  },
  {
    question: "Qui peut créer des formations ?",
    answer:
      "Les formateurs autorisés peuvent créer des formations, organiser les modules et préparer les évaluations."
  }
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(0);

  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-800">
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-2xl text-white shadow-lg shadow-emerald-200 transition group-hover:rotate-6">
              L
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                Gestion<span className="text-emerald-600">Formation</span>
              </h1>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                Learn · Progress · Succeed
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-9 md:flex">
            <a href="#accueil" className="text-sm font-semibold text-gray-600 transition hover:text-emerald-600">
              Accueil
            </a>
            <a href="#fonctionnalites" className="text-sm font-semibold text-gray-600 transition hover:text-emerald-600">
              Fonctionnalités
            </a>
            <a href="#comment" className="text-sm font-semibold text-gray-600 transition hover:text-emerald-600">
              Comment ça marche
            </a>
            <a href="#faq" className="text-sm font-semibold text-gray-600 transition hover:text-emerald-600">
              FAQ
            </a>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/connexion" className="rounded-xl px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-gray-100">
              Se connecter
            </Link>
            <Link href="/inscription" className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition hover:-translate-y-1 hover:bg-emerald-700">
              Créer un compte <span className="ml-1">→</span>
            </Link>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-2 text-2xl text-slate-800 transition hover:bg-gray-100 md:hidden"
            aria-label="Ouvrir le menu"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-gray-100 bg-white px-6 py-5 shadow-xl md:hidden">
            <div className="flex flex-col gap-4">
              <a onClick={() => setMenuOpen(false)} href="#accueil" className="font-semibold">Accueil</a>
              <a onClick={() => setMenuOpen(false)} href="#fonctionnalites" className="font-semibold">Fonctionnalités</a>
              <a onClick={() => setMenuOpen(false)} href="#comment" className="font-semibold">Comment ça marche</a>
              <a onClick={() => setMenuOpen(false)} href="#faq" className="font-semibold">FAQ</a>
              <Link href="/connexion" className="rounded-xl border border-gray-200 py-3 text-center font-bold">Se connecter</Link>
              <Link href="/inscription" className="rounded-xl bg-emerald-600 py-3 text-center font-bold text-white">Créer un compte</Link>
            </div>
          </div>
        )}
      </nav>

      <section id="accueil" className="relative bg-[#f5faf7]">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[550px] w-[550px] rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-teal-100/50 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 py-20 lg:grid-cols-2 lg:px-10 lg:py-28">
          <div className="animate-[fadeInUp_0.8s_ease-out]">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 shadow-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Votre avenir commence ici
              </span>
            </div>

            <h2 className="max-w-2xl text-5xl font-black leading-[1.12] tracking-tight text-slate-900 md:text-6xl lg:text-[68px]">
              Apprenez.
              <span className="block text-emerald-600">Progressez.</span>
              <span className="block">Réussissez.</span>
            </h2>

            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
              Développez vos compétences grâce à une plateforme de formation
              en ligne conçue pour apprendre efficacement, évaluer vos acquis
              et valoriser vos connaissances.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link href="/inscription" className="group flex items-center justify-center gap-3 rounded-xl bg-emerald-600 px-8 py-4 font-bold text-white shadow-xl shadow-emerald-200 transition duration-300 hover:-translate-y-1 hover:bg-emerald-700 hover:shadow-2xl">
                Commencer gratuitement
                <span className="transition group-hover:translate-x-2">→</span>
              </Link>
              <Link href="/connexion" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-4 font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50">
                Se connecter <span>↗</span>
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-6 text-sm font-medium text-slate-500">
              <span className="flex items-center gap-2">✓ Apprentissage flexible</span>
              <span className="flex items-center gap-2">✓ Suivi de progression</span>
              <span className="flex items-center gap-2">✓ Certifications</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl animate-[fadeInUp_1s_ease-out]">
            <div className="absolute -right-5 -top-8 h-40 w-40 rounded-full bg-emerald-200/60 blur-3xl" />
            <div className="relative rotate-1 rounded-[30px] border border-white bg-white p-4 shadow-2xl shadow-emerald-900/10 transition duration-500 hover:rotate-0">
              <div className="flex items-center justify-between border-b border-gray-100 px-3 pb-5 pt-2">
                <div>
                  <p className="text-xs font-semibold text-gray-400">ESPACE APPRENANT</p>
                  <h3 className="mt-1 text-xl font-extrabold text-slate-900">Mon apprentissage</h3>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-xl">🎓</div>
              </div>

              <div className="mt-5 rounded-2xl bg-emerald-600 p-6 text-white">
                <p className="text-sm font-medium text-emerald-100">Continuez votre parcours</p>
                <h3 className="mt-2 text-2xl font-extrabold">Chaque leçon compte !</h3>
                <p className="mt-2 text-sm text-emerald-100">Apprenez une nouvelle compétence aujourd&apos;hui.</p>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-xs font-semibold">Votre prochain objectif</span>
                  <span className="rounded-lg bg-white/20 px-3 py-1 text-xs font-bold">Continuer →</span>
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="font-bold text-slate-900">Votre parcours</h4>
                  <span className="text-xs font-semibold text-emerald-600">Exemple</span>
                </div>

                {[
                  { icon: "💻", title: "Développement Web", detail: "Formation en ligne" },
                  { icon: "📊", title: "Évaluation", detail: "Testez vos connaissances" },
                  { icon: "🏆", title: "Certification", detail: "Valorisez vos acquis" }
                ].map((item, index) => (
                  <div key={item.title} className="mb-3 flex items-center gap-4 rounded-xl border border-gray-100 p-4 transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl">{item.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800">{item.title}</h4>
                      <p className="mt-1 text-xs text-gray-500">{item.detail}</p>
                    </div>
                    <span className="text-lg text-emerald-600">{index === 2 ? "★" : "→"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute -bottom-8 -left-7 hidden animate-bounce rounded-2xl border border-gray-100 bg-white p-4 shadow-xl sm:block">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-2xl">🏆</div>
                <div>
                  <p className="text-xs text-gray-400">Votre objectif</p>
                  <p className="font-extrabold text-slate-800">Obtenir un certificat</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="fonctionnalites" className="mx-auto max-w-7xl px-6 py-24 lg:px-10">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-600">Une plateforme complète</span>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
            Tout pour réussir votre apprentissage
          </h2>
          <p className="mt-5 leading-7 text-slate-500">
            Des outils adaptés à chaque étape de votre parcours de formation.
          </p>
        </div>

        <div className="grid gap-7 md:grid-cols-3">
          {features.map((item) => (
            <div key={item.title} className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 transition duration-300 hover:-translate-y-3 hover:border-emerald-200 hover:shadow-2xl hover:shadow-emerald-900/10">
              <span className="absolute right-7 top-5 text-5xl font-black text-gray-50 transition group-hover:text-emerald-50">{item.number}</span>
              <div className={`relative flex h-16 w-16 items-center justify-center rounded-2xl ${item.color} text-3xl transition duration-300 group-hover:rotate-6 group-hover:scale-110`}>
                {item.icon}
              </div>
              <h3 className="relative mt-7 text-xl font-extrabold text-slate-900">{item.title}</h3>
              <p className="mt-4 leading-7 text-slate-500">{item.description}</p>
              <div className="mt-7 flex items-center gap-2 text-sm font-bold text-emerald-600 transition group-hover:gap-4">
                Découvrir <span>→</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="comment" className="bg-[#f5faf7] py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="mb-16 text-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-600">Simple et efficace</span>
            <h2 className="mt-4 text-3xl font-black text-slate-900 md:text-5xl">
              Votre réussite en trois étapes
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.number} className="relative rounded-3xl bg-white p-8 shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-5xl font-black text-emerald-100">{step.number}</span>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xl text-emerald-600">
                    {index === 0 ? "👤" : index === 1 ? "📖" : "🎓"}
                  </div>
                </div>
                <h3 className="mt-7 text-xl font-extrabold text-slate-900">{step.title}</h3>
                <p className="mt-4 leading-7 text-slate-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-emerald-700 px-8 py-16 text-center shadow-2xl shadow-emerald-900/20 md:px-16">
          <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full border-[40px] border-white/5" />
          <div className="absolute -bottom-40 -left-20 h-80 w-80 rounded-full border-[40px] border-white/5" />
          <div className="relative">
            <span className="text-4xl">🚀</span>
            <h2 className="mx-auto mt-6 max-w-3xl text-3xl font-black text-white md:text-5xl">
              Prêt à développer votre potentiel ?
            </h2>
            <p className="mx-auto mt-5 max-w-xl leading-7 text-emerald-100">
              Commencez votre parcours dès aujourd&apos;hui et faites de chaque
              apprentissage une nouvelle opportunité.
            </p>
            <Link href="/inscription" className="mt-9 inline-flex items-center gap-3 rounded-xl bg-white px-8 py-4 font-extrabold text-emerald-700 shadow-lg transition hover:-translate-y-1 hover:bg-emerald-50">
              Rejoindre la plateforme <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-4xl px-6 py-20">
        <div className="mb-12 text-center">
          <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-600">Besoin d&apos;aide ?</span>
          <h2 className="mt-4 text-3xl font-black text-slate-900 md:text-4xl">Questions fréquentes</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={faq.question} className="overflow-hidden rounded-2xl border border-gray-100 bg-white transition hover:border-emerald-200">
              <button
                onClick={() => setActiveFaq(activeFaq === index ? -1 : index)}
                className="flex w-full items-center justify-between gap-5 p-6 text-left font-bold text-slate-800"
                aria-expanded={activeFaq === index}
              >
                {faq.question}
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${activeFaq === index ? "rotate-45 bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-600"}`}>
                  +
                </span>
              </button>
              <div className={`grid transition-all duration-300 ${activeFaq === index ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <p className="px-6 pb-6 leading-7 text-slate-500">{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-[#102c23] text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-2 lg:grid-cols-4 lg:px-10">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-black">
              Gestion<span className="text-emerald-400">Formation</span>
            </h2>
            <p className="mt-5 max-w-md leading-7 text-gray-400">
              Une plateforme dédiée à l&apos;apprentissage, au développement
              des compétences et à la réussite professionnelle.
            </p>
          </div>

          <div>
            <h3 className="font-bold">Navigation</h3>
            <div className="mt-5 flex flex-col gap-4 text-sm text-gray-400">
              <a href="#accueil" className="transition hover:text-emerald-400">Accueil</a>
              <a href="#fonctionnalites" className="transition hover:text-emerald-400">Fonctionnalités</a>
              <a href="#comment" className="transition hover:text-emerald-400">Comment ça marche</a>
              <a href="#faq" className="transition hover:text-emerald-400">FAQ</a>
            </div>
          </div>

          <div>
            <h3 className="font-bold">Votre espace</h3>
            <div className="mt-5 flex flex-col gap-4 text-sm text-gray-400">
              <Link href="/connexion" className="transition hover:text-emerald-400">Se connecter</Link>
              <Link href="/inscription" className="transition hover:text-emerald-400">Créer un compte</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 px-6 py-6 text-center text-xs text-gray-400">
          © 2026 GestionFormation. Tous droits réservés.
          <span className="mx-2 text-emerald-500">|</span>
          Conçu pour apprendre et réussir.
        </div>
      </footer>

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(25px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </main>
  );
}
