import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { createTranslator, createFormatter } from "next-intl";
import { parse } from "@formatjs/icu-messageformat-parser";
import en from "../../messages/en.json";
import ar from "../../messages/ar.json";
import { jobStatusKeys, parseStatusKeys, stageStatusKeys, screeningStageKeys } from "./labels";
import { jobStatusSchema, parseStatusSchema, stageStatusSchema } from "@/lib/schemas/job";
import { screeningStageSchema } from "@/lib/schemas/screening";
import { safeLocale, exportUrl, resolveLocale } from "./locale";
import { routing } from "./routing";
import { errorText } from "./errors";

function leaves(value:object,prefix=""):Record<string,string> {return Object.fromEntries(Object.entries(value).flatMap(([key,v])=>typeof v==="string"?[[prefix+key,v]]:Object.entries(leaves(v,prefix+key+"."))));}
function placeholders(text:string) {const result=new Set<string>();function visit(nodes:ReturnType<typeof parse>){for(const n of nodes){if(n.type!==0&&n.type!==7)result.add(n.value);if("options" in n)Object.values(n.options).forEach(o=>visit(o.value));}}visit(parse(text));return [...result].sort();}
function files(directory:string):string[] {return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(directory,entry.name)):[path.join(directory,entry.name)]).filter(file=>file.endsWith(".tsx"));}
describe("localization",()=>{
  it("keeps catalog keys and ICU placeholders in parity",()=>{const english=leaves(en),arabic=leaves(ar);expect(Object.keys(arabic).sort()).toEqual(Object.keys(english).sort());for(const [key,text] of Object.entries(english))expect(placeholders(arabic[key]),key).toEqual(placeholders(text));});
  it("has professional Arabic text for every message except technical identifiers",()=>{const english=leaves(en),arabic=leaves(ar);const allow=new Set(["candidate.escape","results.npm_run_worker","export.linkedin","common.count_unit","results.rank_label"]);for(const key of Object.keys(english)){if(!allow.has(key)&&/[a-zA-Z]/.test(english[key]))expect(arabic[key],key).toMatch(/[\u0600-\u06ff]/);}});
  it("blocks new raw JSX text and untranslated accessible attributes",()=>{const failures:string[]=[];for(const file of [...files("src/app"),...files("src/components")]){const source=ts.createSourceFile(file,readFileSync(file,"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);function visit(node:ts.Node){if(ts.isJsxText(node)&&/[A-Za-z\u0600-\u06ff]/.test(node.text))failures.push(`${file}: ${node.text.trim()}`);if(ts.isJsxAttribute(node)&&["aria-label","placeholder","title"].includes(node.name.getText(source))&&node.initializer&&ts.isStringLiteral(node.initializer)&&/[A-Za-z\u0600-\u06ff]/.test(node.initializer.text))failures.push(`${file}: ${node.initializer.text}`);ts.forEachChild(node,visit);}visit(source);}expect(failures).toEqual([]);});
  it("covers every DB and screening enum",()=>{for(const [schema,map] of [[jobStatusSchema,jobStatusKeys],[parseStatusSchema,parseStatusKeys],[stageStatusSchema,stageStatusKeys],[screeningStageSchema,screeningStageKeys]] as const)expect(Object.keys(map).sort()).toEqual([...schema.options].sort());});
  it("uses Western digits, Gregorian dates and all Arabic plural categories",()=>{const format=createFormatter({locale:"ar",timeZone:"Asia/Dubai"});expect(format.number(83.85,{numberingSystem:"latn"})).toBe("83.85");const date=format.dateTime(new Date("2026-10-09T00:00:00Z"),{year:"numeric",month:"2-digit",day:"2-digit",numberingSystem:"latn",calendar:"gregory"});expect(date).toContain("2026");expect(date).not.toMatch(/[٠-٩]/);const t=createTranslator({locale:"ar",messages:ar});for(const count of [0,1,2,3,11,100]){const text=t("common.cv_count",{count});expect(text).toContain(String(count));expect(text).not.toMatch(/[٠-٩]/);}});
  it("keeps routing and export language selection explicit",()=>{expect(routing.localePrefix).toBe("always");expect(safeLocale("ar")).toBe("ar");expect(safeLocale("fr")).toBe("en");expect(resolveLocale(undefined,"fr","ar")).toBe("ar");expect(resolveLocale()).toBe("en");expect(exportUrl("/jobs/id/export?scope=all","ar")).toBe("/jobs/id/export?scope=all&locale=ar");});
  it("maps legacy and coded errors without exposing arbitrary diagnostics",()=>{const t=createTranslator({locale:"ar",messages:ar});expect(errorText(t,"Screening job not found")).toBe(ar.errors.JOB_NOT_FOUND);expect(errorText(t,"JOB_NOT_FOUND")).toBe(ar.errors.JOB_NOT_FOUND);expect(errorText(t,"private raw diagnostic")).toBe(ar.errors.UNKNOWN);});
});

it("keeps download handlers outside localization routing", async()=>{
  const { unstable_doesMiddlewareMatch }=await import("next/experimental/testing/server");
  const config={matcher:["/((?!api(?:/|$)|_next|_vercel|export(?:/|$)|jobs/[^/]+/(?:export|files)(?:/|$)|.*\\..*).*)"]};
  for(const url of ["/api/test","/_next/static/test.js","/export/summary/docx","/jobs/id/export","/jobs/id/export/xlsx","/jobs/id/files/cv"]){expect(unstable_doesMiddlewareMatch({config,nextConfig:{},url}),url).toBe(false);}
  for(const url of ["/","/jobs/new","/ar/jobs/id","/en/jobs/id/upload"])expect(unstable_doesMiddlewareMatch({config,nextConfig:{},url}),url).toBe(true);
});
