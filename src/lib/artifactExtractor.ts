import { Artifact } from "../types";

export function extractArtifactsFromMarkdown(content: string, messageId: string): Artifact[] {
  const artifacts: Artifact[] = [];
  // Regex to match code blocks: ```[language] [optional title]\n[code]\n```
  const codeBlockRegex = /```([a-zA-Z0-9_-]+)?(?:\s+([^\n]+))?\n([\s\S]*?)```/g;
  let match;
  let index = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const rawLang = (match[1] || "").toLowerCase().trim();
    const titleAttr = (match[2] || "").trim();
    const code = match[3];

    // REQUIREMENT 6: Preview khusus HANYA untuk HTML saja
    const isHtml =
      ["html", "htm"].includes(rawLang) ||
      (rawLang === "" && code.trim().toLowerCase().startsWith("<!doctype html>")) ||
      (rawLang === "" && code.trim().toLowerCase().startsWith("<html"));

    if (!isHtml) {
      continue;
    }

    const title = titleAttr || `Interactive HTML Preview #${index + 1}`;

    artifacts.push({
      id: `art-${messageId}-${index++}`,
      title,
      language: "html",
      code,
      type: "html",
      createdAt: Date.now(),
    });
  }

  return artifacts;
}
