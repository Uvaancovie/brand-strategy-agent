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
    .replace(/### ([^\n\r]+)/g, '<h4 class="context-subheading">$1</h4>')
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
      <div class="page-break section-block avoid-break">
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
<div id="pdf-export-container" style="background: white; color: #101010; font-family: 'Source Sans 3', sans-serif;">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Source+Sans+3:wght@300;400;600;700&display=swap');
    :root {
      --ink: #101010;
      --ink-muted: #5a5a5a;
      --border: #d8d8d8;
      --paper: #ffffff;
      --shade: #f6f6f6;
    }

    * { box-sizing: border-box; }

    .document {
      width: 210mm;
      margin: 0 auto;
      background: var(--paper);
      padding: 15mm;
      color: var(--ink);
      line-height: 1.65;
    }
    
    .page-break { 
      page-break-before: always; 
      break-before: page;
      margin-top: 15mm;
    }
    .avoid-break,
    .section-block,
    .table-container,
    table,
    thead,
    tbody,
    tr,
    td,
    th {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    h1, h2, h3, h4 { font-family: 'Cormorant Garamond', serif; color: var(--ink); margin-top: 0; }
    
    /* Cover Page */
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      min-height: 250mm;
      background-color: var(--paper);
      color: var(--ink);
      padding: 40px;
      position: relative;
      overflow: hidden;
    }
    .accent-image {
      position: absolute;
      pointer-events: none;
      z-index: 0;
    }
    .cover-accent {
      bottom: 0;
      right: 0;
      width: 240px;
      opacity: 0.85;
      filter: brightness(0) saturate(100%);
    }
    .market-section {
      position: relative;
      overflow: hidden;
    }
    .market-accent {
      bottom: 0;
      right: 0;
      width: 240px;
      opacity: 0.85;
      filter: brightness(0) saturate(100%);
    }
    .section-layer {
      position: relative;
      z-index: 1;
    }
    .cover-top-rule {
      position: absolute;
      top: 28px;
      left: 15mm;
      right: 15mm;
      border-top: 1px solid var(--ink);
    }
    .cover-eyebrow {
      font-size: 0.7rem;
      letter-spacing: 3px;
      color: var(--ink);
      margin-bottom: 2.5rem;
      text-transform: uppercase;
      font-weight: 600;
    }
    .cover-title {
      font-size: 4.2rem;
      font-weight: 700;
      letter-spacing: 1px;
      line-height: 1.05;
      margin-bottom: 1rem;
      text-transform: uppercase;
      color: var(--ink);
    }
    .cover-brand {
      font-size: 1.4rem;
      font-weight: 400;
      color: var(--ink);
      margin-bottom: 3rem;
      letter-spacing: 1px;
    }
    .cover-grid {
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      padding: 1.5rem 0;
      margin-bottom: 3rem;
      width: 80%;
      display: flex;
      justify-content: space-around;
      flex-wrap: wrap;
      font-family: 'Source Sans 3', sans-serif;
    }
    .cover-grid span {
      font-size: 0.7rem;
      letter-spacing: 2px;
      color: var(--ink-muted);
      text-transform: uppercase;
      padding: 0.35rem 0.6rem;
    }
    .cover-date {
      font-weight: 600;
      font-size: 0.95rem;
      color: var(--ink);
      letter-spacing: 1px;
    }
    .cover-confidential {
      font-size: 0.65rem;
      color: var(--ink-muted);
      margin-top: 0.75rem;
      letter-spacing: 2px;
    }
    
    /* Document Sections */
    .section-title {
      font-size: 1.85rem;
      font-weight: 700;
      color: var(--ink);
      border-bottom: 1px solid var(--ink);
      padding-bottom: 0.5rem;
      margin-bottom: 1.5rem;
      display: flex;
      gap: 0.75rem;
      align-items: center;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .section-title .icon { color: var(--ink); }
    
    .sub-heading {
      font-size: 1.1rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 2.2rem;
      margin-bottom: 0.8rem;
      color: var(--ink);
      display: flex;
      align-items: center;
    }
    .sub-heading::before {
      content: "";
      display: inline-block;
      width: 6px;
      height: 6px;
      background-color: var(--ink);
      border-radius: 50%;
      margin-right: 10px;
    }
    
    p { margin-top: 0; margin-bottom: 1.25rem; font-size: 0.98rem; color: var(--ink-muted); }
    
    .text-muted { color: var(--ink-muted); font-style: italic; font-size: 0.9rem; }
    
    /* Context Styling */
    .context-subheading {
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--brand-charcoal);
      margin-top: 1.5rem;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1px solid var(--light-gray);
      padding-bottom: 0.25rem;
    }
    .context-block {
      background: var(--shade);
      border-left: 3px solid var(--ink);
      padding: 1.2rem;
      margin-bottom: 2rem;
      font-size: 0.92rem;
      border-radius: 0 6px 6px 0;
    }
    
    /* Grids & Cards */
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .metric-box {
      background: var(--paper);
      border: 1px solid var(--border);
      border-top: 3px solid var(--ink);
      border-radius: 4px;
      padding: 1.2rem;
      box-shadow: none;
      text-align: center;
    }
    .metric-box-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--ink-muted);
      margin-bottom: 0.6rem;
      font-weight: 600;
    }
    .metric-box-val {
      font-size: 1.4rem;
      font-weight: 600;
      color: var(--ink);
    }
    
    /* Tables */
    .table-container {
      margin-bottom: 2.2rem;
      border-radius: 4px;
      overflow: hidden;
      box-shadow: none;
      border: 1px solid var(--border);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95rem;
      background: var(--white);
    }
    th, td {
      padding: 0.95rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }
    th {
      background-color: var(--ink);
      color: var(--paper);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-size: 0.7rem;
    }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) { background-color: #fbfbfb; }
    .col-field { font-weight: 600; width: 22%; color: var(--ink); }
    .col-desc { font-style: italic; color: var(--ink-muted); width: 28%; font-size: 0.8rem; }
    .col-value { width: 50%; color: var(--ink); }
    
    /* Strategic Output specific */
    .strategy-card {
      background: var(--paper);
      border: 1px solid var(--border);
      border-left: 3px solid var(--ink);
      border-radius: 4px;
      padding: 1.2rem;
      margin-bottom: 1.4rem;
      box-shadow: none;
    }
    .strategy-card h4 {
      margin-bottom: 0.5rem;
      font-size: 1.15rem;
      color: var(--ink);
      font-weight: 600;
    }
    .strategy-meta {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--paper);
      background: var(--ink);
      padding: 3px 8px;
      border-radius: 3px;
      margin-bottom: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    ul { margin: 0 0 1rem 0; padding-left: 1.5rem; color: var(--brand-slate); }
    li { margin-bottom: 0.75rem; }
    li::marker { color: var(--ink); font-weight: bold; }

    /* Footer / Date */
    .doc-footer {
      text-align: center;
      margin-top: 4rem;
      border-top: 1px solid var(--border);
      padding-top: 2rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--ink-muted);
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    
    /* SWOT Analysis specific */
    .swot-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-bottom: 2rem;
    }
    .swot-box {
      border-radius: 4px;
      overflow: hidden;
      border: 1px solid var(--border);
    }
    .swot-header {
      padding: 0.9rem;
      font-weight: 700;
      color: var(--paper);
      text-transform: uppercase;
      letter-spacing: 1px;
      background: var(--ink);
    }
    .swot-s .swot-header { background: var(--ink); }
    .swot-w .swot-header { background: #333333; }
    .swot-o .swot-header { background: #555555; }
    .swot-t .swot-header { background: #777777; }
    
    .swot-content {
      padding: 0;
      background: var(--white);
    }
    .swot-table {
      width: 100%;
      margin: 0;
    }
    .swot-table th { display: none; } /* Hide headers inside grid to save space */
    .swot-table td { padding: 0.7rem 0.9rem; border-bottom: 1px solid var(--border); font-size: 0.85rem; }
    .swot-table tr:last-child td { border-bottom: none; }
  </style>

  <div class="document">
    
    <!-- COVER PAGE -->
    <div class="cover-page">
      <img class="accent-image cover-accent" src="/src/assets/assets-for-pdf/brand-strategy-accent.png" alt="" />
      <div class="section-layer">
      <div class="cover-top-rule"></div>
      <div class="cover-eyebrow">Volcanic Marketing</div>
      <h1 class="cover-title">Brand<br>Strategy</h1>
      <div class="cover-brand">${resolvedBrandName}</div>
      <div class="cover-grid">
        <span>Name • Purpose • Vision</span>
        <span>Character • Values • Cause</span>
        <span>Voice • Tone • Archetype</span>
        <span>Creation • Product • Power</span>
      </div>
      <div class="cover-date">${date}</div>
      <div class="cover-confidential">CONFIDENTIAL STRATEGIC REPORT</div>
      </div>
    </div>

    <!-- EXECUTIVE SUMMARY -->
    <div class="page-break">
      <h2 class="section-title">Executive Summary</h2>
      <div class="strategy-card" style="border-left-color: var(--brand-orange);">
        <h4 style="font-size: 1.8rem; margin-bottom: 0.5rem;">${resolvedBrandName}</h4>
        <p style="margin: 0; font-size: 1.1rem; font-weight: 600; color: var(--brand-slate);">${resolvedTagline}</p>
      </div>
      <p style="font-size: 1.1rem; line-height: 1.8;">${formatText(marketData?.executiveSummary || '')}</p>
      <div style="background: var(--off-white); padding: 1rem; border-radius: 6px; margin-top: 2rem;">
        <p class="text-muted" style="margin: 0;">This document synthesizes your brand strategy framework (VMV8) with AI-generated market intelligence to provide a comprehensive brand identity guide. All market data should be validated with primary research.</p>
      </div>
    </div>

    <!-- CONTEXT SUMMARY -->
    <div class="page-break">
      <h2 class="section-title">Strategic Context</h2>
      ${contextPayload 
        ? `<div class="context-block"><p style="margin: 0;">${formatText(truncate(contextPayload, 3500))}</p></div>` 
        : '<div class="context-block" style="border-left-color: var(--brand-slate);"><p><em class="text-muted">No external context was provided for this baseline document.</em></p></div>'}
    </div>

    <!-- MARKET INTELLIGENCE -->
    ${marketData ? `
    <div class="page-break market-section">
      <img class="accent-image market-accent" src="/src/assets/assets-for-pdf/market-strategy-accent.png" alt="" />
      <div class="section-layer">
        <h2 class="section-title">Mark Market Research Dashboard</h2>
        <div class="strategy-card" style="border-left-color: var(--brand-orange);">
          <h4 style="font-size: 1.5rem; margin-bottom: 0.5rem;">Mark, Market Research Agent</h4>
          <p style="margin: 0;">Mark researched the user's industry and country, then translated the evidence into quantified market sizing, customer benchmarks, competitive pressure, and strategic next actions.</p>
        </div>
        <div class="metric-grid">
          <div class="metric-box">
            <div class="metric-box-label">TAM</div>
            <div class="metric-box-val">${marketData.marketSizing?.tam.value || 'N/A'}</div>
          </div>
          <div class="metric-box">
            <div class="metric-box-label">SAM</div>
            <div class="metric-box-val">${marketData.marketSizing?.sam.value || 'N/A'}</div>
          </div>
          <div class="metric-box">
            <div class="metric-box-label">SOM</div>
            <div class="metric-box-val">${marketData.marketSizing?.som.value || 'N/A'}</div>
          </div>
          <div class="metric-box">
            <div class="metric-box-label">Growth</div>
            <div class="metric-box-val">${marketData.marketSizing?.growth_cagr || 'N/A'}</div>
          </div>
        </div>
        ${marketData.strategicRecommendations?.[0] ? `
          <div class="strategy-card" style="border-left-color: var(--brand-amber);">
            <div class="strategy-meta">Strategic Recommendation</div>
            <h4 style="font-size: 1.4rem; color: var(--brand-charcoal);">${marketData.strategicRecommendations[0].title}</h4>
            <p><strong>Priority:</strong> ${marketData.strategicRecommendations[0].priority} &nbsp; <strong>Timeline:</strong> ${marketData.strategicRecommendations[0].timeline} &nbsp; <strong>ROI:</strong> ${marketData.strategicRecommendations[0].roi}</p>
            <ul style="margin-top: 1rem;">
              ${marketData.strategicRecommendations[0].steps.slice(0, 3).map(step => `<li>${step}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    </div>

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
      <div class="strategy-card" style="border-left: none; border-top: 4px solid var(--brand-charcoal);">
        <p style="margin: 0;">${formatText(marketData.industryOverview?.narrative || '')}</p>
      </div>
    </div>

    <div class="page-break">
      <h2 class="section-title">Market Sizing (TAM / SAM / SOM)</h2>
      <div class="metric-grid">
        <div class="metric-box" style="text-align: left; border-top-color: var(--brand-charcoal);">
          <div class="metric-box-label">TAM (Total Addressable Market)</div>
          <div class="metric-box-val">${marketData.marketSizing?.tam.value}</div>
          <p style="font-size: 0.85rem; margin-top: 0.75rem; margin-bottom: 0; color: var(--brand-slate);">${marketData.marketSizing?.tam.description}</p>
        </div>
        <div class="metric-box" style="text-align: left; border-top-color: var(--brand-orange);">
          <div class="metric-box-label">SAM (Serviceable Addressable Market)</div>
          <div class="metric-box-val">${marketData.marketSizing?.sam.value}</div>
          <p style="font-size: 0.85rem; margin-top: 0.75rem; margin-bottom: 0; color: var(--brand-slate);">${marketData.marketSizing?.sam.description}</p>
        </div>
        <div class="metric-box" style="text-align: left; border-top-color: var(--brand-amber);">
          <div class="metric-box-label">SOM (Serviceable Obtainable Market)</div>
          <div class="metric-box-val">${marketData.marketSizing?.som.value}</div>
          <p style="font-size: 0.85rem; margin-top: 0.75rem; margin-bottom: 0; color: var(--brand-slate);">${marketData.marketSizing?.som.description}</p>
        </div>
      </div>
      
      <div class="strategy-card" style="border-left-color: var(--brand-slate);">
        <div style="font-weight: 800; margin-bottom: 0.5rem; color: var(--brand-charcoal);">Penetration & Est. Growth</div>
        <p style="margin-bottom: 1rem;"><strong style="color: var(--brand-orange);">Estimated CAGR/Growth Factor:</strong> <span style="font-size: 1.1rem; font-weight: 600;">${marketData.marketSizing?.growth_cagr}</span></p>
        <p style="margin: 0;">${formatText(marketData.marketSizing?.narrative || '')}</p>
      </div>
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
      
      <div class="strategy-card" style="border-left-color: var(--brand-charcoal);">
        <h4 style="color: var(--brand-orange); text-transform: uppercase; font-size: 1rem; letter-spacing: 1px; margin-bottom: 0.5rem;">Primary Segment</h4>
        <h3 style="font-size: 1.4rem; margin-bottom: 1rem; font-weight: 800;">${marketData.targetMarketSegmentation?.primary.name}</h3>
        <p>${formatText(marketData.targetMarketSegmentation?.primary.description || '')}</p>
        
        <div style="background: var(--off-white); padding: 1rem; border-radius: 4px; margin-top: 1rem;">
          <p style="margin-bottom: 0.5rem;"><strong>Demographics:</strong> ${marketData.targetMarketSegmentation?.primary.demographics}</p>
          <p style="margin: 0;"><strong>Psychographics:</strong> ${marketData.targetMarketSegmentation?.primary.psychographics}</p>
        </div>
      </div>

      <div class="strategy-card" style="border-left-color: var(--brand-slate);">
        <h4 style="color: var(--brand-amber); text-transform: uppercase; font-size: 1rem; letter-spacing: 1px; margin-bottom: 0.5rem;">Secondary Segment</h4>
        <h3 style="font-size: 1.4rem; margin-bottom: 1rem; font-weight: 800;">${marketData.targetMarketSegmentation?.secondary.name}</h3>
        <p>${formatText(marketData.targetMarketSegmentation?.secondary.description || '')}</p>
        
        <div style="background: var(--off-white); padding: 1rem; border-radius: 4px; margin-top: 1rem;">
          <p style="margin-bottom: 0.5rem;"><strong>Demographics:</strong> ${marketData.targetMarketSegmentation?.secondary.demographics}</p>
          <p style="margin: 0;"><strong>Psychographics:</strong> ${marketData.targetMarketSegmentation?.secondary.psychographics}</p>
        </div>
      </div>
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
                <td style="font-weight: 800; color: var(--brand-orange);">${c.archetype}</td>
                <td><span style="background: var(--light-gray); padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 0.85rem;">${c.market_share}</span></td>
                <td>${c.price_tier}</td>
                <td>${c.strength}</td>
                <td>${c.weakness}</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>
      </div>
      
      <div class="sub-heading">Strategic Moat Analysis</div>
      <div class="context-block" style="border-left-color: var(--brand-charcoal); border-radius: 0;">
        <p style="margin: 0;">${formatText(marketData.competitivePositioning?.narrative || '')}</p>
      </div>
    </div>

    <div class="page-break">
      <h2 class="section-title">SWOT Analysis</h2>
      
      <div class="swot-grid">
        <!-- Strengths -->
        <div class="swot-box swot-s">
          <div class="swot-header">Strengths (Internal)</div>
          <div class="swot-content">
            <table class="swot-table">
              <tbody>
                ${marketData.swotAnalysis?.strengths.map(s => `<tr><td style="font-weight:700; width:45%;">${s.factor}</td><td style="color:var(--brand-slate);">${s.impact}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Weaknesses -->
        <div class="swot-box swot-w">
          <div class="swot-header">Weaknesses (Internal)</div>
          <div class="swot-content">
            <table class="swot-table">
              <tbody>
                ${marketData.swotAnalysis?.weaknesses.map(s => `<tr><td style="font-weight:700; width:45%;">${s.factor}</td><td style="color:var(--brand-slate);">${s.impact}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Opportunities -->
        <div class="swot-box swot-o">
          <div class="swot-header">Opportunities (External)</div>
          <div class="swot-content">
            <table class="swot-table">
              <tbody>
                ${marketData.swotAnalysis?.opportunities.map(s => `<tr><td style="font-weight:700; width:45%;">${s.factor}</td><td style="color:var(--brand-slate);">${s.impact}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Threats -->
        <div class="swot-box swot-t">
          <div class="swot-header">Threats (External)</div>
          <div class="swot-content">
            <table class="swot-table">
              <tbody>
                ${marketData.swotAnalysis?.threats.map(s => `<tr><td style="font-weight:700; width:45%;">${s.factor}</td><td style="color:var(--brand-slate);">${s.impact}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div class="page-break">
      <h2 class="section-title">Strategic Recommendations</h2>
      ${marketData.strategicRecommendations?.map(rec => `
        <div class="strategy-card" style="border-left-width: 6px;">
          <div class="strategy-meta">Timeline: ${rec.timeline} &nbsp;|&nbsp; Investment: ${rec.investment}</div>
          <h4 style="font-size: 1.4rem; color: var(--brand-charcoal);">${rec.title}</h4>
          <ul style="margin-top: 1rem;">
            ${rec.steps.map(step => `<li>${step}</li>`).join('')}
          </ul>
        </div>
      `).join('') || ''}
    </div>

    <div class="page-break">
      <h2 class="section-title">Key Performance Indicators (KPIs)</h2>
      <p class="text-muted" style="margin-bottom: 2rem;">The following KPIs serve as high-level benchmarks to track adoption, scale, and strategic effectiveness.</p>
      
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
                <td style="font-weight: 800; color: var(--brand-charcoal);">${k.category}</td>
                <td style="font-weight: 600; color: var(--brand-slate);">${k.metric}</td>
                <td><span style="background: var(--off-white); padding: 4px 8px; border-radius: 4px;">${k.baseline}</span></td>
                <td><span style="background: rgba(255,179,0,0.15); color: #B37D00; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${k.target_6m}</span></td>
                <td><span style="background: rgba(255,90,0,0.15); color: #CC4800; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${k.target_12m}</span></td>
                <td style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">${k.frequency}</td>
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
      <p class="text-muted" style="margin-bottom: 2rem;">The Superpower is the unique differentiator that makes a brand extraordinary. It is derived from the intersection of Purpose + USP. Below are the finite competitive advantage options from the VMV8 framework.</p>
      
      <div class="sub-heading">Ancient Tactics</div>
      <div class="table-container">
        <table>
          <thead><tr><th style="width:30%">Competitive Advantage</th><th>Description</th></tr></thead>
          <tbody>
            ${SUPERPOWER_TACTICS.ancient.map(t => `<tr><td class="col-field" style="color: var(--brand-orange);">${t.name}</td><td>${t.desc}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div class="sub-heading">Post-Digital Tactics</div>
      <div class="table-container">
        <table>
          <thead><tr><th style="width:30%">Competitive Advantage</th><th>Description</th></tr></thead>
          <tbody>
            ${SUPERPOWER_TACTICS.postDigital.map(t => `<tr><td class="col-field" style="color: var(--brand-amber);">${t.name}</td><td>${t.desc}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="page-break">
      <h2 class="section-title">Archetype Reference Guide</h2>
      <p class="text-muted" style="margin-bottom: 2rem;">The 12 brand archetypes define a brand's voice, tone, and emotional resonance. Each archetype maps to a unique Archetone — the emotional signature derived from Plutchik's Emotion Wheel.</p>
      
      <div class="table-container">
        <table>
          <thead><tr><th style="width:30%">Archetype</th><th>Description & Archetone</th></tr></thead>
          <tbody>
            ${Object.entries(ARCHETYPE_DESCRIPTIONS).map(([name, desc]) => `<tr><td class="col-field" style="color: var(--brand-charcoal);">${name}</td><td>${desc}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="doc-footer">
      Generated by Brandy — The VMV8 Framework
    </div>

  </div>
</div>
  `;
}
