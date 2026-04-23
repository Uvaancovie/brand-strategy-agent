// ─── PDF GENERATION SERVICE ─────────────────────────────────────────
// Builds a professionally styled B.I.G Doc PDF using jsPDF.
// Black & Orange brand palette. Continuous layout — no blank pages.
// Embeds full BIG Framework reference material alongside user answers.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FRAMEWORK, type BrandScript } from '../config/framework';
import type { MarketData } from './market.service';

// ─── COLOUR PALETTE (Premium Brand Palette) ───────────────────────────
const C = {
  primary:     [10, 10, 15] as [number, number, number],    // Deep Charcoal
  accent:      [255, 107, 53] as [number, number, number],   // Volcanic Orange
  accentAmber: [247, 201, 72] as [number, number, number],   // Gold/Amber
  white:       [255, 255, 255] as [number, number, number],  // Pure White
  pageBg:      [255, 255, 255] as [number, number, number],  // White Background
  tableBg:     [248, 248, 250] as [number, number, number],  // Subtle Gray
  border:      [220, 220, 230] as [number, number, number],  // Soft Borders
  textMain:    [15, 15, 20] as [number, number, number],     // Strong Body
  textLight:   [60, 60, 75] as [number, number, number],     // Subtitles
  textMuted:   [120, 120, 135] as [number, number, number],  // Metadata
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

function drawBg(doc: jsPDF): void {
  doc.setFillColor(...C.pageBg);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
}

function newPage(doc: jsPDF): number {
  doc.addPage();
  drawBg(doc);
  return 28;
}

function safeY(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > BOTTOM_SAFE) {
    return newPage(doc);
  }
  return y;
}



function sectionTitle(doc: jsPDF, y: number, title: string, icon?: string): number {
  y = safeY(doc, y, 25);
  
  // Left accent bar
  doc.setFillColor(...C.accent);
  doc.rect(MARGIN, y - 5, 1.5, 10, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...C.primary);
  const label = icon ? `${icon}  ${title}` : title;
  doc.text(label, MARGIN + 6, y + 2.5);
  
  y += 10;
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  
  return y + 10;
}

function subHeading(doc: jsPDF, y: number, title: string): number {
  y = safeY(doc, y, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.accent);
  doc.text(title.toUpperCase(), MARGIN, y);
  return y + 6;
}

function bodyText(doc: jsPDF, text: string, y: number, opts?: { muted?: boolean; italic?: boolean; bold?: boolean; fontSize?: number; maxWidth?: number; color?: [number, number, number] }): number {
  const cleaned = strip(text);
  const fs = opts?.fontSize || 10;
  const mw = opts?.maxWidth || CONTENT_W;
  let fontStyle = 'normal';
  if (opts?.bold) fontStyle = 'bold';
  else if (opts?.italic) fontStyle = 'italic';
  
  doc.setFont('helvetica', fontStyle);
  doc.setFontSize(fs);
  
  let color = opts?.color || (opts?.muted ? C.textMuted : C.textMain);
  doc.setTextColor(...color);
  
  const lines = doc.splitTextToSize(cleaned, mw);
  const lh = fs * 0.45; // slightly more line height for professionalism
  
  for (const line of lines) {
    y = safeY(doc, y, lh + 1);
    doc.text(line, MARGIN, y);
    y += lh;
  }
  return y;
}

function addFooter(doc: jsPDF, pageNum: number, totalPages: number): void {
  const y = PAGE_H - 12;
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y - 5, PAGE_W - MARGIN, y - 5);
  
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  doc.setFont('helvetica', 'normal');
  doc.text('BIG Framework Strategic Document', MARGIN, y);
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W - MARGIN, y, { align: 'right' });
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('VOLCANIC MARKETING', PAGE_W / 2, y, { align: 'center' });
}

// ─── COVER PAGE ─────────────────────────────────────────────────────

