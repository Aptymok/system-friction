export type HumanReportBlock =
  | { kind: 'heading'; text: string; level: number }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; headers: string[]; rows: string[][] };

export function stripInlineMarkdown(value: string) {
  return value
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\\([*_`[\]()>#+.!-])/g, '$1')
    .trim();
}

function tableCells(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => stripInlineMarkdown(cell.trim()));
}

function isTableDivider(line: string) {
  const cells = tableCells(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, '')));
}

function isPlainHeading(line: string) {
  const cleaned = stripInlineMarkdown(line);
  return cleaned.length > 0
    && cleaned.length < 90
    && /^[A-ZÁÉÍÓÚÑ0-9 /·:_—-]+$/.test(cleaned)
    && /[A-ZÁÉÍÓÚÑ]/.test(cleaned);
}

export function normalizeHumanReport(value: unknown): HumanReportBlock[] {
  const raw = typeof value === 'string' && value.trim()
    ? value.replace(/\r\n?/g, '\n').trim()
    : 'MISSING · no existe cuerpo legible para este reporte.';
  const lines = raw.split('\n');
  const blocks: HumanReportBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = stripInlineMarkdown(paragraph.join(' ').replace(/\s+/g, ' '));
    if (text) blocks.push({ kind: 'paragraph', text });
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    blocks.push({ kind: 'list', items: list });
    list = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    const boldHeading = trimmed.match(/^\*\*([^*]+)\*\*\s*$/);
    if (heading || boldHeading || isPlainHeading(trimmed)) {
      flushParagraph();
      flushList();
      blocks.push({
        kind: 'heading',
        text: stripInlineMarkdown(heading?.[2] ?? boldHeading?.[1] ?? trimmed),
        level: heading?.[1]?.length ?? 4,
      });
      continue;
    }

    if (trimmed.includes('|') && index + 1 < lines.length && isTableDivider(lines[index + 1] ?? '')) {
      flushParagraph();
      flushList();
      const headers = tableCells(trimmed);
      const rows: string[][] = [];
      index += 1;
      while (index + 1 < lines.length) {
        const candidate = lines[index + 1]?.trim() ?? '';
        if (!candidate || !candidate.includes('|')) break;
        rows.push(tableCells(candidate));
        index += 1;
      }
      blocks.push({ kind: 'table', headers, rows });
      continue;
    }

    const listItem = trimmed.match(/^(?:[-*+]\s+|\d+[.)]\s+)(.+)$/);
    if (listItem) {
      flushParagraph();
      list.push(stripInlineMarkdown(listItem[1]));
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function tableRowText(headers: string[], row: string[]) {
  return headers
    .map((header, index) => {
      const value = row[index] ?? '';
      return value ? `${header}: ${value}` : null;
    })
    .filter((value): value is string => Boolean(value))
    .join(' · ');
}

export function humanReportText(value: unknown) {
  return normalizeHumanReport(value)
    .flatMap((block) => {
      if (block.kind === 'heading') return [block.text.toUpperCase()];
      if (block.kind === 'paragraph') return [block.text];
      if (block.kind === 'list') return block.items.map((item) => `• ${item}`);
      if (block.kind === 'table') {
        const rows = block.rows.map((row) => tableRowText(block.headers, row)).filter(Boolean);
        return rows.length ? rows : [block.headers.join(' · ')];
      }
      return [];
    })
    .filter(Boolean)
    .join('\n\n');
}
