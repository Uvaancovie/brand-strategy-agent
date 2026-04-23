import { FRAMEWORK, type BrandScript } from '../config/framework';
import type { MarketData } from './market.service';

export interface ExportOptions {
  brandscript: BrandScript;
  contextPayload: string;
  marketData: MarketData;
  brandName?: string;
  tagline?: string;
}

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

function formatText(text: string) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/•/g, '&bull;');
}

function truncate(text: string, len: number) {
  if (!text) return '';
  return text.length > len ? text.substring(0, len) + '...' : text;
}

export function generateHtmlDoc(options: ExportOptions): string {
  const { brandscript, contextPayload, marketData, brandName, tagline } = options;
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const resolvedBrandName = brandName || brandscript.name?.purpose?.split('.')[0]?.trim() || 'Your Brand';
  const resolvedTagline = tagline || brandscript.name?.tagline || '';

  // Get framework populated sections
  const sectionsHtml = FRAMEWORK.map(section => {
    const fieldsHtml = section.fields.map(field => {
      const value = brandscript[section.id]?.[field.id] || '<em>Not provided</em>';
      return `
        <tr>
          <td class="col-field">${field.label}</td>
          <td class="col-desc">${field.description || ''}</td>
          <td class="col-value">${formatText(value)}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="page-break section-block">
        <h2 class="section-title"><span class="icon">${section.icon}</span> ${section.label.toUpperCase()}</h2>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th class="col-field">Field</th>
                <th class="col-desc">Framework Description</th>
                <th class="col-value">Your Answer</th>
              </tr>
            </thead>
            <tbody>
              ${fieldsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BIG Doc: ${resolvedBrandName}</title>
  <style>
    /* STRICT BLACK AND WHITE PROFESSIONAL STYLES */
    :root {
      --black: #111111;
      --dark-gray: #333333;
      --mid-gray: #777777;
      --light-gray: #eeeeee;
      --off-white: #f8f8f8;
      --white: #ffffff;
      --font-serif: "Georgia", "Times New Roman", serif;
      --font-sans: "Helvetica Neue", "Arial", sans-serif;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 0;
      font-family: var(--font-sans);
      color: var(--black);
      background-color: var(--light-gray);
      line-height: 1.6;
    }

    .document {
      max-width: 210mm;
      margin: 0 auto;
      background: var(--white);
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      padding: 20mm;
    }
    
    @media screen {
      .page-break { margin-bottom: 2rem; border-bottom: 1px solid var(--light-gray); padding-bottom: 2rem; }
    }

    @media print {
      body { background: var(--white); }
      .document { max-width: 100%; box-shadow: none; padding: 0; margin: 0; }
      .page-break { page-break-before: always; margin-top: 20mm; }
    }

    h1, h2, h3, h4 { font-family: var(--font-sans); color: var(--black); margin-top: 0; }
    
    /* Cover Page */
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      min-height: 250mm;
    }
    .cover-eyebrow {
      font-family: var(--font-serif);
      font-style: italic;
      color: var(--mid-gray);
      font-size: 1.2rem;
      margin-bottom: 2rem;
    }
    .cover-title {
      font-size: 4.5rem;
      font-weight: 900;
      letter-spacing: -1px;
      line-height: 1.1;
      margin-bottom: 1rem;
      text-transform: uppercase;
    }
    .cover-brand {
      font-size: 2rem;
      color: var(--dark-gray);
      margin-bottom: 3rem;
    }
    .cover-grid {
      border: 1px solid var(--light-gray);
      padding: 2rem;
      margin-bottom: 3rem;
      width: 80%;
    }
    .cover-grid p {
      font-size: 0.85rem;
      letter-spacing: 2px;
      color: var(--mid-gray);
      margin: 0.5rem 0;
      text-transform: uppercase;
    }
    
    /* Document Sections */
    .section-title {
      font-size: 1.75rem;
      font-weight: 800;
      border-bottom: 3px solid var(--black);
      padding-bottom: 0.5rem;
      margin-bottom: 1.5rem;
      display: flex;
      gap: 1rem;
      align-items: center;
    }
    .section-title .icon { color: var(--mid-gray); }
    
    .sub-heading {
      font-size: 1.1rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 2rem;
      margin-bottom: 0.5rem;
      color: var(--dark-gray);
    }
    
    p { margin-top: 0; margin-bottom: 1rem; font-size: 1rem; color: var(--dark-gray); }
    
    .text-muted { color: var(--mid-gray); font-style: italic; font-size: 0.9rem; }
    
    /* Grids & Cards */
    .metric-grid {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .metric-box {
      flex: 1;
      background: var(--off-white);
      border: 1px solid var(--light-gray);
      padding: 1.5rem;
      text-align: center;
    }
    .metric-box-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--mid-gray);
      margin-bottom: 0.5rem;
    }
    .metric-box-val {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--black);
    }
    
    /* Tables */
    .table-container {
      overflow-x: auto;
      margin-bottom: 2rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    th, td {
      padding: 1rem;
      text-align: left;
      border-bottom: 1px solid var(--light-gray);
      vertical-align: top;
    }
    th {
      background-color: var(--black);
      color: var(--white);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-size: 0.8rem;
    }
    tr:nth-child(even) { background-color: var(--off-white); }
    .col-field { font-weight: bold; width: 20%; color: var(--black); }
    .col-desc { font-style: italic; color: var(--mid-gray); width: 30%; font-size: 0.85rem; }
    .col-value { width: 50%; }
    
    /* Strategic Output specific */
    .strategy-card {
      background: var(--off-white);
      border-left: 4px solid var(--black);
      padding: 1.5rem;
      margin-bottom: 1rem;
    }
    .strategy-card h4 {
      margin-bottom: 0.25rem;
      font-size: 1.1rem;
    }
    .strategy-meta {
      font-size: 0.8rem;
      color: var(--mid-gray);
      margin-bottom: 1rem;
      text-transform: uppercase;
    }
    ul { margin: 0 0 1rem 0; padding-left: 1.5rem; color: var(--dark-gray); }
    li { margin-bottom: 0.5rem; }

    /* Footer / Date */
    .doc-footer {
      text-align: center;
      margin-top: 3rem;
      border-top: 1px solid var(--light-gray);
      padding-top: 1rem;
      font-size: 0.8rem;
      color: var(--mid-gray);
    }
  </style>
</head>
<body>
  <div class="document">
    
    <!-- COVER PAGE -->
    <div class="cover-page">
      <div class="cover-eyebrow">Volcanic Marketing • Extraordinary by Design</div>
      <h1 class="cover-title">Brand<br>Strategy</h1>
      <div class="cover-brand">${resolvedBrandName}</div>
      <div class="cover-grid">
        <p>Name • Purpose • Vision</p>
        <p>Character • Values • Cause</p>
        <p>Voice • Tone • Archetype</p>
        <p>Creation • Product • Power</p>
      </div>
      <div style="font-weight: 700;">${date}</div>
      <div style="font-size: 0.8rem; color: var(--mid-gray); margin-top: 0.5rem; letter-spacing: 1px;">CONFIDENTIAL STRATEGIC REPORT</div>
    </div>

    <!-- EXECUTIVE SUMMARY -->
    <div class="page-break">
      <h2 class="section-title">Executive Summary</h2>
      <div class="strategy-card" style="border-left: none; border-top: 4px solid var(--black);">
        <h4>${resolvedBrandName}</h4>
        <p style="margin: 0; font-size: 0.95rem;">${resolvedTagline}</p>
      </div>
      <p>${formatText(marketData?.executiveSummary || '')}</p>
      <p class="text-muted">This document synthesizes your brand strategy framework (VMV8) with AI-generated market intelligence to provide a comprehensive brand identity guide. All market data should be validated with primary research.</p>
    </div>

    <!-- CONTEXT SUMMARY -->
    <div class="page-break">
      <h2 class="section-title">Strategic Context</h2>
      <p style="font-size: 0.9rem; white-space: pre-wrap;">${contextPayload ? formatText(truncate(contextPayload, 3500)) : '<em class="text-muted">No external context was provided for this baseline document.</em>'}</p>
    </div>

    <!-- MARKET INTELLIGENCE -->
    ${marketData ? `
    <div class="page-break">
      <h2 class="section-title">Industry Overview</h2>
      <div class="metric-grid">
        ${marketData.industryOverview?.metrics.map(m => `
          <div class="metric-box">
            <div class="metric-box-label">${m.label}</div>
            <div class="metric-box-val">${m.value}</div>
          </div>
        `).join('') || ''}
      </div>
      <p>${formatText(marketData.industryOverview?.narrative || '')}</p>
    </div>

    <div class="page-break">
      <h2 class="section-title">Market Sizing (TAM / SAM / SOM)</h2>
      <div class="metric-grid">
        <div class="metric-box" style="text-align: left;">
          <div class="metric-box-label">TAM (Total Addressable Market)</div>
          <div class="metric-box-val">${marketData.marketSizing?.tam.value}</div>
          <p style="font-size: 0.85rem; margin-top: 0.5rem; color: var(--mid-gray);">${marketData.marketSizing?.tam.description}</p>
        </div>
        <div class="metric-box" style="text-align: left;">
          <div class="metric-box-label">SAM (Serviceable Addressable Market)</div>
          <div class="metric-box-val">${marketData.marketSizing?.sam.value}</div>
          <p style="font-size: 0.85rem; margin-top: 0.5rem; color: var(--mid-gray);">${marketData.marketSizing?.sam.description}</p>
        </div>
        <div class="metric-box" style="text-align: left;">
          <div class="metric-box-label">SOM (Serviceable Obtainable Market)</div>
          <div class="metric-box-val">${marketData.marketSizing?.som.value}</div>
          <p style="font-size: 0.85rem; margin-top: 0.5rem; color: var(--mid-gray);">${marketData.marketSizing?.som.description}</p>
        </div>
      </div>
      <div class="sub-heading">Penetration & Est. Growth</div>
      <p><strong>Estimated CAGR/Growth Factor:</strong> ${marketData.marketSizing?.growth_cagr}</p>
      <p>${formatText(marketData.marketSizing?.narrative || '')}</p>
    </div>

    <div class="page-break">
      <h2 class="section-title">Target Market Segmentation</h2>
      <div class="metric-grid">
        ${marketData.targetMarketSegmentation?.metrics.map(m => `
          <div class="metric-box">
            <div class="metric-box-label">${m.label}</div>
            <div class="metric-box-val">${m.value}</div>
          </div>
        `).join('') || ''}
      </div>
      
      <div class="sub-heading">Primary Segment: ${marketData.targetMarketSegmentation?.primary.name}</div>
      <p>${formatText(marketData.targetMarketSegmentation?.primary.description || '')}</p>
      <p class="text-muted">Demographics: ${marketData.targetMarketSegmentation?.primary.demographics}</p>
      <p class="text-muted">Psychographics: ${marketData.targetMarketSegmentation?.primary.psychographics}</p>

      <div class="sub-heading">Secondary Segment: ${marketData.targetMarketSegmentation?.secondary.name}</div>
      <p>${formatText(marketData.targetMarketSegmentation?.secondary.description || '')}</p>
      <p class="text-muted">Demographics: ${marketData.targetMarketSegmentation?.secondary.demographics}</p>
      <p class="text-muted">Psychographics: ${marketData.targetMarketSegmentation?.secondary.psychographics}</p>
    </div>

    <div class="page-break">
      <h2 class="section-title">Competitive Positioning</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Competitor Archetype</th>
              <th>Share</th>
              <th>Pricing</th>
              <th>Key Strength</th>
              <th>Key Weakness</th>
            </tr>
          </thead>
          <tbody>
            ${marketData.competitivePositioning?.competitors.map(c => `
              <tr>
                <td style="font-weight: bold;">${c.archetype}</td>
                <td>${c.market_share}</td>
                <td>${c.price_tier}</td>
                <td>${c.strength}</td>
                <td>${c.weakness}</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>
      </div>
      <div class="sub-heading">Strategic Moat Analysis</div>
      <p>${formatText(marketData.competitivePositioning?.narrative || '')}</p>
    </div>

    <div class="page-break">
      <h2 class="section-title">SWOT Analysis</h2>
      
      <div class="sub-heading">Strengths</div>
      <div class="table-container">
        <table>
          <thead><tr><th style="width: 30%">Factor</th><th>Impact / Risk</th></tr></thead>
          <tbody>${marketData.swotAnalysis?.strengths.map(s => `<tr><td style="font-weight:bold">${s.factor}</td><td>${s.impact}</td></tr>`).join('')}</tbody>
        </table>
      </div>

      <div class="sub-heading">Weaknesses</div>
      <div class="table-container">
        <table>
          <thead><tr><th style="width: 30%">Factor</th><th>Impact / Risk</th></tr></thead>
          <tbody>${marketData.swotAnalysis?.weaknesses.map(s => `<tr><td style="font-weight:bold">${s.factor}</td><td>${s.impact}</td></tr>`).join('')}</tbody>
        </table>
      </div>

      <div class="sub-heading">Opportunities</div>
      <div class="table-container">
        <table>
          <thead><tr><th style="width: 30%">Factor</th><th>Impact / Risk</th></tr></thead>
          <tbody>${marketData.swotAnalysis?.opportunities.map(s => `<tr><td style="font-weight:bold">${s.factor}</td><td>${s.impact}</td></tr>`).join('')}</tbody>
        </table>
      </div>

      <div class="sub-heading">Threats</div>
      <div class="table-container">
        <table>
          <thead><tr><th style="width: 30%">Factor</th><th>Impact / Risk</th></tr></thead>
          <tbody>${marketData.swotAnalysis?.threats.map(s => `<tr><td style="font-weight:bold">${s.factor}</td><td>${s.impact}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </div>

    <div class="page-break">
      <h2 class="section-title">Strategic Recommendations</h2>
      ${marketData.strategicRecommendations?.map(rec => `
        <div class="strategy-card">
          <h4>${rec.title}</h4>
          <div class="strategy-meta">Timeline: ${rec.timeline} | Investment: ${rec.investment}</div>
          <ul>
            ${rec.steps.map(step => `<li>${step}</li>`).join('')}
          </ul>
        </div>
      `).join('') || ''}
    </div>

    <div class="page-break">
      <h2 class="section-title">Key Performance Indicators (KPIs)</h2>
      <p class="text-muted">The following KPIs serve as high-level benchmarks to track adoption, scale, and strategic effectiveness.</p>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Metric</th>
              <th>Baseline</th>
              <th>6M Target</th>
              <th>12M Target</th>
              <th>Frequency</th>
            </tr>
          </thead>
          <tbody>
            ${marketData.kpiFramework?.map(k => `
              <tr>
                <td style="font-weight: bold;">${k.category}</td>
                <td style="font-weight: bold;">${k.metric}</td>
                <td>${k.baseline}</td>
                <td>${k.target_6m}</td>
                <td>${k.target_12m}</td>
                <td>${k.frequency}</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>
      </div>
    </div>
    ` : ''}

    <!-- BRAND FRAMEWORK SECTIONS -->
    ${sectionsHtml}

    <!-- REFERENCE APPENDIX -->
    <div class="page-break">
      <h2 class="section-title">VMV8 Competitive Advantage Reference</h2>
      <p class="text-muted">The Superpower is the unique differentiator that makes a brand extraordinary. It is derived from the intersection of Purpose + USP. Below are the finite competitive advantage options from the VMV8 framework.</p>
      
      <div class="sub-heading">Ancient Tactics</div>
      <div class="table-container">
        <table>
          <thead><tr><th style="width:30%">Competitive Advantage</th><th>Description</th></tr></thead>
          <tbody>
            ${SUPERPOWER_TACTICS.ancient.map(t => `<tr><td class="col-field">${t.name}</td><td>${t.desc}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div class="sub-heading">Post-Digital Tactics</div>
      <div class="table-container">
        <table>
          <thead><tr><th style="width:30%">Competitive Advantage</th><th>Description</th></tr></thead>
          <tbody>
            ${SUPERPOWER_TACTICS.postDigital.map(t => `<tr><td class="col-field">${t.name}</td><td>${t.desc}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="page-break">
      <h2 class="section-title">Archetype Reference Guide</h2>
      <p class="text-muted">The 12 brand archetypes define a brand's voice, tone, and emotional resonance. Each archetype maps to a unique Archetone — the emotional signature derived from Plutchik's Emotion Wheel.</p>
      <div class="table-container">
        <table>
          <thead><tr><th style="width:30%">Archetype</th><th>Description & Archetone</th></tr></thead>
          <tbody>
            ${Object.entries(ARCHETYPE_DESCRIPTIONS).map(([name, desc]) => `<tr><td class="col-field">${name}</td><td>${desc}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="doc-footer">
      Generated by Brandy — The VMV8 Framework
    </div>

  </div>
</body>
</html>
  `;
}