function drawCover(doc: jsPDF, brandName: string, tagline: string, date: string): void {
  drawBg(doc);
  const cx = PAGE_W / 2;

  // ── Top Brand Header ──
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, PAGE_W, 60, 'F');
  
  // Decorative line
  doc.setFillColor(...C.accent);
  doc.rect(0, 58, PAGE_W, 2, 'F');

  // Logo Text in White on Dark BG
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.white);
  doc.text('V O L C A N I C   M A R K E T I N G', cx, 30, { align: 'center' });
  doc.setFont('times', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(...C.accentAmber);
  doc.text('extraordinary by design', cx, 36, { align: 'center' });

  // ── Main Content Area ──
  const midY = 110;
  
  // Large Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(42);
  doc.setTextColor(...C.primary);
  doc.text('BRAND', cx, midY, { align: 'center' });
  doc.text('STRATEGY', cx, midY + 16, { align: 'center' });
  
  // Brand Name Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(18);
  doc.setTextColor(...C.accent);
  doc.text(brandName.toUpperCase(), cx, midY + 34, { align: 'center' });

  // ── Strategy Box (Modern Grid) ──
  const boxTop = 175;
  const boxW = 140;
  const boxX = (PAGE_W - boxW) / 2;
  const boxH = 65;

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.1);
  doc.rect(boxX, boxTop, boxW, boxH);

  const sectionsContent = [
    'NAME • PURPOSE • VISION',
    'CHARACTER • VALUES • CAUSE',
    'VOICE • TONE • ARCHETYPE',
    'CREATION • PRODUCT • POWER'
  ];

  let textY = boxTop + 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  for (const line of sectionsContent) {
    doc.text(line, cx, textY, { align: 'center' });
    textY += 12;
  }

  // ── Bottom Section ──
  const footerY = PAGE_H - 30;
  
  // Date & Badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.primary);
  doc.text(date.toUpperCase(), cx, footerY, { align: 'center' });
  
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.5);
  doc.line(cx - 15, footerY + 4, cx + 15, footerY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.textLight);
  doc.text('CONFIDENTIAL STRATEGIC REPORT', cx, footerY + 12, { align: 'center' });
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
    doc.setTextColor(...C.accent);
    doc.text(item.num, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.textMain);
    doc.text(item.label, MARGIN + 14, y);
    // dots
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.1);
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
  doc.setFillColor(...C.tableBg);
  doc.roundedRect(MARGIN, y, CONTENT_W, 14, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...C.accent);
  doc.text(brandName || 'Your Brand', MARGIN + 6, y + 9);
  y += 20;

  y = bodyText(doc, marketData.executiveSummary, y);
  y += 10;
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

// Helper to draw metrics boxes
function drawMetricBoxes(doc: jsPDF, y: number, metrics: { label: string; value: string }[]): number {
  if (!metrics || metrics.length === 0) return y;
  const count = metrics.length;
  const spacing = 4;
  const boxW = (CONTENT_W - (spacing * (count - 1))) / count;
  let boxX = MARGIN;
  
  for (const m of metrics) {
    doc.setFillColor(...C.tableBg);
    doc.roundedRect(boxX, y + 2, boxW, 20, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.textMuted);
    doc.text(m.label.toUpperCase(), boxX + boxW/2, y + 8, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...C.primary);
    doc.text(m.value, boxX + boxW/2, y + 15, { align: 'center' });
    boxX += boxW + spacing;
  }
  return y + 26;
}

