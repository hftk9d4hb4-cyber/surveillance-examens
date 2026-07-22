import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { Notice } from "@/components/Notice";
import { createAbsence, deleteAbsence, savePreferences } from "./actions";
export const dynamic = "force-dynamic";
const days = [[1,"Lundi"],[2,"Mardi"],[3,"Mercredi"],[4,"Jeudi"],[5,"Vendredi"]] as const;
const types: Record<string,string> = {VACATION:"Congés",CONFERENCE:"Congrès",TRAINING:"Formation",MISSION:"Mission",PERSONAL:"Indisponibilité personnelle",OTHER:"Autre"};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
 const {user}=await requireUser(); const params=await searchParams;
 const [absences,prefs,assignments]=await Promise.all([
  prisma.teacherAbsence.findMany({where:{userId:user.id},orderBy:{startDate:"asc"}}),
  prisma.teacherPreference.findMany({where:{userId:user.id}}),
  prisma.assignment.findMany({where:{userId:user.id},include:{exam:true,convocation:true},orderBy:{exam:{date:"desc"}},take:100})
 ]);
 const map=new Map(prefs.map(p=>[`${p.weekday}|${p.halfDay}`,p.weight]));
 return <main className="container"><div className="page-header"><div><h1>Mon profil de surveillance</h1><p className="muted">Déclarez vos périodes d'indisponibilité et vos préférences habituelles. Les préférences guident le moteur sans constituer une contrainte absolue.</p></div></div>
 {params.saved&&<Notice type="success">Vos informations ont été enregistrées.</Notice>}{params.error&&<Notice type="error">Les données saisies sont invalides.</Notice>}
 <div className="card"><h2>Périodes d'indisponibilité</h2><form action={createAbsence} className="inline-form"><select name="type" required>{Object.entries(types).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><input name="startDate" type="date" required/><input name="endDate" type="date" required/><input name="comment" placeholder="Commentaire facultatif" maxLength={500}/><button>Ajouter</button></form><div className="table-wrap"><table><thead><tr><th>Type</th><th>Début</th><th>Fin</th><th>Commentaire</th><th></th></tr></thead><tbody>{absences.map(a=><tr key={a.id}><td>{types[a.type]}</td><td>{formatDate(a.startDate)}</td><td>{formatDate(a.endDate)}</td><td>{a.comment||"—"}</td><td><form action={deleteAbsence}><input type="hidden" name="id" value={a.id}/><button className="small secondary">Supprimer</button></form></td></tr>)}{!absences.length&&<tr><td colSpan={5} className="empty">Aucune période déclarée.</td></tr>}</tbody></table></div></div>
 <form action={savePreferences} className="card"><h2>Préférences hebdomadaires</h2><div className="table-wrap"><table><thead><tr><th>Jour</th><th>Matin</th><th>Après-midi</th></tr></thead><tbody>{days.map(([n,label])=><tr key={n}><td>{label}</td>{(["AM","PM"] as const).map(h=><td key={h}><select name={`pref__${n}__${h}`} defaultValue={map.get(`${n}|${h}`)||0}><option value="1">Préféré</option><option value="0">Neutre</option><option value="-1">À éviter</option></select></td>)}</tr>)}</tbody></table></div><div className="actions" style={{marginTop:16}}><button>Enregistrer les préférences</button></div></form>
 <div className="card"><h2>Historique récent</h2><div className="table-wrap"><table><thead><tr><th>Date</th><th>Examen</th><th>Promotion</th><th>Statut</th></tr></thead><tbody>{assignments.map(a=><tr key={a.id}><td>{formatDate(a.exam.date)}</td><td>{a.exam.title}</td><td>{a.exam.promotion}</td><td>{a.convocation?.status||"Affecté"}</td></tr>)}{!assignments.length&&<tr><td colSpan={4} className="empty">Aucune surveillance enregistrée.</td></tr>}</tbody></table></div></div></main>
}
