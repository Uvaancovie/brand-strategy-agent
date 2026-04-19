// ─── PDF GENERATION SERVICE ─────────────────────────────────────────
// Builds a professionally styled B.I.G Doc PDF using jsPDF.
// Black & Orange brand palette. Continuous layout — no blank pages.
// Embeds full BIG Framework reference material alongside user answers.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FRAMEWORK, type BrandScript } from '../config/framework';
import type { MarketData } from './market.service';

// ─── COLOUR PALETTE (Elegant Black & White) ───────────────────────────
const C = {
  orange:      [0, 0, 0]  as [number, number, number],      // Primary Black
  orangeDark:  [30, 30, 30]  as [number, number, number],   // Dark Gray
  orangeLight: [120, 120, 120]  as [number, number, number],// Mid Gray
  black:       [255, 255, 255]  as [number, number, number],// Page Background (White)
  darkGray:    [245, 245, 245]  as [number, number, number],// Very Light Gray for tables
  midGray:     [220, 220, 220]  as [number, number, number],// Borders
  lightGray:   [100, 100, 100]  as [number, number, number],
  white:       [0, 0, 0] as [number, number, number],       // Strong Text (Black)
  textLight:   [20, 20, 20] as [number, number, number],    // Standard Text
  textMuted:   [90, 90, 90] as [number, number, number],    // Muted guidelines
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
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, MARGIN + (width || CONTENT_W), y);
  return y + 5;
}

function thinRule(doc: jsPDF, y: number): number {
  doc.setDrawColor(...C.midGray);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  return y + 4;
}

function sectionTitle(doc: jsPDF, y: number, title: string, icon?: string): number {
  y = safeY(doc, y, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...C.orange);
  const label = icon ? `${icon}  ${title}` : title;
  doc.text(label, MARGIN, y);
  y += 4;
  return orangeRule(doc, y);
}

function subHeading(doc: jsPDF, y: number, title: string): number {
  y = safeY(doc, y, 14);
  // Black bullet
  doc.setFillColor(...C.orange);
  doc.rect(MARGIN, y - 3, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.orange);
  doc.text(title, MARGIN + 6, y);
  return y + 6;
}

function bodyText(doc: jsPDF, text: string, y: number, opts?: { muted?: boolean; italic?: boolean; bold?: boolean; fontSize?: number; maxWidth?: number }): number {
  const cleaned = strip(text);
  const fs = opts?.fontSize || 9;
  const mw = opts?.maxWidth || CONTENT_W;
  let fontStyle = 'normal';
  if (opts?.bold) fontStyle = 'bold';
  else if (opts?.italic) fontStyle = 'italic';
  doc.setFont('helvetica', fontStyle);
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
  doc.setDrawColor(...C.midGray);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y - 4, PAGE_W - MARGIN, y - 4);
  doc.setFontSize(7);
  doc.setTextColor(...C.textMuted);
  doc.text('VMV8 — Brand Identity Guiding Document', MARGIN, y);
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W - MARGIN, y, { align: 'right' });
  doc.setTextColor(...C.textMuted);
  doc.text('Powered by Volcanic Marketing', PAGE_W / 2, y, { align: 'center' });
}

// ─── COVER PAGE ─────────────────────────────────────────────────────

function drawCover(doc: jsPDF, brandName: string, tagline: string, date: string): void {
  darkBg(doc);
  const cx = PAGE_W / 2;

  // Diamond Logo
  const cyLogo = 40, size = 15;
  doc.setDrawColor(...C.orange);
  doc.setLineWidth(0.5);
  doc.line(cx, cyLogo - size, cx + size, cyLogo);
  doc.line(cx + size, cyLogo, cx, cyLogo + size);
  doc.line(cx, cyLogo + size, cx - size, cyLogo);
  doc.line(cx - size, cyLogo, cx, cyLogo - size);
  doc.line(cx, cyLogo - size, cx, cyLogo + size);
  doc.line(cx, cyLogo + size * 0.3, cx + size * 0.5, cyLogo - size * 0.2);
  doc.line(cx, cyLogo + size * 0.3, cx - size * 0.5, cyLogo - size * 0.2);

  // Logo Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...C.white); // Prints black now
  doc.text('V O L C A N I C   M A R K E T I N G', cx, cyLogo + 24, { align: 'center' });
  doc.setFont('times', 'italic');
  doc.setFontSize(11);
  doc.text('extraordinary by design', cx, cyLogo + 30, { align: 'center' });

  // Main Title
  doc.setFont('times', 'normal');
  doc.setFontSize(26);
  doc.setTextColor(...C.orangeDark);
  doc.text('BRAND', cx, cyLogo + 52, { align: 'center' });
  doc.text('STRATEGY', cx, cyLogo + 64, { align: 'center' });

  // Box with 8 Sections
  const boxTop = cyLogo + 82;
  const boxWidth = 100;
  const boxLeft = cx - boxWidth / 2;
  const boxHeight = 135;
  
  doc.setDrawColor(...C.textMuted);
  doc.setLineWidth(0.2);
  doc.rect(boxLeft, boxTop, boxWidth, boxHeight);

  const sectionsContent = [
    { title: 'NAME', sub: 'Purpose, Origin Story, Tagline, Slogan' },
    { title: 'CHARACTER', sub: 'Charity, Cause, Conviction, Values' },
    { title: 'INTENT', sub: 'Vision, Mission, Message' },
    { title: 'VOICE', sub: 'Archetype, Tone, Topics of Authority' },
    { title: 'CREATION', sub: 'Product, Service, Superpower' },
    { title: 'OPERATION', sub: 'Tools, Processes, Systems, Logistics' },
    { title: 'IMAGE', sub: 'Logo, Fonts, Colour Palette' },
    { title: 'ADMINISTRATION', sub: 'Policies, Procedures, Legal, Finance' },
  ];

  let textY = boxTop + 10;
  for (const item of sectionsContent) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.orangeDark);
    doc.text(item.title, cx, textY, { align: 'center' });
    textY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.textMuted);
    doc.text(item.sub, cx, textY, { align: 'center' });
    textY += 12;
  }

  // Footer "PLAN" button and wavy mock lines
  const bottomCy = PAGE_H - 18;
  
  // A few contour lines mock
  doc.setDrawColor(...C.midGray);
  doc.setLineWidth(0.2);
  for(let i = 0; i < 4; i++) {
    doc.line(0, bottomCy - 4 + i*4, PAGE_W, bottomCy - 2 + i*5);
  }

  // Plan Button
  doc.setFillColor(...C.white); // Black fill
  doc.setTextColor(...C.black); // White text
  doc.roundedRect(cx - 15, bottomCy - 5, 30, 10, 5, 5, 'F');
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text('PLAN', cx, bottomCy + 1.5, { align: 'center' });
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

