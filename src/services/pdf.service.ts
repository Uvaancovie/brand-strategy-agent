// ─── PDF GENERATION SERVICE ─────────────────────────────────────────
// Builds a professionally styled B.I.G Doc PDF using jsPDF.
// Black & Orange brand palette. Continuous layout — no blank pages.
// Embeds full BIG Framework reference material alongside user answers.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FRAMEWORK, type BrandScript } from '../config/framework';
import type { MarketData } from './market.service';

// ─── COLOUR PALETTE (Black & Orange) ────────────────────────────────
const C = {
  orange:      [255, 107, 53]  as [number, number, number],
  orangeDark:  [204,  78, 28]  as [number, number, number],
  orangeLight: [255, 140, 97]  as [number, number, number],
  black:       [10,  10,  15]  as [number, number, number],
  darkGray:    [22,  22,  31]  as [number, number, number],
  midGray:     [40,  40,  50]  as [number, number, number],
  lightGray:   [60,  60,  72]  as [number, number, number],
  white:       [255, 255, 255] as [number, number, number],
  textLight:   [230, 230, 235] as [number, number, number],
  textMuted:   [150, 150, 165] as [number, number, number],
};

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM_SAFE = PAGE_H - 22; // footer zone

// ─── BIG FRAMEWORK REFERENCE CONTENT ────────────────────────────────
// Full descriptions from The BIG Framework.md for inline embedding

const ARCHETYPE_DESCRIPTIONS: Record<string, string> = {
  'The Innocent': 'The pure optimist — uncomplicated, trusting, and seeking goodness. Archetone: joy, trust, serenity.',
  'The Sage': 'The seeker of truth — analytical, wise, driven to understand. Archetone: anticipation, trust, serenity.',
  'The Explorer': 'Restless and independent, drawn toward what lies beyond. Archetone: anticipation, interest, joy.',
  'The Outlaw': 'The disruptor — provocative, bold, opposed to broken systems. Archetone: anger, anticipation, disgust.',
  'The Magician': 'The transformer — visionary, catalytic, turning vision into reality. Archetone: anticipation, joy, admiration.',
  'The Hero': 'The champion — courageous, disciplined, proving worth through mastery. Archetone: anticipation, anger, joy.',
  'The Lover': 'The devotee — sensuous, passionate, committed to connection. Archetone: joy, trust, anticipation.',
  'The Jester': 'The playmaker — irreverent, witty, using humor to reveal truth. Archetone: joy, surprise, interest.',
  'The Everyman': 'The relatable companion — unpretentious, reliable, rooted in belonging. Archetone: trust, joy, acceptance.',
  'The Caregiver': 'The nurturer — selfless, empathetic, protecting and serving. Archetone: trust, joy, serenity.',
  'The Ruler': 'The sovereign — commanding, responsible, creating order. Archetone: trust, anticipation, anger.',
  'The Creator': 'The maker — imaginative, expressive, building lasting meaning. Archetone: anticipation, joy, admiration.',
};

const PURPOSE_ARCHETYPES = [
  { group: 'Provide Structure', items: ['The Caregiver — Via Service', 'The Ruler — Via Control', 'The Artist — Via Innovation'] },
  { group: 'Experience Transformation', items: ['The Innocent — Via Safety', 'The Sage — Via Knowledge', 'The Explorer — Via Freedom'] },
  { group: 'Impact & Legacy', items: ['The Outlaw — Via Liberation', 'The Magician — Via Power', 'The Hero — Via Mastery'] },
  { group: 'Create Connection', items: ['The Lover — Via Intimacy', 'The Jester — Via Pleasure', 'The Everyman — Via Belonging'] },
];

const SOLUTION_RANGE = ['Do something new', 'Do something different(ly)', 'Do more (of something)', 'Do less (of something)'];