function drawMarketSections(doc: jsPDF, marketData: MarketData): void {
  // 1. Industry Overview
  let y = newPage(doc);
  y = sectionTitle(doc, y, 'INDUSTRY OVERVIEW');
  y += 2;
  y = drawMetricBoxes(doc, y, marketData.industryOverview.metrics);
  y += 4;
  y = bodyText(doc, marketData.industryOverview.narrative, y);

  // 2. Market Sizing (TAM/SAM/SOM Infographic map)
  y = newPage(doc);
  y = sectionTitle(doc, y, 'MARKET SIZING — TAM / SAM / SOM');
  y += 4;
  
  const colW = (CONTENT_W - 8) / 3;
  const cols = [
    { t: 'TAM', obj: marketData.marketSizing.tam },
    { t: 'SAM', obj: marketData.marketSizing.sam },
    { t: 'SOM', obj: marketData.marketSizing.som }
  ];
  let cx = MARGIN;
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  for(const c of cols) {
    // Draw Box
    doc.setFillColor(...C.tableBg);
    doc.roundedRect(cx, y, colW, 42, 1, 1, 'F');
    // Draw Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...C.accent);
    doc.text(c.t, cx + colW/2, y + 10, { align: 'center' });
    // Draw Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...C.primary);
    doc.text(c.obj.value, cx + colW/2, y + 18, { align: 'center' });
    // Draw Description
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.textLight);
    const lines = doc.splitTextToSize(c.obj.description, colW - 8);
    doc.text(lines.slice(0,4), cx + colW/2, y + 25, { align: 'center', lineHeightFactor: 1.2 });
    cx += colW + 4;
  }
  y += 48;
  y = subHeading(doc, y, 'Penetration & Est. Growth');
  y = bodyText(doc, `Estimated CAGR/Growth Factor: ${marketData.marketSizing.growth_cagr}`, y, { bold: true });
  y += 2;
  y = bodyText(doc, marketData.marketSizing.narrative, y);

  // 3. Target Market Segmentation
  y = newPage(doc);
  y = sectionTitle(doc, y, 'TARGET MARKET SEGMENTATION');
  y += 2;
  y = drawMetricBoxes(doc, y, marketData.targetMarketSegmentation.metrics);
  y += 6;
  
  y = subHeading(doc, y, 'Primary Segment: ' + marketData.targetMarketSegmentation.primary.name);
  y = bodyText(doc, marketData.targetMarketSegmentation.primary.description, y);
  y += 2;
  y = bodyText(doc, `Demographics: ${marketData.targetMarketSegmentation.primary.demographics}`, y, { muted: true, italic: true });
  y = bodyText(doc, `Psychographics: ${marketData.targetMarketSegmentation.primary.psychographics}`, y, { muted: true, italic: true });
  y += 8;
  
  y = subHeading(doc, y, 'Secondary Segment: ' + marketData.targetMarketSegmentation.secondary.name);
  y = bodyText(doc, marketData.targetMarketSegmentation.secondary.description, y);
  y += 2;
  y = bodyText(doc, `Demographics: ${marketData.targetMarketSegmentation.secondary.demographics}`, y, { muted: true, italic: true });
  y = bodyText(doc, `Psychographics: ${marketData.targetMarketSegmentation.secondary.psychographics}`, y, { muted: true, italic: true });

  // 4. Competitive Positioning
  y = newPage(doc);
  y = sectionTitle(doc, y, 'COMPETITIVE POSITIONING');
  y += 4;
  
  autoTable(doc, {
    startY: y,
    head: [['Competitor Archetype', 'Share', 'Pricing', 'Key Strength', 'Key Weakness']],
    body: marketData.competitivePositioning.competitors.map(c => [
      c.archetype, c.market_share, c.price_tier, c.strength, c.weakness
    ]),
    margin: { left: MARGIN, right: MARGIN },
    styles: { fillColor: C.tableBg, textColor: C.textMain, fontSize: 8, cellPadding: 4, lineColor: C.border, lineWidth: 0.1, font: 'helvetica' },
    headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [252, 252, 254] as [number, number, number] },
    columnStyles: { 0: { fontStyle: 'bold', textColor: C.accent } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;
  y = subHeading(doc, y, 'Strategic Moat Analysis');
  y = bodyText(doc, marketData.competitivePositioning.narrative, y);

  // 5. SWOT Analysis
  y = newPage(doc);
  y = sectionTitle(doc, y, 'SWOT ANALYSIS');
  y += 4;
  
  const swotGroups = [
    { title: 'STRENGTHS', items: marketData.swotAnalysis.strengths },
    { title: 'WEAKNESSES', items: marketData.swotAnalysis.weaknesses },
    { title: 'OPPORTUNITIES', items: marketData.swotAnalysis.opportunities },
    { title: 'THREATS', items: marketData.swotAnalysis.threats }
  ];
  
  for (const group of swotGroups) {
    if (y > BOTTOM_SAFE - 30) y = newPage(doc);
    y = subHeading(doc, y, group.title);
    
    autoTable(doc, {
      startY: y,
      head: [['Factor', 'Impact / Risk']],
      body: group.items.map(i => [i.factor, i.impact]),
      margin: { left: MARGIN, right: MARGIN },
      styles: { fillColor: C.tableBg, textColor: C.textMain, fontSize: 8, cellPadding: 4, lineColor: C.border, lineWidth: 0.1, font: 'helvetica' },
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [252, 252, 254] as [number, number, number] },
      columnStyles: { 0: { cellWidth: 80, fontStyle: 'bold', textColor: C.accent } }
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // 6. Strategic Recommendations
  y = newPage(doc);
  y = sectionTitle(doc, y, 'STRATEGIC RECOMMENDATIONS');
  y += 4;
  
  for (const rec of marketData.strategicRecommendations) {
    y = safeY(doc, y, 40);
    // Header block
    doc.setFillColor(...C.tableBg);
    doc.roundedRect(MARGIN, y, CONTENT_W, 12, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...C.primary);
    doc.text(rec.title, MARGIN + 4, y + 7.5);
    
    // Metadata tags
    doc.setFontSize(7.5);
    doc.setTextColor(...C.textMuted);
    const meta = `Timeline: ${rec.timeline}  •  Investment: ${rec.investment}`;
    doc.text(meta, PAGE_W - MARGIN - 4, y + 7.5, { align: 'right' });
    y += 16;
    
    // Steps
    for (const step of rec.steps) {
      y = safeY(doc, y, 8);
      doc.setFillColor(...C.accent);
      doc.circle(MARGIN + 3, y - 1, 0.8, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...C.textMain);
      y = bodyText(doc, step, y, { maxWidth: CONTENT_W - 8 });
    }
    y += 8;
  }

  // 7. KPI Framework
  y = newPage(doc);
  y = sectionTitle(doc, y, 'KEY PERFORMANCE INDICATORS (KPIs)');
  y += 4;
  
  autoTable(doc, {
    startY: y,
    head: [['Category', 'Metric', 'Baseline', '6M Target', '12M Target', 'Frequency']],
    body: marketData.kpiFramework.map(k => [
      k.category, k.metric, k.baseline, k.target_6m, k.target_12m, k.frequency
    ]),
    margin: { left: MARGIN, right: MARGIN },
    styles: { fillColor: C.tableBg, textColor: C.textMain, fontSize: 8, cellPadding: 4, lineColor: C.border, lineWidth: 0.1, font: 'helvetica' },
    headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [252, 252, 254] as [number, number, number] },
    columnStyles: { 0: { fontStyle: 'bold' }, 1: { fontStyle: 'bold', textColor: C.accent } }
  });
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
        doc.setTextColor(...C.accent);
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
        doc.setTextColor(...C.accent);
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
        fillColor: C.tableBg,
        textColor: C.textMain,
        fontSize: 8.5,
        cellPadding: 5,
        lineColor: C.border,
        lineWidth: 0.2,
        overflow: 'linebreak',
        font: 'helvetica',
      },
      headStyles: {
        fillColor: C.primary,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [252, 252, 254] as [number, number, number],
      },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: 'bold', textColor: C.accent },
        1: { cellWidth: 55, textColor: C.textLight, fontStyle: 'italic', fontSize: 7.5 },
        2: { cellWidth: 'auto' },
      },
      didDrawPage: () => drawBg(doc),
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
    styles: { fillColor: C.tableBg, textColor: C.textMain, fontSize: 8.5, cellPadding: 4, lineColor: C.border, lineWidth: 0.1, font: 'helvetica' },
    headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [252, 252, 254] as [number, number, number] },
    columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold', textColor: C.accent } },
    didDrawPage: () => drawBg(doc),
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
    styles: { fillColor: C.tableBg, textColor: C.textMain, fontSize: 8.5, cellPadding: 4, lineColor: C.border, lineWidth: 0.1, font: 'helvetica' },
    headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [252, 252, 254] as [number, number, number] },
    columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold', textColor: C.accent } },
    didDrawPage: () => drawBg(doc),
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
    styles: { fillColor: C.tableBg, textColor: C.textMain, fontSize: 8, cellPadding: 4, lineColor: C.border, lineWidth: 0.2, overflow: 'linebreak', font: 'helvetica' },
    headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: [252, 252, 254] as [number, number, number] },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold', textColor: C.accent },
      1: { cellWidth: 'auto' },
    },
    didDrawPage: () => drawBg(doc),
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

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

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