// Helper to draw metrics boxes
function drawMetricBoxes(doc: jsPDF, y: number, metrics: { label: string; value: string }[]): number {
  if (!metrics || metrics.length === 0) return y;
  const count = metrics.length;
  const spacing = 4;
  const boxW = (CONTENT_W - (spacing * (count - 1))) / count;
  let boxX = MARGIN;
  
  for (const m of metrics) {
    doc.setFillColor(...C.darkGray);
    doc.roundedRect(boxX, y + 2, boxW, 16, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.textMuted);
    doc.text(m.label.toUpperCase(), boxX + boxW/2, y + 7, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...C.white); // prints strong black
    doc.text(m.value, boxX + boxW/2, y + 13.5, { align: 'center' });
    boxX += boxW + spacing;
  }
  return y + 22;
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
  doc.setDrawColor(...C.midGray);
  doc.setLineWidth(0.2);
  for(const c of cols) {
    // Draw Box
    doc.roundedRect(cx, y, colW, 36, 2, 2);
    // Draw Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...C.textMuted);
    doc.text(c.t, cx + colW/2, y + 8, { align: 'center' });
    // Draw Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...C.white); // Prints black in this theme
    doc.text(c.obj.value, cx + colW/2, y + 15, { align: 'center' });
    // Draw Description
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.textMuted);
    const lines = doc.splitTextToSize(c.obj.description, colW - 6);
    doc.text(lines.slice(0,4), cx + colW/2, y + 21, { align: 'center', lineHeightFactor: 1.2 });
    cx += colW + 4;
  }
  y += 42;
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
    styles: { fillColor: C.darkGray, textColor: C.textLight, fontSize: 8, cellPadding: 3, lineColor: C.midGray, lineWidth: 0.1, font: 'helvetica' },
    headStyles: { fillColor: C.orange, textColor: C.black, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 250] as [number, number, number] },
    columnStyles: { 0: { fontStyle: 'bold' } },
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
      styles: { fillColor: C.darkGray, textColor: C.textLight, fontSize: 8, cellPadding: 3, lineColor: C.midGray, lineWidth: 0.1, font: 'helvetica' },
      headStyles: { fillColor: C.orange, textColor: C.black, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 250] as [number, number, number] },
      columnStyles: { 0: { cellWidth: 80, fontStyle: 'bold' } }
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
    doc.setFillColor(...C.darkGray);
    doc.roundedRect(MARGIN, y, CONTENT_W, 10, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...C.orangeDark);
    doc.text(rec.title, MARGIN + 4, y + 6.5);
    
    // Metadata tags
    doc.setFontSize(8);
    doc.setTextColor(...C.textMuted);
    const meta = `Timeline: ${rec.timeline}  •  Investment: ${rec.investment}  •  ROI: ${rec.roi}`;
    doc.text(meta, PAGE_W - MARGIN - 4, y + 6.5, { align: 'right' });
    y += 14;
    
    // Steps
    for (const step of rec.steps) {
      y = safeY(doc, y, 6);
      doc.setFillColor(...C.orangeDark);
      doc.circle(MARGIN + 3, y - 1, 0.8, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.textLight);
      y = bodyText(doc, step, y, { maxWidth: CONTENT_W - 8 });
    }
    y += 6;
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
    styles: { fillColor: C.darkGray, textColor: C.textLight, fontSize: 8, cellPadding: 3, lineColor: C.midGray, lineWidth: 0.1, font: 'helvetica' },
    headStyles: { fillColor: C.orange, textColor: C.black, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 250] as [number, number, number] },
    columnStyles: { 0: { fontStyle: 'bold' }, 1: { fontStyle: 'bold', textColor: C.orangeDark } }
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
        fillColor: [250, 250, 250] as [number, number, number],
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
    alternateRowStyles: { fillColor: [250, 250, 250] as [number, number, number] },
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
    alternateRowStyles: { fillColor: [250, 250, 250] as [number, number, number] },
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
    alternateRowStyles: { fillColor: [250, 250, 250] as [number, number, number] },
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
