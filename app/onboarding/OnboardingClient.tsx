"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { AVATAR_COLORS, type AvatarColorId } from "@/lib/pronoclash/avatar-colors";
import { ui } from "@/lib/design/tokens";

type Team = { id: string; name: string; color: string | null; short_code: string | null };
type Player = { id: string; full_name: string; team_id: string | null };

type OnboardingClientProps = {
  teams: Team[];
  players: Player[];
  deadlineIso: string | null;
  deadlinePassed: boolean;
  nextHint: string | null;
};

type StepId = "pseudo" | "predictions" | "consents";

export function OnboardingClient({
  teams,
  players,
  deadlinePassed,
  nextHint,
}: OnboardingClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<StepId>("pseudo");

  const [username, setUsername] = useState("");
  const [avatarColor, setAvatarColor] = useState<AvatarColorId>(AVATAR_COLORS[0].id);

  const [championTeamId, setChampionTeamId] = useState<string>("");
  const [topScorerId, setTopScorerId] = useState<string>("");

  const [consentTerms, setConsentTerms] = useState(false);
  const [consentMarketingApp, setConsentMarketingApp] = useState(false);
  const [consentPartnerOffers, setConsentPartnerOffers] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredPlayers = useMemo(() => {
    if (!championTeamId) return players;
    return players.filter((p) => !p.team_id || p.team_id === championTeamId);
  }, [players, championTeamId]);

  const canNextPseudo = username.trim().length >= 2;

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          avatarColor,
          championTeamId: championTeamId || null,
          topScorerId: topScorerId || null,
          consentTerms,
          consentMarketingApp,
          consentPartnerOffers,
        }),
      });
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(j?.error ?? "Erreur lors de l'enregistrement.");
        return;
      }
      if (nextHint === "create-league") {
        router.replace("/leagues/new");
      } else {
        router.replace("/dashboard?welcome=1");
      }
    } catch {
      setError("Erreur réseau. Réessaie.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pc-aurora" />
      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <div className="hidden text-xs text-white/40 sm:block">Étape {stepIndex(step) + 1}/3</div>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-2xl flex-1 px-5 pb-12 sm:px-8">
        <StepBar step={step} />
        {step === "pseudo" ? (
          <PseudoStep
            username={username}
            setUsername={setUsername}
            avatarColor={avatarColor}
            setAvatarColor={setAvatarColor}
            onNext={() => setStep("predictions")}
            canNext={canNextPseudo}
          />
        ) : null}
        {step === "predictions" ? (
          <PredictionsStep
            teams={teams}
            players={filteredPlayers}
            championTeamId={championTeamId}
            setChampionTeamId={setChampionTeamId}
            topScorerId={topScorerId}
            setTopScorerId={setTopScorerId}
            deadlinePassed={deadlinePassed}
            onBack={() => setStep("pseudo")}
            onNext={() => setStep("consents")}
          />
        ) : null}
        {step === "consents" ? (
          <ConsentsStep
            consentTerms={consentTerms}
            setConsentTerms={setConsentTerms}
            consentMarketingApp={consentMarketingApp}
            setConsentMarketingApp={setConsentMarketingApp}
            consentPartnerOffers={consentPartnerOffers}
            setConsentPartnerOffers={setConsentPartnerOffers}
            onBack={() => setStep("predictions")}
            onSubmit={submit}
            submitting={submitting}
            error={error}
          />
        ) : null}
      </main>
    </div>
  );
}

function stepIndex(s: StepId): number {
  return s === "pseudo" ? 0 : s === "predictions" ? 1 : 2;
}

