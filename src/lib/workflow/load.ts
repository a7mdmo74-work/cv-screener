import { prisma } from "@/db/client";
import { candidateSchema } from "@/lib/schemas/candidate";
import { parseRubric } from "@/lib/schemas/rubric";
import { workflowSettingsSchema } from "@/lib/schemas/workflow";
export async function loadCandidate(jobId:string,cvId:string) {
  const cv=await prisma.cv.findFirst({where:{id:cvId,jobId},include:{job:true}});
  if(!cv)throw new Error("Candidate not found in this job");
  return {cv,profile:cv.extractionJson?candidateSchema.parse(JSON.parse(cv.extractionJson)):null,rubric:parseRubric(JSON.parse(cv.job.rubricJson)),settings:workflowSettingsSchema.parse(JSON.parse(cv.job.workflowSettingsJson))};
}
