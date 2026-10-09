import { decisionSchema, type Blueprint, type WorkflowSettings } from "@/lib/schemas/workflow";
import type { z } from "zod";
import { coverageSchema } from "@/lib/schemas/workflow";
import { round } from "@/lib/exam/grading";
export const defaultWeights={junior:{cv:25,exam:40,interview:35},mid:{cv:25,exam:35,interview:40},senior:{cv:20,exam:30,interview:50},lead:{cv:20,exam:25,interview:55}};
export function computeDecision(input:{level:Blueprint["level"];cv:number;exam:number;interview:number;passMark:number;coverage:z.infer<typeof coverageSchema>[];dealBreaker:boolean;title:string;weights?:WorkflowSettings["compositeWeights"]}) {
  for(const value of [input.cv,input.exam,input.interview,input.passMark])if(!Number.isFinite(value)||value<0||value>100)throw new Error("Invalid score");
  const weights=input.weights??defaultWeights[input.level];const sum=weights.cv+weights.exam+weights.interview;
  if(sum<=0)throw new Error("Weights must sum to a positive value");
  const composite=round((input.cv*weights.cv+input.exam*weights.exam+input.interview*weights.interview)/sum);
  const gates:Array<{rule:string;evidence:string[]}>=[];const conditions:string[]=[];
  if(input.exam<input.passMark){gates.push({rule:`Exam below pass mark (${input.passMark}%)`,evidence:["[EXAM]"]});conditions.push(`Retake exam and achieve at least ${input.passMark}% before independent duties`);}
  for(const c of input.coverage)if(c.status!=="Met"){gates.push({rule:`Must-have ${c.status}: ${c.requirement}`,evidence:c.evidence});conditions.push(c.verification||`Verify and demonstrate ${c.requirement} before offer`);}
  if(input.dealBreaker){gates.push({rule:"Explicit deal-breaker confirmed",evidence:["[CV]","[JD]"]});conditions.push("Resolve confirmed deal-breaker before reconsideration");}
  const outcome=input.dealBreaker||composite<40?"Reject":composite<60?"Hold":gates.length?"Conditional hire":composite>=75?"Hire":"Hold";
  return decisionSchema.parse({outcome,composite,weights,conditions,gates,recommendedTitle:input.title,level:input.level});
}
