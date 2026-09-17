import { emptyMeetingReport, parseMeetingReport, type MeetingReport } from "@/lib/crm/meetings";

const SYSTEM_PROMPT = `Tu es un assistant CRM. Tu transformes des notes de rencontre commerciale (souvent manuscrites, photographiées) en compte-rendu structuré.

Règles STRICTES :
- Ne jamais inventer un fait absent des notes ou de l'image.
- Si un mot, une date, un nom ou une décision est illisible ou incertain, ne le devine pas : mets-le dans "uncertain" et laisse le champ concerné vide.
- Conserve le sens original. Reformule seulement pour la clarté.
- Réponds UNIQUEMENT en JSON valide, sans markdown.

Schéma JSON :
{
  "extracted_text": "transcription fidèle, ou chaîne vide si illisible",
  "summary": "résumé court en français, ou vide",
  "discussed": ["points discutés"],
  "needs": ["besoins du prospect"],
  "feedback": ["retours / feedback"],
  "objections": ["objections ou questions"],
  "decisions": ["décisions prises"],
  "important": ["informations importantes"],
  "next_actions": [
    {
      "text": "action concrète",
      "owner": "personne si mentionnée, sinon null",
      "due": "date ISO YYYY-MM-DD si mentionnée clairement, sinon null",
      "kind": "task | follow_up | meeting | null",
      "uncertain": false
    }
  ],
  "owners": ["personnes responsables mentionnées"],
  "dates": ["dates / échéances mentionnées, en texte"],
  "uncertain": ["éléments illisibles ou à vérifier"]
}

kind pour next_actions :
- "follow_up" si c'est une relance / un rappel
- "meeting" si c'est un prochain rendez-vous
- "task" pour toute autre action (envoyer un document, préparer une offre…)
- null si tu n'es pas sûr`;

export type MeetingAnalysis = {
  extracted_text: string;
  report: MeetingReport;
};

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return JSON.parse(trimmed);
  }
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Réponse IA invalide.");
  return JSON.parse(match[0]);
}

export async function analyzeMeetingNotes(input: {
  images: { mime: string; base64: string }[];
  notes?: string | null;
  context?: { clubName?: string; title?: string; meetingType?: string };
}): Promise<MeetingAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "L’analyse IA n’est pas configurée. Ajoutez OPENAI_API_KEY pour extraire les notes manuscrites."
    );
  }

  const userParts: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: [
        input.context?.clubName ? `Prospect : ${input.context.clubName}` : null,
        input.context?.title ? `Titre : ${input.context.title}` : null,
        input.context?.meetingType ? `Type : ${input.context.meetingType}` : null,
        input.notes?.trim() ? `Notes libres déjà saisies :\n${input.notes.trim()}` : null,
        input.images.length
          ? "Les images suivantes sont des photos de notes manuscrites. Transcris puis structure."
          : "Aucune image. Structure uniquement à partir des notes libres. N'invente rien.",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  for (const image of input.images) {
    userParts.push({
      type: "image_url",
      image_url: { url: `data:${image.mime};base64,${image.base64}` },
    });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MEETING_MODEL || "gpt-4o",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userParts },
      ],
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };

  if (!res.ok) {
    throw new Error(payload.error?.message || "L’analyse des notes a échoué.");
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("L’analyse n’a renvoyé aucun contenu.");

  const parsed = extractJson(content) as Record<string, unknown>;
  const report = parseMeetingReport(parsed);
  return {
    extracted_text: String(parsed.extracted_text ?? "").trim(),
    report: report.summary || report.discussed.length || report.next_actions.length ? report : emptyMeetingReport(),
  };
}
