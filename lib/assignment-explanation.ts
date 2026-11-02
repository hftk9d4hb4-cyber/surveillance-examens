const availabilityLabels: Record<string, string> = { STRONG_AVAILABLE: "Disponibilité forte déclarée", AVAILABLE: "Disponible", WEAK_AVAILABLE: "Disponibilité faible déclarée", UNAVAILABLE: "Indisponibilité enregistrée", NO_RESPONSE: "Aucune réponse au moment du calcul" };
export function explainAssignment(source: string, details: unknown) {
  if (source === "MANUAL") return ["Affectation manuelle : le moteur n’a pas choisi cet enseignant."];
  if (!details || typeof details !== "object" || Array.isArray(details)) return ["Détail du calcul non enregistré pour cette affectation."];
  const d = details as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof d.availability === "string" && availabilityLabels[d.availability]) parts.push(availabilityLabels[d.availability]);
  const labels = { availabilityPoints: "Disponibilité", quotaPoints: "Marge par rapport au quota", fairnessPoints: "Équilibrage de la charge", recencyPoints: "Espacement des surveillances", preferencePoints: "Préférences déclarées" };
  for (const [key, label] of Object.entries(labels)) if (typeof d[key] === "number" && Number.isFinite(d[key])) parts.push(`${label} : ${d[key].toFixed(1)} point(s)`);
  if (typeof d.weightedLoadBefore === "number" && Number.isFinite(d.weightedLoadBefore)) parts.push(`Charge pondérée avant calcul : ${d.weightedLoadBefore.toFixed(1)}`);
  if (typeof d.assignmentWeight === "number" && Number.isFinite(d.assignmentWeight)) parts.push(`Poids de cette surveillance : ${d.assignmentWeight}`);
  return parts.length ? parts : ["Détail du calcul non enregistré pour cette affectation."];
}
