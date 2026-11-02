import { explainAssignment } from "@/lib/assignment-explanation";
export function AssignmentExplanation({ source, details }: { source: string; details: unknown }) {
  return <details><summary>Comprendre cette affectation</summary><ul>{explainAssignment(source, details).map((line, i) => <li key={i}>{line}</li>)}</ul><p className="muted">Ces éléments décrivent le calcul enregistré à l’époque. Le score ne constitue pas une probabilité et ne remplace pas l’arbitrage de la scolarité.</p></details>;
}