const STORY_FRAMEWORK = [
  { step: '1. A Character', desc: 'Define the customer\'s desire.' },
  { step: '2. Has a Problem', desc: 'Emotional, physical, philosophical/spiritual levels.' },
  { step: '3. Meets a Guide', desc: 'Present your brand as the guide.' },
  { step: '4. Who Gives Them a Plan', desc: 'Outline the plan or process.' },
  { step: '5. Calls Them to Action', desc: 'Create a compelling call to action.' },
  { step: '6. Helps Avoid Failure', desc: 'Outline the risks of not acting.' },
  { step: '7. Ends in Success', desc: 'Describe the successful resolution.' },
];

const SUPERPOWER_TACTICS = {
  ancient: [
    { name: 'Cost', desc: 'Producing or delivering more cheaply than rivals' },
    { name: 'Quality', desc: 'Superior goods or services that command preference' },
    { name: 'Speed', desc: 'Faster delivery, response, or innovation cycles' },
    { name: 'Access', desc: 'Controlling a scarce resource, location, or channel' },
    { name: 'Scale', desc: 'Size that lowers unit costs or raises barriers' },
    { name: 'Trust', desc: 'Reputation or loyalty that reduces switching' },
    { name: 'Regulation', desc: 'Licenses, patents, or legal barriers' },
  ],
  postDigital: [
    { name: 'Network', desc: 'Value that compounds as more participants join' },
    { name: 'Lock-in', desc: 'Switching costs that trap customers or suppliers' },
    { name: 'Information', desc: 'Knowing something competitors don\'t, sooner' },
    { name: 'Culture', desc: 'Internal capacity to execute better, persistently' },
  ],
};

// ─── HELPERS ────────────────────────────────────────────────────────

function strip(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/`(.*?)`/g, '$1')
    .replace(/^\s*[-*]\s/gm, '• ')
    .replace(/\n{3,}/g, '\n\n');
}

function darkBg(doc: jsPDF): void {
  doc.setFillColor(...C.black);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
}

function newPage(doc: jsPDF): number {
  doc.addPage();
  darkBg(doc);
  return 28;
}

function safeY(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > BOTTOM_SAFE) {
    return newPage(doc);
  }
  return y;
}

function orangeRule(doc: jsPDF, y: number, width?: number): number {
  doc.setDrawColor(...C.orange);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y, MARGIN + (width || CONTENT_W), y);
  return y + 5;
}

function thinRule(doc: jsPDF, y: number): number {
  doc.setDrawColor(...C.midGray);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  return y + 4;
}

function sectionTitle(doc: jsPDF, y: number, title: string, icon?: string): number {
  y = safeY(doc, y, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...C.orange);
  const label = icon ? `${icon}  ${title}` : title;
  doc.text(label, MARGIN, y);
  y += 4;
  return orangeRule(doc, y);
}

function subHeading(doc: jsPDF, y: number, title: string): number {
  y = safeY(doc, y, 14);
  // Orange bullet
  doc.setFillColor(...C.orange);
  doc.rect(MARGIN, y - 3, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.orange);
  doc.text(title, MARGIN + 6, y);
  return y + 6;
}

function bodyText(doc: jsPDF, text: string, y: number, opts?: { muted?: boolean; italic?: boolean; fontSize?: number; maxWidth?: number }): number {
  const cleaned = strip(text);
  const fs = opts?.fontSize || 9;
  const mw = opts?.maxWidth || CONTENT_W;
  doc.setFont('helvetica', opts?.italic ? 'italic' : 'normal');
  doc.setFontSize(fs);
  doc.setTextColor(...(opts?.muted ? C.textMuted : C.textLight));
  const lines = doc.splitTextToSize(cleaned, mw);
  const lh = fs * 0.42;
  for (const line of lines) {
    y = safeY(doc, y, lh + 1);
    doc.text(line, MARGIN, y);
    y += lh;
  }
  return y;
}

