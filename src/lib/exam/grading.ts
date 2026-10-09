import { gradeInputSchema, type GradeInput, type Question, type Blueprint } from "@/lib/schemas/workflow";
export function round(value:number) { return Math.round((value+Number.EPSILON)*100)/100; }
export function percentage(earned:number,possible:number) { return possible ? round(100*earned/possible):0; }
export function normalizeAnswer(value:string) {
  return value.normalize("NFKC").toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g,"").replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-0x6f0)).replace(/[\p{P}\p{S}]/gu," ").replace(/\s+/g," ").trim();
}
export function gradeExam(questions:Question[], blueprint:Blueprint, raw:GradeInput) {
  const input=gradeInputSchema.parse(raw);
  if(Object.keys(input.answers).some(id=>!questions.some(q=>q.id===id)))throw new Error("Unknown question");
  const items=questions.map(q=>{
    const a=input.answers[q.id]; const answer=a?.answer.trim()??"";
    let earned=0;
    if(answer) {
      if(["scenario","journal_entry","case","calculation"].includes(q.type)) {
        if(!a || a.rubricScores.length!==q.rubric.length || q.rubric.length===0) throw new Error(`Confirm rubric scores for ${q.id}`);
        earned=a.rubricScores.reduce((s,p,i)=>{if(p>q.rubric[i].points)throw new Error(`Rubric score exceeds maximum for ${q.id}`);return s+p;},0);
      } else {
        earned=[q.correctAnswer,...q.acceptedAnswers].some(v=>normalizeAnswer(v)===normalizeAnswer(answer))?q.points:0;
      }
    }
    if(a?.override!==null && a?.override!==undefined) {
      if(!a.overrideReason.trim() || a.override>q.points)throw new Error(`Provide a valid override and reason for ${q.id}`);
      earned=a.override;
    }
    return {id:q.id,earned,possible:q.points,result:!answer?"blank" as const:earned===q.points?"correct" as const:earned===0?"wrong" as const:"partial" as const,answer};
  });
  const group=(key:"topic"|"difficulty"|"type")=>{
    const result:Record<string,{earned:number;possible:number;percentage:number}>={};
    questions.forEach((q,i)=>{const g=result[q[key]]??={earned:0,possible:0,percentage:0};g.earned+=items[i].earned;g.possible+=q.points;g.percentage=percentage(g.earned,g.possible);});return result;
  };
  let practicalEarned=0;
  for(const step of blueprint.practical.steps) {
    const rating=input.practical[step.id]; if(!rating || rating.points>step.points)throw new Error(`Confirm practical step ${step.id}`);
    practicalEarned+=rating.points;
  }
  if(Object.keys(input.practical).some(id=>!blueprint.practical.steps.some(s=>s.id===id)))throw new Error("Unknown practical step");
  const rawScore=items.reduce((s,i)=>s+i.earned,0);const maxScore=items.reduce((s,i)=>s+i.possible,0);
  const pointsNeededToPass=Math.max(0,round(maxScore*blueprint.passMark/100-rawScore));
  const uniform=questions.every(q=>q.points===questions[0]?.points);
  return {items,rawScore,maxScore,percentage:percentage(rawScore,maxScore),passMark:blueprint.passMark,passed:rawScore*100>=maxScore*blueprint.passMark,correctCount:items.filter(i=>i.result==="correct").length,wrongCount:items.filter(i=>i.result==="wrong").length,blankCount:items.filter(i=>i.result==="blank").length,partialCount:items.filter(i=>i.result==="partial").length,answersNeededToPass:uniform?Math.ceil(maxScore*blueprint.passMark/100/questions[0].points):null,pointsNeededToPass,topic:group("topic"),difficulty:group("difficulty"),section:group("type"),practical:{earned:practicalEarned,possible:blueprint.practical.steps.reduce((s,i)=>s+i.points,0),percentage:percentage(practicalEarned,blueprint.practical.steps.reduce((s,i)=>s+i.points,0))}};
}
