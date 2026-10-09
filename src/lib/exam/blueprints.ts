import type { Candidate } from "@/lib/schemas/candidate";
import type { Rubric } from "@/lib/schemas/rubric";
import { blueprintSchema, type Blueprint, type WorkflowSettings } from "@/lib/schemas/workflow";

export function selectLevel(years: number, title = ""): Blueprint["level"] {
  if (/lead|chief|manager|director/i.test(title) || years >= 10) return "lead";
  if (years >= 6) return "senior";
  if (years >= 3) return "mid";
  return "junior";
}
const defaults = {
  junior: {questionCount:50,durationMin:60,passMark:60,difficulty:{easy:60,medium:35,hard:5},includesCase:false},
  mid: {questionCount:50,durationMin:75,passMark:65,difficulty:{easy:30,medium:50,hard:20},includesCase:false},
  senior: {questionCount:45,durationMin:90,passMark:70,difficulty:{easy:15,medium:45,hard:40},includesCase:true},
  lead: {questionCount:40,durationMin:100,passMark:75,difficulty:{easy:10,medium:40,hard:50},includesCase:true},
};
export function buildBlueprint(rubric: Rubric, profile: Pick<Candidate,"technicalSkills"|"softwareSystems"|"certifications"|"gaps"|"inconsistencies">, level: Blueprint["level"], overrides: WorkflowSettings["blueprintOverrides"] = {}): Blueprint {
  const base = {...defaults[level],...overrides};
  const topicWeights: Record<string,number> = {};
  for (const topic of rubric.mustHave) topicWeights[topic] = (topicWeights[topic]??0)+2;
  for (const topic of rubric.niceToHave) topicWeights[topic] = (topicWeights[topic]??0)+1;
  if (!Object.keys(topicWeights).length) topicWeights["Role fundamentals"] = 1;
  const allProbes = [...new Set([...profile.technicalSkills,...profile.softwareSystems,...profile.certifications,...profile.gaps,...profile.inconsistencies])];
  const cap = Math.floor(base.questionCount*0.2);
  const system = rubric.mustHave.find(s=>/zoho|sap|quickbooks|oracle|tally|excel|erp|software/i.test(s)) ?? "System specified by the job";
  const steps = ["Create organization","Configure chart of accounts","Create customer and vendor","Create invoice and bill","Record expense","Configure VAT","Reconcile bank","Produce aging report","Produce trial balance","Produce income statement"];
  return blueprintSchema.parse({level,...base,topicWeights,probes:allProbes.slice(0,cap),uncoveredProbes:allProbes.slice(cap),practical:{system,timeLimitMin:45,steps:steps.map((s,i)=>({id:`P${i+1}`,instruction:{en:s,ar:["إنشاء المؤسسة","إعداد دليل الحسابات","إنشاء العميل والمورد","إنشاء فاتورة بيع وشراء","تسجيل المصروف","إعداد ضريبة القيمة المضافة","التسوية البنكية","تقرير أعمار الذمم","ميزان المراجعة","قائمة الدخل"][i]},points:5,evidence:`Demonstrate ${s.toLowerCase()} correctly in ${system}`}))}});
}
export function allocate(total:number, weights:Record<string,number>):Record<string,number> {
  const sum=Object.values(weights).reduce((a,b)=>a+b,0);
  const entries=Object.entries(weights).map(([key,w])=>({key,exact:total*w/sum,n:Math.floor(total*w/sum)}));
  let left=total-entries.reduce((a,b)=>a+b.n,0);
  for(const e of [...entries].sort((a,b)=>(b.exact-b.n)-(a.exact-a.n))) if(left-->0)e.n++;
  return Object.fromEntries(entries.map(e=>[e.key,e.n]));
}
