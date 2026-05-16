import fs from "fs";

export function rewriteRoute(filePath: string, replacementType: string) {
  const content = fs.readFileSync(filePath, "utf-8");

  // reemplazo simple del event type
  const updated = content.replace(
    /type:\s*".*?"/g,
    `type: "${replacementType}"`
  );

  fs.writeFileSync(filePath, updated);
}

export function applyKernelFixes(fixes: any[]) {
  for (const fix of fixes) {
    rewriteRoute(fix.file, fix.suggestedType);
  }
}
