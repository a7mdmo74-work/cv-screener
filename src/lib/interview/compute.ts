import { interviewInputSchema, type InterviewInput } from "@/lib/schemas/workflow";
import { percentage, round } from "@/lib/exam/grading";
export const gradePoints={A:5,B:4,C:3,D:2,E:1} as const;
export function interviewBand(value:number) {return value>=4.5?"Excellent":value>=3.5?"Very Good":value>=2.5?"Good":value>=1.5?"Average":"Poor";}
export function computeInterview(raw:InterviewInput, relevantExcludedItems:number[]=[]) {
  const input=interviewInputSchema.parse(raw);
  const excluded=[2,3,26].filter(n=>!relevantExcludedItems.includes(n));
  const included=input.ratings.filter(r=>!excluded.includes(r.id));
  const totals=input.interviewers.map((_,i)=>input.ratings.reduce((s,r)=>s+gradePoints[r.grades[i]],0));
  const averages=totals.map(t=>round(t/26));
  const mean=(rs:typeof input.ratings)=>rs.length?rs.reduce((s,r)=>s+r.grades.reduce((a,g)=>a+gradePoints[g],0)/r.grades.length,0)/rs.length:0;
  const rawAverage=mean(input.ratings);const compositeMean=mean(included);
  const clusterIds={"Professional conduct": [1,2,3,4,5,6,7,8,9,10,11],"Qualifications":[12,13,14],"Technical and tools":[15,16,18],"Language":[17],"Leadership/teamwork/learning":[19,20,21,22,23,24,25],"Physical":[26]};
  const clusters=Object.fromEntries(Object.entries(clusterIds).map(([key,ids])=>{const rs=included.filter(r=>ids.includes(r.id));return [key,rs.length?round(mean(rs)):null]}));
  const counts={A:0,B:0,C:0,D:0,E:0};input.ratings.forEach(r=>r.grades.forEach(g=>counts[g]++));
  return {totals,averages,rawAverage:round(rawAverage),overallAverage:round(compositeMean),rawPercentage:percentage(rawAverage,5),percentage:percentage(compositeMean,5),band:interviewBand(compositeMean),counts,clusters,excluded,disagreements:input.ratings.filter(r=>r.grades.length===2&&Math.abs(gradePoints[r.grades[0]]-gradePoints[r.grades[1]])>=2).map(r=>r.id),criterionAverages:Object.fromEntries(input.ratings.map(r=>[String(r.id),round(mean([r]))]))};
}