function addFooter(doc: jsPDF, pageNum: number, totalPages: number): void {
  const y = PAGE_H - 10;
  doc.setDrawColor(...C.orange);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y - 4, PAGE_W - MARGIN, y - 4);
  doc.setFontSize(7);
  doc.setTextColor(...C.textMuted);
  doc.text('VMV8 — Brand Identity Guiding Document', MARGIN, y);
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W - MARGIN, y, { align: 'right' });
  doc.setTextColor(...C.orange);
  doc.text('Powered by Volcanic Marketing', PAGE_W / 2, y, { align: 'center' });
}

// ─── COVER PAGE ─────────────────────────────────────────────────────

function drawCover(doc: jsPDF, brandName: string, tagline: string, date: string): void {
  darkBg(doc);
  // Top bar
  doc.setFillColor(...C.orange);
  doc.rect(0, 0, PAGE_W, 4, 'F');

  const cx = PAGE_W / 2;

  // Hexagon
  const cy = 85, size = 22;
  doc.setFillColor(...C.orange);
  const pts: number[][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push([cx + size * Math.cos(a), cy + size * Math.sin(a)]);
  }
  for (let i = 1; i < 5; i++) doc.triangle(pts[0][0], pts[0][1], pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 'F');
  const inner = 13;
  doc.setFillColor(...C.black);
  const inn: number[][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    inn.push([cx + inner * Math.cos(a), cy + inner * Math.sin(a)]);
  }
  for (let i = 1; i < 5; i++) doc.triangle(inn[0][0], inn[0][1], inn[i][0], inn[i][1], inn[i + 1][0], inn[i + 1][1], 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.orange);
  doc.text('VMV8', cx, cy + 3.5, { align: 'center' });

  // Title
  doc.setFontSize(30);
  doc.setTextColor(...C.white);
  doc.text('Brand Identity', cx, 130, { align: 'center' });
  doc.text('Guiding Document', cx, 143, { align: 'center' });
  doc.setDrawColor(...C.orange);
  doc.setLineWidth(1);
  doc.line(cx - 45, 149, cx + 45, 149);

  // Brand name
  if (brandName) {
    doc.setFontSize(18);
    doc.setTextColor(...C.orange);
    doc.text(brandName, cx, 165, { align: 'center' });
  }
  if (tagline) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(...C.textMuted);
    doc.text(`"${tagline}"`, cx, 178, { align: 'center' });
  }

  // The 8 sections
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  const sections = FRAMEWORK.map(s => `${s.icon} ${s.label}`).join('   •   ');
  doc.text(sections, cx, 198, { align: 'center' });

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(...C.orangeLight);
  doc.text('Powered by Volcanic Marketing · VMV8 Framework', cx, PAGE_H - 35, { align: 'center' });
  doc.setTextColor(...C.textMuted);
  doc.setFontSize(8);
  doc.text(date, cx, PAGE_H - 27, { align: 'center' });

  doc.setFillColor(...C.orange);
  doc.rect(0, PAGE_H - 4, PAGE_W, 4, 'F');
}

// ─── TABLE OF CONTENTS ──────────────────────────────────────────────

function drawTOC(doc: jsPDF): void {
  let y = newPage(doc);

  y = sectionTitle(doc, y, 'TABLE OF CONTENTS');
  y += 4;

  const items = [
    { num: '01', label: 'Executive Summary' },
    { num: '02', label: 'Strategic Context Summary' },
    { num: '03', label: 'Market Intelligence — Industry Overview' },
    { num: '04', label: 'Market Intelligence — Market Sizing (TAM/SAM/SOM)' },
    { num: '05', label: 'Market Intelligence — Target Market Segmentation' },
    { num: '06', label: 'Market Intelligence — Competitive Positioning' },
    { num: '07', label: 'Market Intelligence — SWOT Analysis' },
    { num: '08', label: 'Market Intelligence — Strategic Recommendations & KPIs' },
    ...FRAMEWORK.map((s, i) => ({ num: String(i + 9).padStart(2, '0'), label: `${s.icon}  ${s.label} — Brand Framework` })),
    { num: String(FRAMEWORK.length + 9).padStart(2, '0'), label: 'VMV8 Competitive Advantage Reference' },
    { num: String(FRAMEWORK.length + 10).padStart(2, '0'), label: 'Archetype Reference Guide' },
  ];

  for (const item of items) {
    y = safeY(doc, y, 9);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...C.orange);
    doc.text(item.num, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.textLight);
    doc.text(item.label, MARGIN + 14, y);
    // dots
    doc.setDrawColor(...C.midGray);
    doc.setLineWidth(0.2);
    const start = MARGIN + 14 + doc.getTextWidth(item.label) + 3;
    for (let dx = start; dx < PAGE_W - MARGIN; dx += 2.5) doc.line(dx, y, dx + 1, y);
    y += 8;
  }
}

