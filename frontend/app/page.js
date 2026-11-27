"use client";

import Link from "next/link";
import { useState } from "react";

const features = [
  {
    icon: "📚",
    title: "Formations structurées",
    description:
      "Explorez des formations organisées en modules et leçons pour apprendre progressivement.",
    color: "bg-[#e7f0fe]",
    number: "01"
  },
  {
    icon: "✍",
    title: "Évaluations interactives",
    description:
      "Testez vos connaissances avec des quiz et suivez vos résultats après chaque évaluation.",
    color: "bg-[#e7f0fe]",
    number: "02"
  },
  {
    icon: "🏆",
    title: "Certifications",
    description:
      "Validez vos acquis et obtenez un certificat à la fin de votre parcours.",
    color: "bg-[#fff4e5]",
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
    <main className="min-h-screen overflow-x-hidden bg-[#f0f2f5] text-slate-800">
      {/* ===== NAV - STYLE FACEBOOK ===== */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
          <Link href="/" className="group flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1877f2] text-xl font-black text-white shadow-md transition group-hover:scale-110">
              L
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
                Learning<span className="text-[#1877f2]"> Pro</span>
              </h1>
              <p className="text- font-semibold uppercase tracking-[0.2em] text-gray-400 sm:text-">
                Learn · Progress · Succeed
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <a href="#accueil" className="rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-[#f0f2f5] hover:text-[#1877f2]">
              Accueil
            </a>
            <a href="#fonctionnalites" className="rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-[#f0f2f5] hover:text-[#1877f2]">
              Fonctionnalités
            </a>
            <a href="#comment" className="rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-[#f0f2f5] hover:text-[#1877f2]">
              Comment ça marche
            </a>
            <a href="#faq" className="rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-[#f0f2f5] hover:text-[#1877f2]">
              FAQ
            </a>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Link href="/connexion" className="rounded-lg bg-[#e7f0fe] px-5 py-2.5 text-sm font-bold text-[#1877f2] transition hover:bg-[#d8e6fd]">
              Se connecter
            </Link>
            <Link href="/inscription" className="like-btn rounded-lg bg-[#1877f2] px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#166fe5]">
              Créer un compte <span className="ml-1">→</span>
            </Link>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl text-slate-800 transition hover:bg-[#f0f2f5] md:hidden"
            aria-label="Ouvrir le menu"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-gray-100 bg-white px-4 py-4 shadow-xl md:hidden">
            <div className="flex flex-col gap-1">
              <a onClick={() => setMenuOpen(false)} href="#accueil" className="rounded-lg px-3 py-3 font-semibold hover:bg-[#f0f2f5]">Accueil</a>
              <a onClick={() => setMenuOpen(false)} href="#fonctionnalites" className="rounded-lg px-3 py-3 font-semibold hover:bg-[#f0f2f5]">Fonctionnalités</a>
              <a onClick={() => setMenuOpen(false)} href="#comment" className="rounded-lg px-3 py-3 font-semibold hover:bg-[#f0f2f5]">Comment ça marche</a>
              <a onClick={() => setMenuOpen(false)} href="#faq" className="rounded-lg px-3 py-3 font-semibold hover:bg-[#f0f2f5]">FAQ</a>
              <Link href="/connexion" className="mt-2 rounded-lg bg-[#e7f0fe] py-3.5 text-center font-bold text-[#1877f2]">Se connecter</Link>
              <Link href="/inscription" className="rounded-lg bg-[#1877f2] py-3.5 text-center font-bold text-white">Créer un compte</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ===== HERO - FACEBOOK ===== */}
      <section id="accueil" className="relative overflow-hidden bg-[#f0f2f5]">
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-16 lg:px-10 lg:py-20">
          <div className="animate-[fadeInUp_0.8s_ease-out]">
            <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-[#d8e6fd] bg-white px-3 py-2 shadow-sm sm:mb-7 sm:px-4">
              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#1877f2]" />
              <span className="text- font-bold uppercase tracking-wider text-[#1877f2] sm:text-xs">
                Votre avenir commence ici
              </span>
            </div>

            <h2 className="text-4xl font-black leading-[1.12] tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-6xl">
              Apprenez.
              <span className="block text-[#1877f2]">Progressez.</span>
              <span className="block">Réussissez.</span>
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:mt-7 sm:text-lg sm:leading-8">
              Développez vos compétences grâce à une plateforme de formation
              en ligne conçue pour apprendre efficacement, évaluer vos acquis
              et valoriser vos connaissances.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:gap-4">
              <Link href="/inscription" className="like-btn group flex w-full items-center justify-center gap-3 rounded-lg bg-[#1877f2] px-6 py-4 font-bold text-white shadow-lg shadow-blue-200 transition duration-300 hover:bg-[#166fe5] sm:w-auto sm:px-8">
                Commencer gratuitement
                <span className="transition group-hover:translate-x-1">→</span>
              </Link>
              <Link href="/connexion" className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-4 font-bold text-slate-700 shadow-sm transition hover:bg-[#f0f2f5] sm:w-auto sm:px-8">
                Se connecter <span>↗</span>
              </Link>
            </div>

            <div className="mt-7 flex flex-col gap-2 text-sm font-medium text-slate-500 sm:mt-10 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
              <span className="flex items-center gap-2">✓ Apprentissage flexible</span>
              <span className="flex items-center gap-2">✓ Suivi de progression</span>
              <span className="flex items-center gap-2">✓ Certifications</span>
            </div>
          </div>

          {/* ===== CARTE APERÇU - POST FACEBOOK ===== */}
          <div className="relative mx-auto w-full max-w-xl animate-[fadeInUp_1s_ease-out]">
            <div className="fb-card relative rounded-2xl border border-gray-200 bg-white p-3 shadow-md sm:p-4">
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-2 pb-4 pt-1 sm:px-3 sm:pb-5 sm:pt-2">
                <div className="min-w-0">
                  <p className="text- font-semibold uppercase tracking-wider text-gray-400 sm:text-xs">ESPACE APPRENANT</p>
                  <h3 className="mt-1 truncate text-lg font-extrabold text-slate-900 sm:text-xl">Mon apprentissage</h3>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e7f0fe] text-lg sm:h-11 sm:w-11 sm:text-xl">🎓</div>
              </div>

              <div className="mt-4 rounded-xl bg-[#1877f2] p-4 text-white sm:mt-5 sm:p-6">
                <p className="text-xs font-medium text-blue-100 sm:text-sm">Continuez votre parcours</p>
                <h3 className="mt-2 text-xl font-extrabold sm:text-2xl">Chaque leçon compte !</h3>
                <p className="mt-2 text-xs text-blue-100 sm:text-sm">Apprenez une nouvelle compétence aujourd&apos;hui.</p>
                <div className="mt-4 flex items-center justify-between gap-3 sm:mt-6">
                  <span className="text-xs font-semibold">Votre prochain objectif</span>
                  <span className="shrink-0 rounded-lg bg-white/20 px-3 py-1 text-xs font-bold">Continuer →</span>
                </div>
              </div>

              <div className="mt-4 sm:mt-6">
                <div className="mb-3 flex items-center justify-between sm:mb-4">
                  <h4 className="font-bold text-slate-900">Votre parcours</h4>
                  <span className="rounded-full bg-[#e7f0fe] px-3 py-1 text-xs font-bold text-[#1877f2]">Exemple</span>
                </div>

                {[
                  { icon: "💻", title: "Développement Web", detail: "Formation en ligne" },
                  { icon: "📊", title: "Évaluation", detail: "Testez vos connaissances" },
                  { icon: "🏆", title: "Certification", detail: "Valorisez vos acquis" }
                ].map((item, index) => (
                  <div key={item.title} className="fb-item mb-3 flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 transition hover:border-[#1877f2] hover:bg-[#f0f2f5] sm:gap-4 sm:p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e7f0fe] text-xl sm:h-12 sm:w-12 sm:text-2xl">{item.icon}</div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-bold text-slate-800">{item.title}</h4>
                      <p className="mt-0.5 text-xs text-gray-500">{item.detail}</p>
                    </div>
                    <span className="shrink-0 text-lg text-[#1877f2]">{index === 2 ? "★" : "→"}</span>
                  </div>
                ))}
              </div>

              {/* Like / Comment / Share comme Facebook */}
              <div className="mt-2 flex items-center justify-around border-t border-gray-100 pt-3 text-sm font-semibold text-gray-500">
                <span className="like-btn flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 transition hover:bg-[#f0f2f5] hover:text-[#1877f2]">👍 J&apos;aime</span>
                <span className="flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 transition hover:bg-[#f0f2f5]">💬 Commenter</span>
                <span className="flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 transition hover:bg-[#f0f2f5]">↗ Partager</span>
              </div>
            </div>

            <div className="absolute -bottom-8 -left-7 hidden animate-bounce rounded-2xl border border-gray-100 bg-white p-4 shadow-xl lg:block">
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

      {/* ===== FONCTIONNALITES ===== */}
      <section id="fonctionnalites" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-10 lg:py-20">
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
          <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#1877f2]">Une plateforme complète</span>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:mt-4 sm:text-3xl md:text-5xl">
            Tout pour réussir votre apprentissage
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">
            Des outils adaptés à chaque étape de votre parcours de formation.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-7 md:grid-cols-3">
          {features.map((item) => (
            <div key={item.title} className="fb-card group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition duration-300 hover:border-[#1877f2] hover:shadow-lg sm:p-8">
              <span className="absolute right-7 top-5 text-5xl font-black text-gray-100 transition group-hover:text-[#e7f0fe]">{item.number}</span>
              <div className={`relative flex h-14 w-14 items-center justify-center rounded-full ${item.color} text-2xl transition duration-300 group-hover:scale-110 sm:h-16 sm:w-16 sm:text-3xl`}>
                {item.icon}
              </div>
              <h3 className="relative mt-6 text-lg font-extrabold text-slate-900 sm:mt-7 sm:text-xl">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-500 sm:mt-4 sm:text-base">{item.description}</p>
              <div className="mt-5 flex items-center gap-2 text-sm font-bold text-[#1877f2] transition group-hover:gap-4 sm:mt-7">
                Découvrir <span>→</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== COMMENT ===== */}
      <section id="comment" className="bg-white py-14 sm:py-20 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="mb-10 text-center sm:mb-16">
            <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#1877f2]">Simple et efficace</span>
            <h2 className="mt-3 text-2xl font-black text-slate-900 sm:mt-4 sm:text-3xl md:text-5xl">
              Votre réussite en trois étapes
            </h2>
          </div>

          <div className="grid gap-4 sm:gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.number} className="fb-card relative rounded-2xl border border-gray-200 bg-[#f0f2f5] p-6 shadow-sm transition duration-300 hover:bg-white hover:shadow-lg sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-black text-[#1877f2]/20 sm:text-5xl">{step.number}</span>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg text-[#1877f2] shadow-sm sm:h-12 sm:w-12 sm:text-xl">
                    {index === 0 ? "👤" : index === 1 ? "📖" : "🎓"}
                  </div>
                </div>
                <h3 className="mt-6 text-lg font-extrabold text-slate-900 sm:mt-7 sm:text-xl">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500 sm:mt-4 sm:text-base">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl bg-[#1877f2] px-5 py-12 text-center shadow-xl sm:px-8 sm:py-16 md:px-16">
          <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full border border-white/10" />
          <div className="absolute -bottom-40 -left-20 h-80 w-80 rounded-full border border-white/10" />
          <div className="relative">
            <span className="text-3xl sm:text-4xl">🚀</span>
            <h2 className="mx-auto mt-5 max-w-3xl text-2xl font-black text-white sm:mt-6 sm:text-3xl md:text-5xl">
              Prêt à développer votre potentiel ?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-blue-100 sm:mt-5 sm:text-base">
              Commencez votre parcours dès aujourd&apos;hui et faites de chaque
              apprentissage une nouvelle opportunité.
            </p>
            <Link href="/inscription" className="like-btn mt-7 inline-flex w-full items-center justify-center gap-3 rounded-lg bg-white px-6 py-4 font-extrabold text-[#1877f2] shadow-lg transition hover:bg-[#f0f2f5] sm:mt-9 sm:w-auto sm:px-8">
              Rejoindre la plateforme <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-8 text-center sm:mb-12">
          <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#1877f2]">Besoin d&apos;aide ?</span>
          <h2 className="mt-3 text-2xl font-black text-slate-900 sm:mt-4 sm:text-3xl md:text-4xl">Questions fréquentes</h2>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {faqs.map((faq, index) => (
            <div key={faq.question} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-[#1877f2]">
              <button
                onClick={() => setActiveFaq(activeFaq === index ? -1 : index)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left text- font-bold text-slate-800 sm:gap-5 sm:p-6 sm:text-base"
                aria-expanded={activeFaq === index}
              >
                {faq.question}
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${activeFaq === index ? "rotate-45 bg-[#1877f2] text-white" : "bg-[#e7f0fe] text-[#1877f2]"}`}>
                  +
                </span>
              </button>
              <div className={`grid transition-all duration-300 ${activeFaq === index ? "grid-rows- opacity-100" : "grid-rows- opacity-0"}`}>
                <div className="overflow-hidden">
                  <p className="px-4 pb-5 text-sm leading-7 text-slate-500 sm:px-6 sm:pb-6 sm:text-base">{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-[#1c1e21] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 md:grid-cols-2 lg:grid-cols-4 lg:px-10">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-black sm:text-2xl">
              Learning<span className="text-[#1877f2]"> Pro</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-gray-400 sm:mt-5">
              Une plateforme dédiée à l&apos;apprentissage, au développement
              des compétences et à la réussite professionnelle.
            </p>
          </div>

          <div>
            <h3 className="font-bold">Navigation</h3>
            <div className="mt-4 flex flex-col gap-3 text-sm text-gray-400 sm:mt-5 sm:gap-4">
              <a href="#accueil" className="transition hover:text-white">Accueil</a>
              <a href="#fonctionnalites" className="transition hover:text-white">Fonctionnalités</a>
              <a href="#comment" className="transition hover:text-white">Comment ça marche</a>
              <a href="#faq" className="transition hover:text-white">FAQ</a>
            </div>
          </div>

          <div>
            <h3 className="font-bold">Votre espace</h3>
            <div className="mt-4 flex flex-col gap-3 text-sm text-gray-400 sm:mt-5 sm:gap-4">
              <Link href="/connexion" className="transition hover:text-white">Se connecter</Link>
              <Link href="/inscription" className="transition hover:text-white">Créer un compte</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-6 text-center text-xs leading-5 text-gray-400">
          © 2026 Learning Pro. Tous droits réservés.
          <span className="mx-2 text-[#1877f2]">|</span>
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

        @keyframes likePop {
          0% { transform: scale(1); }
          40% { transform: scale(1.15); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }

        .like-btn:active {
          animation: likePop 0.35s ease;
        }

        .fb-card:hover {
          animation: likePop 0.35s ease;
        }

        .fb-item:active {
          animation: likePop 0.3s ease;
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