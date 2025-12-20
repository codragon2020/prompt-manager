export function extractVariables(template: string) {
  const re = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
  const set = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(template))) {
    set.add(m[1]);
  }
  return Array.from(set.values());
}

export function renderTemplate(template: string, vars: Record<string, string>) {
  return template.replace(
    /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g,
    (_full, name) => {
      const v = vars[name];
      return v === undefined ? '' : String(v);
    },
  );
}