// ─── EXECUTIVE SUMMARY ──────────────────────────────────────────────

function drawExecutiveSummary(doc: jsPDF, marketData: MarketData, brandName: string): void {
  let y = newPage(doc);
  y = sectionTitle(doc, y, 'EXECUTIVE SUMMARY');
  y += 2;

  // Brand name callout box
  doc.setFillColor(...C.darkGray);
  doc.roundedRect(MARGIN, y, CONTENT_W, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...C.orange);
  doc.text(brandName || 'Your Brand', MARGIN + 6, y + 9);
  y += 20;

  y = bodyText(doc, marketData.executiveSummary, y);
  y += 6;
  y = thinRule(doc, y);
  y += 2;
  y = bodyText(doc, 'This document synthesizes your brand strategy framework (VMV8) with AI-generated market intelligence to provide a comprehensive brand identity guide. All market data should be validated with primary research.', y, { muted: true, italic: true, fontSize: 8 });
}

// ─── CONTEXT SUMMARY ────────────────────────────────────────────────

function drawContext(doc: jsPDF, contextPayload: string): void {
  let y = newPage(doc);
  y = sectionTitle(doc, y, 'STRATEGIC CONTEXT SUMMARY');
  y += 2;

  if (contextPayload && contextPayload.trim().length > 0) {
    const truncated = contextPayload.length > 3500
      ? contextPayload.slice(0, 3500) + '\n\n[Context truncated — full context available in the application]'
      : contextPayload;
    y = bodyText(doc, truncated, y, { fontSize: 8.5 });
  } else {
    y = bodyText(doc, 'No external context was collected for this brand. Context can be added via transcripts, PDFs, or direct input in the Brandy application.', y, { muted: true, italic: true });
  }
}

// ─── MARKET DATA SECTIONS ───────────────────────────────────────────

function drawMarketSections(doc: jsPDF, marketData: MarketData): void {
  const sections: { title: string; content: string }[] = [
    { title: 'INDUSTRY OVERVIEW', content: marketData.industryOverview },
    { title: 'MARKET SIZING — TAM / SAM / SOM', content: marketData.marketSizing },
    { title: 'TARGET MARKET SEGMENTATION', content: marketData.targetMarketSegmentation },
    { title: 'COMPETITIVE POSITIONING', content: marketData.competitivePositioning },
    { title: 'SWOT ANALYSIS', content: marketData.swotAnalysis },
  ];

  for (const section of sections) {
    let y = newPage(doc);
    y = sectionTitle(doc, y, section.title);
    y += 2;
    y = bodyText(doc, section.content, y);
  }

  // Strategic Recommendations + KPIs on their own page
  let y = newPage(doc);
  y = sectionTitle(doc, y, 'STRATEGIC RECOMMENDATIONS');
  y += 2;
  y = bodyText(doc, marketData.strategicRecommendations, y);
  y += 6;
  y = sectionTitle(doc, y, 'KEY PERFORMANCE INDICATORS (KPIs)');
  y += 2;
  y = bodyText(doc, marketData.kpiFramework, y);
}

// ─── FRAMEWORK SECTIONS (with full reference material) ──────────────

