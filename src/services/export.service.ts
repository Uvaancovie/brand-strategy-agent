// ─── B.I.G DOC EXPORT SERVICE ───────────────────────────────────────
// Generates a rich HTML document for download / PDF printing

import { FRAMEWORK } from '../config/framework';
import { state } from '../store/brandscript.store';

// ─── COUNTRY → CURRENCY MAP ─────────────────────────────────────────

const CURRENCY_MAP: Record<string, { code: string; symbol: string; name: string }> = {
  'South Africa':     { code: 'ZAR', symbol: 'R',   name: 'South African Rand' },
  'United States':    { code: 'USD', symbol: '$',   name: 'US Dollar' },
  'United Kingdom':   { code: 'GBP', symbol: '£',   name: 'British Pound' },
  'Australia':        { code: 'AUD', symbol: 'A$',  name: 'Australian Dollar' },
  'Canada':           { code: 'CAD', symbol: 'C$',  name: 'Canadian Dollar' },
  'Germany':          { code: 'EUR', symbol: '€',   name: 'Euro' },
  'France':           { code: 'EUR', symbol: '€',   name: 'Euro' },
  'Netherlands':      { code: 'EUR', symbol: '€',   name: 'Euro' },
  'Nigeria':          { code: 'NGN', symbol: '₦',   name: 'Nigerian Naira' },
  'Kenya':            { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  'Ghana':            { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
  'Zimbabwe':         { code: 'ZWL', symbol: 'Z$',  name: 'Zimbabwean Dollar' },
  'India':            { code: 'INR', symbol: '₹',   name: 'Indian Rupee' },
  'UAE':              { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  'Singapore':        { code: 'SGD', symbol: 'S$',  name: 'Singapore Dollar' },
  'New Zealand':      { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
};

function getCurrency(country: string): { code: string; symbol: string; name: string } {
  for (const [key, val] of Object.entries(CURRENCY_MAP)) {
    if (country.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return { code: 'USD', symbol: '$', name: 'US Dollar' };
}

// ─── HELPERS ─────────────────────────────────────────────────────────

function esc(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function val(sectionId: string, fieldId: string): string {
  return (state.brandscript as any)[sectionId]?.[fieldId] || '';
}

function formatDate(): string {
  const now = new Date();
  return now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getBusinessName(): string {
  // Try to pull business name from tagline context or admin fields
  const purpose = val('name', 'purpose');
  const tagline = val('name', 'tagline');
  return tagline || purpose?.split(' ').slice(0, 4).join(' ') || 'Your Business';
}

function getCompletionPct(): number {
  let total = 0, filled = 0;
  FRAMEWORK.forEach(s => {
    s.fields.forEach(f => {
      total++;
      if (val(s.id, f.id)) filled++;
    });
  });
  return Math.round((filled / total) * 100);
}

// ─── SECTION TABLE ───────────────────────────────────────────────────

function sectionTable(section: typeof FRAMEWORK[number], currency: { symbol: string; code: string }): string {
  const rows = section.fields.map(f => {
    let value = esc(val(section.id, f.id));
    // Inject currency symbol into finance-related fields
    if ((f.id === 'finance' || f.label.toLowerCase().includes('financ') || f.label.toLowerCase().includes('pric')) && value) {
      value = `<span class="currency-tag">${currency.code} (${currency.symbol})</span> ${value}`;
    }
    return `
      <tr>
        <td class="field-label">${esc(f.label)}</td>
        <td class="field-desc">${esc(f.description)}</td>
        <td class="field-value">${value || '<span class="empty">Not yet defined</span>'}</td>
      </tr>`;
  }).join('');

  const sectionDescriptions: Record<string, string> = {
    name:           'Defines the foundational story and identity of the brand — why it exists, who it serves, and how it introduces itself to the world.',
    character:      'The moral backbone of the business. These principles guide decisions, culture, and how the brand behaves when no one is watching.',
    intent:         'The strategic direction — where the brand is going, why it matters, and the promise it makes to the people it serves.',
    voice:          'How the brand speaks, what it sounds like, and the authority it holds in its market space.',
    creation:       'The tangible and intangible products/services the brand delivers, and what makes them extraordinary.',
    operation:      'The internal machinery — tools, processes, and systems that power day-to-day execution.',
    image:          'The visual identity and aesthetic language the brand uses to communicate non-verbally.',
    administration: 'The structural and financial foundation that keeps the business legally sound and economically viable.',
  };

  return `
    <section class="doc-section">
      <div class="section-header" style="border-left: 5px solid ${section.color}">
        <span class="section-icon" style="color:${section.color}">${section.icon}</span>
        <div>
          <h2 class="section-title">${esc(section.label)}</h2>
          <p class="section-desc">${sectionDescriptions[section.id] || ''}</p>
        </div>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:20%">Field</th>
            <th style="width:35%">What This Means</th>
            <th style="width:45%">Your Brand Answer</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}

// ─── STRATEGIC RECOMMENDATIONS ───────────────────────────────────────

function strategicRecommendations(currency: { symbol: string; code: string; name: string }): string {
  const archetype   = val('voice', 'archetype');
  const tone        = val('voice', 'tone');
  const vision      = val('intent', 'vision');
  const mission     = val('intent', 'mission');
  const superpower  = val('creation', 'superpower');
  const values      = val('character', 'values');
  const finance     = val('administration', 'finance');

  const recs = [
    archetype  ? `<li><strong>Lead with your ${esc(archetype)} archetype</strong> — apply this consistently across all brand touchpoints: website copy, social media, pitches, and packaging.</li>` : '',
    tone       ? `<li><strong>Tone in content:</strong> All written and spoken communication should reflect a <em>${esc(tone)}</em> emotional register — train your team to maintain this.</li>` : '',
    vision     ? `<li><strong>Align every initiative to your vision:</strong> "${esc(vision.slice(0, 120))}" — use this as the filter for strategic decisions.</li>` : '',
    mission    ? `<li><strong>Make your mission visible:</strong> Feature your mission statement prominently on your About page, proposals, and sales materials.</li>` : '',
    superpower ? `<li><strong>Amplify your superpower:</strong> "${esc(superpower.slice(0, 100))}" — this is your differentiator. Lead with it in marketing and sales.</li>` : '',
    values     ? `<li><strong>Codify your values:</strong> Turn these into a team pledge and hiring rubric — culture is built when values drive behaviour, not just posters.</li>` : '',
    finance    ? `<li><strong>Financial clarity (${currency.code}):</strong> Document all pricing in ${currency.name} (${currency.symbol}) for market consistency and investor readiness.</li>` : '',
    `<li><strong>B.I.G Doc review cadence:</strong> Revisit and update this document every 90 days to ensure brand alignment as the business scales.</li>`,
    `<li><strong>Content pillar strategy:</strong> Use your Topics of Authority to build a 3-month content calendar across LinkedIn, Instagram, or YouTube — consistency builds authority.</li>`,
  ].filter(Boolean).join('');

  return `
    <section class="doc-section strategic">
      <div class="section-header" style="border-left: 5px solid #F7C948">
        <span class="section-icon" style="color:#F7C948">⚡</span>
        <div>
          <h2 class="section-title">Strategic Recommendations</h2>
          <p class="section-desc">Actionable next steps derived from your brand strategy. These recommendations are tailored to your specific answers and should be actioned within the next 30–90 days.</p>
        </div>
      </div>
      <ul class="recs-list">${recs}</ul>
    </section>`;
}

// ─── KPIs ────────────────────────────────────────────────────────────

function kpiTable(currency: { symbol: string; code: string }): string {
  const kpis = [
    { kpi: 'Brand Awareness',        metric: 'Monthly reach / impressions',        target: '+20% QoQ',  tool: 'Meta/Google Analytics' },
    { kpi: 'Content Authority Score', metric: 'Avg. engagement rate per post',      target: '>3.5%',     tool: 'Native analytics' },
    { kpi: 'Lead Generation',        metric: 'New qualified leads per month',       target: 'Define monthly target', tool: 'CRM / HubSpot' },
    { kpi: 'Conversion Rate',        metric: 'Leads → paying clients',              target: '>15%',      tool: 'CRM pipeline' },
    { kpi: 'Revenue Growth',         metric: `Revenue in ${currency.code} per quarter`, target: '+25% QoQ', tool: 'Accounting software' },
    { kpi: 'Client Retention',       metric: 'Repeat client rate',                  target: '>60%',      tool: 'CRM' },
    { kpi: 'Net Promoter Score',     metric: 'Client satisfaction score',           target: '>50',       tool: 'Survey / Typeform' },
    { kpi: 'B.I.G Doc Completion',   metric: 'Framework fields completed',          target: '100%',      tool: 'VMV8 Agent' },
  ];

  const rows = kpis.map(k => `
    <tr>
      <td class="field-label">${k.kpi}</td>
      <td>${k.metric}</td>
      <td><span class="target-badge">${k.target}</span></td>
      <td>${k.tool}</td>
    </tr>`).join('');

  return `
    <section class="doc-section">
      <div class="section-header" style="border-left: 5px solid #4ECDC4">
        <span class="section-icon" style="color:#4ECDC4">📊</span>
        <div>
          <h2 class="section-title">Key Performance Indicators (KPIs)</h2>
          <p class="section-desc">These metrics should be reviewed monthly. They translate your brand strategy into measurable business outcomes. Adjust targets as your business matures.</p>
        </div>
      </div>
      <table class="data-table">
        <thead>
          <tr><th>KPI</th><th>What to Measure</th><th>Target</th><th>Tracking Tool</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────

export function exportBigDoc(country = 'South Africa'): void {
  const currency     = getCurrency(country);
  const businessName = getBusinessName();
  const dateStr      = formatDate();
  const pct          = getCompletionPct();
  const safeFileName = businessName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const fileName     = `BIG-Doc-${safeFileName}-${new Date().toISOString().slice(0, 10)}.html`;

  const sectionsHTML = FRAMEWORK.map(s => sectionTable(s, currency)).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>B.I.G Doc — ${esc(businessName)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&family=Inter:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --ink: #0a0a14;
    --ink2: #2c2c3e;
    --muted: #6b6b84;
    --border: #e0e0ea;
    --orange: #FF6B35;
    --gold: #F7C948;
    --page: #ffffff;
  }
  body { font-family: 'Inter', sans-serif; background: #f5f5f8; color: var(--ink); }
  .page { max-width: 960px; margin: 0 auto; background: var(--page); }

  /* ── COVER ── */
  .cover {
    min-height: 100vh;
    background: linear-gradient(155deg, #0a0a14 0%, #1a1a2e 60%, #16213e 100%);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 80px 60px;
    page-break-after: always;
    position: relative; overflow: hidden;
  }
  .cover::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse at 20% 30%, rgba(255,107,53,0.18) 0%, transparent 60%),
                radial-gradient(ellipse at 80% 70%, rgba(247,201,72,0.10) 0%, transparent 55%);
  }
  .cover-content { position: relative; z-index: 1; text-align: center; }
  .cover-badge {
    display: inline-block;
    padding: 6px 18px;
    border: 1px solid rgba(255,107,53,0.5);
    border-radius: 30px;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #FF6B35;
    margin-bottom: 32px;
  }
  .cover-title {
    font-family: 'Outfit', sans-serif;
    font-size: 3.5rem;
    font-weight: 900;
    color: #ffffff;
    line-height: 1.1;
    margin-bottom: 16px;
  }
  .cover-subtitle {
    font-family: 'Outfit', sans-serif;
    font-size: 1.1rem;
    color: rgba(255,255,255,0.5);
    margin-bottom: 48px;
  }
  .cover-business {
    display: inline-block;
    padding: 18px 48px;
    background: linear-gradient(135deg, #FF6B35, #F7C948);
    border-radius: 12px;
    font-family: 'Outfit', sans-serif;
    font-size: 1.8rem;
    font-weight: 800;
    color: #0a0a14;
    margin-bottom: 60px;
  }
  .cover-meta {
    display: flex; gap: 40px; justify-content: center;
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 32px;
  }
  .cover-meta-item { text-align: center; }
  .cover-meta-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.35); margin-bottom: 4px; }
  .cover-meta-value { font-size: 0.9rem; color: rgba(255,255,255,0.75); font-weight: 500; }
  .cover-completion {
    margin-top: 40px;
    font-size: 0.75rem;
    color: rgba(255,255,255,0.3);
  }
  .completion-bar {
    width: 200px; height: 3px;
    background: rgba(255,255,255,0.1);
    border-radius: 2px; margin: 8px auto 0;
    overflow: hidden;
  }
  .completion-fill {
    height: 100%;
    background: linear-gradient(90deg, #FF6B35, #F7C948);
    border-radius: 2px;
  }

  /* ── BODY ── */
  .doc-body { padding: 60px; }
  .toc { margin-bottom: 60px; page-break-after: always; }
  .toc h2 { font-family: 'Outfit', sans-serif; font-size: 1.4rem; font-weight: 700; margin-bottom: 20px; color: var(--ink); }
  .toc-item {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 0;
    border-bottom: 1px dashed var(--border);
    font-size: 0.9rem;
  }
  .toc-icon { font-size: 1rem; width: 24px; text-align: center; }
  .toc-label { flex: 1; font-weight: 500; }
  .toc-count { font-size: 0.75rem; color: var(--muted); }
  .toc-status { font-size: 0.7rem; padding: 2px 8px; border-radius: 20px; }
  .toc-status.complete { background: rgba(152,212,166,0.2); color: #4caf50; }
  .toc-status.partial  { background: rgba(247,201,72,0.15); color: #e6a817; }
  .toc-status.empty    { background: rgba(255,255,255,0.05); color: var(--muted); }

  /* ── SECTION ── */
  .doc-section { margin-bottom: 56px; page-break-inside: avoid; }
  .section-header {
    display: flex; align-items: flex-start; gap: 16px;
    padding: 20px 24px;
    background: #f8f8fc;
    border-radius: 12px 12px 0 0;
    margin-bottom: 0;
  }
  .section-icon { font-size: 1.6rem; line-height: 1; padding-top: 2px; }
  .section-title {
    font-family: 'Outfit', sans-serif;
    font-size: 1.25rem; font-weight: 700;
    color: var(--ink); margin-bottom: 4px;
  }
  .section-desc { font-size: 0.8rem; color: var(--muted); line-height: 1.5; }

  /* ── TABLE ── */
  .data-table {
    width: 100%; border-collapse: collapse;
    font-size: 0.85rem;
    border: 1px solid var(--border);
    border-top: none;
    border-radius: 0 0 12px 12px;
    overflow: hidden;
  }
  .data-table thead tr { background: #1a1a2e; color: #ffffff; }
  .data-table th {
    padding: 12px 16px;
    text-align: left;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .data-table tbody tr { border-bottom: 1px solid var(--border); }
  .data-table tbody tr:last-child { border-bottom: none; }
  .data-table tbody tr:nth-child(even) { background: #fafafa; }
  .data-table td { padding: 14px 16px; vertical-align: top; line-height: 1.55; }
  .field-label { font-weight: 600; color: var(--ink2); white-space: nowrap; }
  .field-desc  { color: var(--muted); font-size: 0.78rem; font-style: italic; }
  .field-value { color: var(--ink); }
  .empty { color: #c0c0d0; font-style: italic; }
  .currency-tag {
    display: inline-block;
    padding: 1px 6px;
    background: rgba(247,201,72,0.15);
    color: #b07d10;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
    margin-right: 4px;
  }
  .target-badge {
    display: inline-block;
    padding: 3px 10px;
    background: rgba(78,205,196,0.12);
    color: #2a8f89;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  /* ── STRATEGIC ── */
  .strategic .section-header { background: #fffbf0; }
  .recs-list { padding: 24px 28px; border: 1px solid var(--border); border-top: none; border-radius: 0 0 12px 12px; }
  .recs-list li {
    padding: 10px 0;
    border-bottom: 1px dashed var(--border);
    line-height: 1.6;
    font-size: 0.88rem;
    color: var(--ink2);
  }
  .recs-list li:last-child { border-bottom: none; }
  .recs-list li strong { color: var(--ink); }

  /* ── FOOTER ── */
  .doc-footer {
    margin-top: 80px;
    padding: 32px 60px;
    background: #0a0a14;
    text-align: center;
    color: rgba(255,255,255,0.3);
    font-size: 0.75rem;
    line-height: 1.8;
  }
  .doc-footer strong { color: rgba(255,255,255,0.6); }

  @media print {
    body { background: white; }
    .cover { page-break-after: always; }
    .doc-section { page-break-inside: avoid; }
    .toc { page-break-after: always; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- COVER -->
  <div class="cover">
    <div class="cover-content">
      <div class="cover-badge">🌋 VMV8 Brand Strategy Framework</div>
      <h1 class="cover-title">Brand Identity<br>Guiding Document</h1>
      <p class="cover-subtitle">B.I.G Doc — Powered by Brandy, the VMV8 Brand Strategy Agent</p>
      <div class="cover-business">${esc(businessName)}</div>
      <div class="cover-meta">
        <div class="cover-meta-item">
          <div class="cover-meta-label">Generated On</div>
          <div class="cover-meta-value">${dateStr}</div>
        </div>
        <div class="cover-meta-item">
          <div class="cover-meta-label">Framework</div>
          <div class="cover-meta-value">VMV8 · 8 Sections</div>
        </div>
        <div class="cover-meta-item">
          <div class="cover-meta-label">Market Currency</div>
          <div class="cover-meta-value">${currency.symbol} ${currency.code} — ${currency.name}</div>
        </div>
      </div>
      <div class="cover-completion">
        Completion: ${pct}%
        <div class="completion-bar">
          <div class="completion-fill" style="width:${pct}%"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- BODY -->
  <div class="doc-body">

    <!-- TABLE OF CONTENTS -->
    <div class="toc">
      <h2>Contents</h2>
      ${FRAMEWORK.map(s => {
        const filled = s.fields.filter(f => val(s.id, f.id)).length;
        const status = filled === s.fields.length ? 'complete' : filled > 0 ? 'partial' : 'empty';
        const label  = filled === s.fields.length ? '✓ Complete' : filled > 0 ? `${filled}/${s.fields.length} filled` : 'Not started';
        return `<div class="toc-item">
          <span class="toc-icon">${s.icon}</span>
          <span class="toc-label">${esc(s.label)}</span>
          <span class="toc-count">${s.fields.length} fields</span>
          <span class="toc-status ${status}">${label}</span>
        </div>`;
      }).join('')}
      <div class="toc-item">
        <span class="toc-icon">⚡</span>
        <span class="toc-label">Strategic Recommendations</span>
        <span class="toc-count"></span>
        <span class="toc-status complete">Included</span>
      </div>
      <div class="toc-item">
        <span class="toc-icon">📊</span>
        <span class="toc-label">Key Performance Indicators</span>
        <span class="toc-count">8 KPIs</span>
        <span class="toc-status complete">Included</span>
      </div>
    </div>

    <!-- FRAMEWORK SECTIONS -->
    ${sectionsHTML}

    <!-- STRATEGIC RECOMMENDATIONS -->
    ${strategicRecommendations(currency)}

    <!-- KPIs -->
    ${kpiTable(currency)}

  </div>

  <!-- FOOTER -->
  <div class="doc-footer">
    <strong>${esc(businessName)}</strong> · B.I.G Doc generated on ${dateStr}<br>
    Powered by <strong>Brandy — VMV8 Brand Strategy Agent</strong> · Volcanic Marketing<br>
    Market Currency: <strong>${currency.name} (${currency.symbol})</strong>
  </div>

</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