function StepBar({ step }: { step: StepId }) {
  const idx = stepIndex(step);
  return (
    <div className="mb-8 flex items-center gap-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors ${
            i <= idx ? "bg-gradient-to-r from-blue-500 to-violet-500" : "bg-white/10"
          }`}
        />
      ))}
    </div>
  );
}

function PseudoStep({
  username,
  setUsername,
  avatarColor,
  setAvatarColor,
  onNext,
  canNext,
}: {
  username: string;
  setUsername: (s: string) => void;
  avatarColor: AvatarColorId;
  setAvatarColor: (c: AvatarColorId) => void;
  onNext: () => void;
  canNext: boolean;
}) {
  const selected = AVATAR_COLORS.find((c) => c.id === avatarColor)!;
  const initials = (username.trim()[0] || "?").toUpperCase();
  return (
    <div className={`${ui.glassCard} p-7 sm:p-9`}>
      <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
        Choisis ton identité
      </h1>
      <p className="mt-2 text-sm text-white/55">
        Visible par tes potes dans les ligues et les classements. Tu pourras la modifier plus tard.
      </p>
      <div className="mt-7 flex flex-col items-center gap-6 sm:flex-row">
        <div
          className={`inline-flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br ${selected.gradient} font-display text-3xl font-bold text-white shadow-[0_15px_40px_-15px_rgba(99,102,241,0.7)]`}
        >
          {initials}
        </div>
        <div className="flex-1">
          <label className={ui.label} htmlFor="ob-username">Ton pseudo</label>
          <input
            id="ob-username"
            type="text"
            className={ui.input}
            placeholder="Ex. ValentinKing"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={24}
            autoFocus
          />
        </div>
      </div>
      <div className="mt-7">
        <div className={ui.label}>Couleur d&apos;avatar</div>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setAvatarColor(c.id)}
              className={`relative aspect-square rounded-xl bg-gradient-to-br ${c.gradient} transition ${
                c.id === avatarColor ? `ring-2 ring-offset-2 ring-offset-[#05060a] ${c.ring}` : ""
              }`}
              aria-label={c.label}
              aria-pressed={c.id === avatarColor}
            />
          ))}
        </div>
      </div>
      <div className="mt-9 flex justify-end">
        <button type="button" disabled={!canNext} onClick={onNext} className={ui.btnPrimary}>
          Continuer
          <svg width="16" height="16" viewBox="0 0 24 24" className="ml-2" fill="none" stroke="currentColor" strokeWidth={2.4}>
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function PredictionsStep({
  teams,
  players,
  championTeamId,
  setChampionTeamId,
  topScorerId,
  setTopScorerId,
  deadlinePassed,
  onBack,
  onNext,
}: {
  teams: Team[];
  players: Player[];
  championTeamId: string;
  setChampionTeamId: (s: string) => void;
  topScorerId: string;
  setTopScorerId: (s: string) => void;
  deadlinePassed: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className={`${ui.glassCard} p-7 sm:p-9`}>
      <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
        Tes prédictions finales
      </h1>
      <p className="mt-2 text-sm text-white/55">
        Le champion du tournoi et le meilleur buteur. C&apos;est gratuit, et ça te
        donne ta participation au concours.
      </p>

      {deadlinePassed ? (
        <p className="mt-5 rounded-xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          La deadline est dépassée. Tes prédictions seront enregistrées en mode
          verrouillé et ne pourront pas être modifiées.
        </p>
      ) : null}

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <div>
          <label className={ui.label} htmlFor="ob-champion">Champion du tournoi</label>
          {teams.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/50">
              Aucune équipe pour le moment. L&apos;admin doit en ajouter dans /admin/teams.
            </p>
          ) : (
            <select
              id="ob-champion"
              className={ui.input}
              value={championTeamId}
              onChange={(e) => setChampionTeamId(e.target.value)}
            >
              <option value="">— Choisir —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className={ui.label} htmlFor="ob-scorer">Meilleur buteur</label>
          {players.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/50">
              Aucun joueur référencé.
            </p>
          ) : (
            <select
              id="ob-scorer"
              className={ui.input}
              value={topScorerId}
              onChange={(e) => setTopScorerId(e.target.value)}
            >
              <option value="">— Choisir —</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="mt-9 flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className={ui.btnGhost}>
          ← Retour
        </button>
        <button type="button" onClick={onNext} className={ui.btnPrimary}>
          Continuer
        </button>
      </div>
    </div>
  );
}

function ConsentsStep({
  consentTerms,
  setConsentTerms,
  consentMarketingApp,
  setConsentMarketingApp,
  consentPartnerOffers,
  setConsentPartnerOffers,
  onBack,
  onSubmit,
  submitting,
  error,
}: {
  consentTerms: boolean;
  setConsentTerms: (v: boolean) => void;
  consentMarketingApp: boolean;
  setConsentMarketingApp: (v: boolean) => void;
  consentPartnerOffers: boolean;
  setConsentPartnerOffers: (v: boolean) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <div className={`${ui.glassCard} p-7 sm:p-9`}>
      <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
        Dernière étape
      </h1>
      <p className="mt-2 text-sm text-white/55">
        On respecte ta boîte mail. Chaque case est séparée et facultative
        (sauf les conditions, requises par la loi).
      </p>
      <div className="mt-7 space-y-3">
        <Consent
          required
          checked={consentTerms}
          onChange={setConsentTerms}
          title="J'accepte les conditions et le règlement du concours"
          body="Je confirme avoir lu et accepté les conditions générales, la politique de confidentialité et le règlement du concours."
        />
        <Consent
          checked={consentMarketingApp}
          onChange={setConsentMarketingApp}
          title="Recevoir les actus de Prono Clash"
          body="Quelques emails par tournoi (rappels, résultats du concours, nouveautés). Désinscription en un clic."
        />
        <Consent
          checked={consentPartnerOffers}
          onChange={setConsentPartnerOffers}
          title="Recevoir des offres de partenaires football sélectionnés"
          body="Notre partage de ton email avec un partenaire sélectionné n'a lieu QUE si tu coches cette case (RGPD)."
        />
      </div>
      {error ? (
        <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}
      <div className="mt-8 flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className={ui.btnGhost}>
          ← Retour
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !consentTerms}
          className={ui.btnPrimary}
        >
          {submitting ? "Enregistrement…" : "Valider mes prédictions"}
        </button>
      </div>
    </div>
  );
}

function Consent({
  required,
  checked,
  onChange,
  title,
  body,
}: {
  required?: boolean;
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  body: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
        checked
          ? "border-blue-400/40 bg-blue-500/5"
          : "border-white/10 bg-white/[0.03] hover:border-white/20"
      }`}
    >
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-blue-500 focus:ring-blue-400"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required={required}
      />
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          {title}
          {required ? (
            <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-200">
              requis
            </span>
          ) : (
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
              optionnel
            </span>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-white/55">{body}</p>
      </div>
    </label>
  );
}
