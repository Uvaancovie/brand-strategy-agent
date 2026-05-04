// ─── CSV ANALYTICS SERVICE ───────────────────────────────────────────
// Parses uploaded CSV files and sends data to Groq for AI-powered
// analytics insights, aligned with the user's brand strategy.

import { groq } from './groq.service';
import { state } from '../store/brandscript.store';
import { FRAMEWORK } from '../config/framework';
import type { ChatMessage } from '../config/framework';

// ─── PARSE CSV ───────────────────────────────────────────────────────

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
  fileName: string;
}

export function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  // Parse header row — handle quoted fields
  const headers = splitCSVLine(lines[0]);

  const rows = lines.slice(1).map(line => {
    const values = splitCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });

  return { headers, rows };
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ─── BUILD COMPACT SUMMARY ───────────────────────────────────────────
// Caps at 80 rows to stay within token limits

function buildCSVSummary(parsed: ParsedCSV): string {
  const preview = parsed.rows.slice(0, 80);
  const headerLine = parsed.headers.join(' | ');
  const rowLines = preview.map(row =>
    parsed.headers.map(h => row[h] ?? '').join(' | ')
  ).join('\n');
  const truncNote = parsed.rowCount > 80
    ? `\n... (showing first 80 of ${parsed.rowCount} rows)`
    : '';

  return `File: ${parsed.fileName} · ${parsed.rowCount} rows · ${parsed.headers.length} columns\n\n${headerLine}\n${rowLines}${truncNote}`;
}

// ─── BUILD BRAND CONTEXT SNIPPET ─────────────────────────────────────

function getBrandContext(): string {
  const business = state.brandscript.name?.tagline || state.brandscript.name?.purpose || '';
  const archetype = state.brandscript.voice?.archetype || '';
  const mission   = state.brandscript.intent?.mission || '';
  const product   = state.brandscript.creation?.product || '';
  return [
    business  && `Business: ${business}`,
    archetype && `Brand Archetype: ${archetype}`,
    mission   && `Mission: ${mission}`,
    product   && `Product/Service: ${product}`,
  ].filter(Boolean).join('\n');
}

// ─── CALL GROQ FOR INSIGHTS ──────────────────────────────────────────

export async function analyseCSVWithGroq(parsed: ParsedCSV): Promise<string> {
  const csvSummary   = buildCSVSummary(parsed);
  const brandContext = getBrandContext();

  const prompt = `You are Brandy, a VMV8 Brand Strategy AI. The user has uploaded a CSV analytics file for you to analyse.

${brandContext ? `## Brand Context\n${brandContext}\n` : ''}

## CSV Data
${csvSummary}

## Your Task
Provide a clear, structured analytics report including:
1. **Data Overview** — what this dataset represents (infer from column names)
2. **Key Metrics Summary** — identify the most important numbers and what they mean
3. **Trends & Patterns** — highlight notable patterns, growth, or anomalies
4. **Top Performers / Worst Performers** — call out the best and worst rows/values
5. **Brand-Aligned Insights** — how these analytics relate to the brand's strategy, mission, or growth
6. **3 Actionable Recommendations** — specific next steps based on the data

Use markdown formatting. Be concise but insightful. If the data looks like social media analytics, website traffic, sales data, or ad performance — say so explicitly and tailor your insights accordingly.`;

  let retries = 2;
  while (retries >= 0) {
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant', // Switched from 70B to 8B to avoid 429 rate limits
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048,
      });
      return completion.choices[0]?.message?.content?.trim() || 'No insights generated.';
    } catch (err: any) {
      if (retries > 0 && (err.message.includes('429') || err.message.includes('rate_limit_exceeded'))) {
        console.warn(`CSV Analysis rate limit hit. Retrying in 3s... (${retries} left)`);
        await new Promise(res => setTimeout(res, 3000));
        retries--;
        continue;
      }
      throw err;
    }
  }
  return 'Failed to generate insights due to rate limits.';
}

// ─── MAIN ENTRY: PROCESS CSV FILE ────────────────────────────────────

export async function processCSVFile(
  file: File,
  onMessage: (msg: ChatMessage) => void,
  onError: (msg: ChatMessage) => void
): Promise<void> {
  if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
    onError({ role: 'agent', content: '⚠️ Please upload a valid `.csv` file.' });
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    onError({ role: 'agent', content: '⚠️ CSV file is too large (max 5 MB). Please upload a smaller file.' });
    return;
  }

  // Show upload acknowledgement
  onMessage({
    role: 'agent',
    content: `📊 **CSV uploaded:** \`${file.name}\`\n\nReading and analysing your data...`,
  });

  try {
    const text = await file.text();
    const { headers, rows } = parseCSV(text);

    if (headers.length === 0 || rows.length === 0) {
      onError({ role: 'agent', content: '⚠️ The CSV appears to be empty or malformed. Please check the file and try again.' });
      return;
    }

    const parsed: ParsedCSV = { headers, rows, rowCount: rows.length, fileName: file.name };
    const insights = await analyseCSVWithGroq(parsed);

    onMessage({
      role: 'agent',
      content: insights,
      quickActions: [
        '📈 Dive deeper into trends',
        '🎯 Map this to our brand strategy',
        '📄 Include these insights in B.I.G Doc',
      ],
    });

  } catch (err) {
    const error = err as Error;
    onError({
      role: 'agent',
      content: `⚠️ **Error analysing CSV**\n\n${error.message || 'Something went wrong. Please try again.'}`,
    });
  }
}