function drawFrameworkSections(doc: jsPDF, brandscript: BrandScript): void {
  for (const section of FRAMEWORK) {
    let y = newPage(doc);
    y = sectionTitle(doc, y, section.label.toUpperCase(), section.icon);
    y += 2;

    // ── Special reference content per section ──

    if (section.id === 'name') {
      // Purpose archetypes reference
      y = subHeading(doc, y, 'Purpose Archetype Reference (from BIG Framework)');
      for (const group of PURPOSE_ARCHETYPES) {
        y = safeY(doc, y, 10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...C.orangeLight);
        doc.text(`${group.group}:`, MARGIN + 4, y);
        y += 4;
        for (const item of group.items) {
          y = safeY(doc, y, 4);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(...C.textMuted);
          doc.text(`  • ${item}`, MARGIN + 6, y);
          y += 3.5;
        }
        y += 1;
      }
      y += 3;

      // Solution range
      y = subHeading(doc, y, 'Solution Offering Range');
      for (const sol of SOLUTION_RANGE) {
        y = safeY(doc, y, 4);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...C.textMuted);
        doc.text(`  • ${sol}`, MARGIN + 4, y);
        y += 3.5;
      }
      y += 3;

      // StoryBrand 7-part framework
      y = subHeading(doc, y, 'Origin Story — Donald Miller\'s StoryBrand 7-Part Framework');
      for (const step of STORY_FRAMEWORK) {
        y = safeY(doc, y, 5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...C.orangeLight);
        doc.text(step.step, MARGIN + 4, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.textMuted);
        doc.text(` — ${step.desc}`, MARGIN + 4 + doc.getTextWidth(step.step), y);
        y += 4;
      }
      y += 4;
    }

    // ── Fields table ──
    y = safeY(doc, y, 20);
    y = subHeading(doc, y, `${section.label} — Your Brand Data`);

    const rows = section.fields.map(field => {
      const value = brandscript[section.id]?.[field.id];
      return [
        field.label,
        field.description,
        value ? strip(value) : '— Not yet defined —',
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [['Field', 'Framework Description', 'Your Answer']],
      body: rows,
      margin: { left: MARGIN, right: MARGIN },
      styles: {
        fillColor: C.darkGray,
        textColor: C.textLight,
        fontSize: 7.5,
        cellPadding: 4,
        lineColor: C.midGray,
        lineWidth: 0.2,
        overflow: 'linebreak',
        font: 'helvetica',
      },
      headStyles: {
        fillColor: C.orange,
        textColor: C.black,
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [16, 16, 22] as [number, number, number],
      },
      columnStyles: {
        0: { cellWidth: 30, fontStyle: 'bold', textColor: C.orangeLight },
        1: { cellWidth: 55, textColor: C.textMuted, fontStyle: 'italic', fontSize: 7 },
        2: { cellWidth: 'auto' },
      },
      didDrawPage: () => darkBg(doc),
    });
  }
}

// ─── SUPERPOWER REFERENCE PAGE ──────────────────────────────────────

function drawSuperpowerRef(doc: jsPDF): void {
  let y = newPage(doc);
  y = sectionTitle(doc, y, 'VMV8 COMPETITIVE ADVANTAGE REFERENCE');
  y += 2;

  y = bodyText(doc, 'The Superpower is the unique differentiator that makes a brand extraordinary. It is derived from the intersection of Purpose + USP. Below are the finite competitive advantage options from the VMV8 framework.', y, { muted: true, italic: true, fontSize: 8 });
  y += 4;

  // Ancient tactics table
  y = subHeading(doc, y, 'Ancient Tactics');
  autoTable(doc, {
    startY: y,
    head: [['Competitive Advantage', 'Description']],
    body: SUPERPOWER_TACTICS.ancient.map(t => [t.name, t.desc]),
    margin: { left: MARGIN, right: MARGIN },
    styles: { fillColor: C.darkGray, textColor: C.textLight, fontSize: 8, cellPadding: 3.5, lineColor: C.midGray, lineWidth: 0.2, font: 'helvetica' },
    headStyles: { fillColor: C.orange, textColor: C.black, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [16, 16, 22] as [number, number, number] },
    columnStyles: { 0: { cellWidth: 35, fontStyle: 'bold', textColor: C.orangeLight } },
    didDrawPage: () => darkBg(doc),
  });

  // @ts-ignore - autoTable sets finalY
  y = (doc as any).lastAutoTable.finalY + 8;

  // Post-digital tactics table
  y = subHeading(doc, y, 'Post-Digital Tactics');
  autoTable(doc, {
    startY: y,
    head: [['Competitive Advantage', 'Description']],
    body: SUPERPOWER_TACTICS.postDigital.map(t => [t.name, t.desc]),
    margin: { left: MARGIN, right: MARGIN },
    styles: { fillColor: C.darkGray, textColor: C.textLight, fontSize: 8, cellPadding: 3.5, lineColor: C.midGray, lineWidth: 0.2, font: 'helvetica' },
    headStyles: { fillColor: C.orange, textColor: C.black, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [16, 16, 22] as [number, number, number] },
    columnStyles: { 0: { cellWidth: 35, fontStyle: 'bold', textColor: C.orangeLight } },
    didDrawPage: () => darkBg(doc),
  });
}

