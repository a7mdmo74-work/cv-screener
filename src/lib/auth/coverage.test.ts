import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";
function files(dir: string): string[] { return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(resolve(dir, entry.name)) : [resolve(dir, entry.name)]); }
it("requires authorization before every exported business Server Action", () => {
  const uncovered: string[] = [];
  for (const file of files("src/actions").filter(file => file.endsWith(".ts"))) {
    const text = readFileSync(file, "utf8"); const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    for (const node of source.statements) {
      if (!ts.isFunctionDeclaration(node) || !node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || !node.body) continue;
      if (node.name?.text === "firstRunSetup") { expect(node.body.getText(source)).toContain('h.get("origin") !== authOrigin()'); expect(node.body.getText(source)).toContain("consumeBudget"); continue; }
      const first = node.body.statements[0]?.getText(source);
      if (!first?.includes("await requireRole(")) uncovered.push(`${file}:${node.name?.text}`);
    }
  }
  expect(uncovered).toEqual([]);
});
it("guards every private route handler before reading data", () => {
  const uncovered: string[] = [];
  for (const file of files("src/app").filter(file => file.endsWith("route.ts") && !file.includes("/api/auth/"))) {
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    for (const node of source.statements) if (ts.isFunctionDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) && node.body && !node.body.statements[0]?.getText(source).includes("await routeAccess(")) uncovered.push(file);
  }
  expect(uncovered).toEqual([]);
});
it("keeps all business pages behind the protected layout", () => {
  const publicPages = files("src/app").filter(file => file.endsWith("page.tsx") && !file.includes("/(protected)/")).map(file => file.replace(resolve("src/app"), ""));
  expect(publicPages.sort()).toEqual(["/[locale]/forbidden/page.tsx", "/[locale]/login/page.tsx", "/[locale]/setup/page.tsx"]);
  expect(readFileSync("src/app/[locale]/(protected)/layout.tsx", "utf8")).toContain("await requirePageRole(locale)");
});
it("uses explicit button behavior in credential and account forms", () => {
  for (const file of ["auth-form.tsx", "users-panel.tsx", "password-form.tsx", "profile-form.tsx"]) {
    const path = `src/components/auth/${file}`;
    const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
    function visit(node: ts.Node) {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(source) === "Button") {
        const type = node.attributes.properties.find(attr => ts.isJsxAttribute(attr) && attr.name.getText(source) === "type");
        const hasClick = node.attributes.properties.some(attr => ts.isJsxAttribute(attr) && attr.name.getText(source) === "onClick");
        expect(type?.getText(source), path).toBe(hasClick ? 'type="button"' : 'type="submit"');
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
});