// ─── ARCHETYPE REFERENCE PAGE ───────────────────────────────────────

function drawArchetypeRef(doc: jsPDF): void {
  let y = newPage(doc);
  y = sectionTitle(doc, y, 'ARCHETYPE REFERENCE GUIDE');
  y += 2;

  y = bodyText(doc, 'The 12 brand archetypes define a brand\'s voice, tone, and emotional resonance. Each archetype maps to a unique Archetone — the emotional signature derived from Plutchik\'s Emotion Wheel.', y, { muted: true, italic: true, fontSize: 8 });
  y += 4;

  const rows = Object.entries(ARCHETYPE_DESCRIPTIONS).map(([name, desc]) => [name, desc]);

  autoTable(doc, {
    startY: y,
    head: [['Archetype', 'Description & Archetone']],
    body: rows,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fillColor: C.darkGray, textColor: C.textLight, fontSize: 7.5, cellPadding: 4, lineColor: C.midGray, lineWidth: 0.2, overflow: 'linebreak', font: 'helvetica' },
    headStyles: { fillColor: C.orange, textColor: C.black, fontStyle: 'bold', fontSize: 8.5 },
    alternateRowStyles: { fillColor: [16, 16, 22] as [number, number, number] },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold', textColor: C.orangeLight },
      1: { cellWidth: 'auto' },
    },
    didDrawPage: () => darkBg(doc),
  });
}

// ─── MAIN EXPORT ────────────────────────────────────────────────────

export interface PdfOptions {
  brandscript: BrandScript;
  contextPayload: string;
  marketData: MarketData;
  brandName?: string;
  tagline?: string;
}

export function generateBigDocPdf(options: PdfOptions): void {
  const { brandscript, contextPayload, marketData, brandName, tagline } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const resolvedBrandName = brandName || brandscript.name?.purpose?.split('.')[0]?.trim() || 'Your Brand';
  const resolvedTagline = tagline || brandscript.name?.tagline || '';

  // 1. Cover
  drawCover(doc, resolvedBrandName, resolvedTagline, date);

  // 2. Table of Contents
  drawTOC(doc);

  // 3. Executive Summary
  drawExecutiveSummary(doc, marketData, resolvedBrandName);

  // 4. Context Summary
  drawContext(doc, contextPayload);

  // 5. Market Intelligence (5 market pages + recommendations/KPIs)
  drawMarketSections(doc, marketData);

  // 6. Framework Sections (8 sections with embedded reference)
  drawFrameworkSections(doc, brandscript);

  // 7. Superpower Reference
  drawSuperpowerRef(doc);

  // 8. Archetype Reference
  drawArchetypeRef(doc);

  // 9. Footers on all pages except cover
  const total = doc.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    addFooter(doc, i, total);
  }

  // 10. Download
  const safe = resolvedBrandName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
  doc.save(`BIG-Doc-${safe}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
