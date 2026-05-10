// ─── MARK PANEL (Market Research Agent) ──────────────────────────────
// Standalone UI panel for market research agent "Mark"
// Displays research results, metrics dashboard, sources, and follow-up chat

import type { MarketData } from '../services/market.service';
import type { FirecrawlMarketResult } from '../services/firecrawl.service';

export function renderMarkPanel(
  container: HTMLElement,
  marketData: MarketData | null,
  firecrawlResults: FirecrawlMarketResult[],
  isLoading: boolean,
  onRunResearch: () => void,
  onAskFollowUp: (question: string) => void
): void {
  if (isLoading) {
    container.innerHTML = `
      <div class="mark-loading">
        <div class="mark-loading-spinner"></div>
        <h3>Mark is researching your market...</h3>
        <p>Searching web sources, collecting data, and preparing analysis.</p>
        <div class="mark-loading-progress">
          <div class="mark-loading-bar" id="mark-loading-bar"></div>
        </div>
        <p class="mark-loading-status" id="mark-loading-status">Initializing...</p>
      </div>
    `;
    return;
  }

  if (!marketData) {
    container.innerHTML = `
      <div class="mark-empty">
        <div class="mark-empty-icon">📊</div>
        <h3>Market Intelligence</h3>
        <p>Run market research to generate a comprehensive analysis of your industry, competitors, and target market.</p>
        <p class="mark-empty-sub">Mark will search real data sources, analyze quantitative metrics, and build a complete market intelligence report.</p>
        <button class="btn-mark-run" id="btn-mark-run">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Run Market Research
        </button>
        <p class="mark-empty-note">Uses Firecrawl web search + Gemini AI analysis</p>
      </div>
    `;

    container.querySelector('#btn-mark-run')?.addEventListener('click', onRunResearch);
    return;
  }

  // Build the full dashboard
  const totalSources = firecrawlResults.reduce((sum, r) => sum + r.sources.length, 0);
  const highQualityCount = firecrawlResults.reduce((sum, r) =>
    sum + r.sources.filter(s => {
      const scored = (s as any).qualityScore;
      return scored >= 2;
    }).length, 0);

  // Build extracted metrics cards
  const metricsHtml = marketData.extractedMetrics && marketData.extractedMetrics.length > 0
    ? marketData.extractedMetrics.slice(0, 12).map(m => `
      <div class="mark-metric-card">
        <div class="mark-metric-value">${escapeHtml(m.value)}</div>
        <div class="mark-metric-label">${escapeHtml(m.label)}</div>
      </div>
    `).join('')
    : '<p class="mark-no-metrics">No quantitative metrics extracted from sources.</p>';

  // Build source quality distribution
  const sourceQualityHtml = firecrawlResults.length > 0
    ? firecrawlResults.map((result, idx) => {
        const sources = result.sources as any[];
        const high = sources.filter(s => s.qualityScore >= 3).length;
        const med = sources.filter(s => s.qualityScore === 2).length;
        const low = sources.filter(s => s.qualityScore <= 1).length;
        return `
          <div class="mark-quality-row">
            <span class="mark-quality-label">${result.query.slice(0, 40)}...</span>
            <div class="mark-quality-bars">
              <span class="mark-quality-bar high" style="width:${Math.max(high, 5)}px" title="${high} official sources"></span>
              <span class="mark-quality-bar medium" style="width:${Math.max(med, 5)}px" title="${med} reputable sources"></span>
              <span class="mark-quality-bar low" style="width:${Math.max(low, 5)}px" title="${low} general sources"></span>
            </div>
            <span class="mark-quality-count">${sources.length}</span>
          </div>
        `;
      }).join('')
    : '';

  // Build SWOT mini cards
  const swotHtml = `
    <div class="mark-swot-grid">
      ${buildSwotMini('Strengths', marketData.swotAnalysis?.strengths || [], 'var(--accent-green)')}
      ${buildSwotMini('Weaknesses', marketData.swotAnalysis?.weaknesses || [], 'var(--accent-orange)')}
      ${buildSwotMini('Opportunities', marketData.swotAnalysis?.opportunities || [], 'var(--accent-amber)')}
      ${buildSwotMini('Threats', marketData.swotAnalysis?.threats || [], 'var(--accent-red)')}
    </div>
  `;

  // Build competitor cards
  const competitorHtml = marketData.competitivePositioning?.competitors && marketData.competitivePositioning.competitors.length > 0
    ? marketData.competitivePositioning.competitors.map(c => `
      <div class="mark-competitor-card">
        <div class="mark-competitor-header">
          <span class="mark-competitor-archetype">${escapeHtml(c.archetype)}</span>
          <span class="mark-competitor-share">${c.market_share} share</span>
        </div>
        <div class="mark-competitor-details">
          <div class="mark-competitor-row">
            <span class="mark-competitor-label">Pricing:</span>
            <span>${c.price_tier}</span>
          </div>
          <div class="mark-competitor-row">
            <span class="mark-competitor-label">Strength:</span>
            <span class="mark-competitor-positive">${escapeHtml(c.strength)}</span>
          </div>
          <div class="mark-competitor-row">
            <span class="mark-competitor-label">Weakness:</span>
            <span class="mark-competitor-negative">${escapeHtml(c.weakness)}</span>
          </div>
        </div>
      </div>
    `).join('')
    : '<p class="mark-no-data">No competitor data available.</p>';

  // Build KPI table
  const kpiHtml = marketData.kpiFramework && marketData.kpiFramework.length > 0
    ? marketData.kpiFramework.map(k => `
      <div class="mark-kpi-row">
        <span class="mark-kpi-category">${escapeHtml(k.category)}</span>
        <span class="mark-kpi-metric">${escapeHtml(k.metric)}</span>
        <span class="mark-kpi-baseline">${escapeHtml(k.baseline)}</span>
        <span class="mark-kpi-target">${escapeHtml(k.target_6m)}</span>
        <span class="mark-kpi-target mark-kpi-target-12m">${escapeHtml(k.target_12m)}</span>
        <span class="mark-kpi-freq">${escapeHtml(k.frequency)}</span>
      </div>
    `).join('')
    : '<p class="mark-no-data">No KPI framework generated.</p>';

  container.innerHTML = `
    <div class="mark-panel-inner">
      <!-- Mark Header -->
      <div class="mark-header">
        <div class="mark-header-info">
          <div class="mark-agent-badge">AGENT 02 — MARK</div>
          <h2>Market Intelligence Dashboard</h2>
          <p class="mark-subtitle">Quantitative analysis powered by Firecrawl + Gemini AI</p>
        </div>
        <button class="btn-mark-run mark-run-top" id="btn-mark-refresh">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 15a9 9 0 0 0 2.13-9.36L1 10"/><path d="M20.49 9a9 9 0 0 0-2.13 9.36L23 14"/></svg>
          Refresh Research
        </button>
      </div>

      <!-- Status Bar -->
      <div class="mark-status-bar">
        <div class="mark-status-item">
          <span class="mark-status-number">${totalSources}</span>
          <span class="mark-status-label">Sources Found</span>
        </div>
        <div class="mark-status-item">
          <span class="mark-status-number">${highQualityCount}</span>
          <span class="mark-status-label">High Quality</span>
        </div>
        <div class="mark-status-item">
          <span class="mark-status-number">${marketData.extractedMetrics?.length || 0}</span>
          <span class="mark-status-label">Metrics Extracted</span>
        </div>
        <div class="mark-status-item">
          <span class="mark-status-number">${marketData.competitivePositioning?.competitors?.length || 0}</span>
          <span class="mark-status-label">Competitors</span>
        </div>
      </div>

      <!-- Ticker Tape: Rolling metrics -->
      ${marketData.extractedMetrics && marketData.extractedMetrics.length > 0 ? `
      <div class="mark-ticker">
        <div class="mark-ticker-track">
          ${marketData.extractedMetrics.map(m => `
            <span class="mark-ticker-item">
              <span class="mark-ticker-value">${escapeHtml(m.value)}</span>
              <span class="mark-ticker-label">${escapeHtml(m.label)}</span>
            </span>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Key Metrics Grid -->
      <div class="mark-section">
        <h3 class="mark-section-title">📈 Key Metrics</h3>
        <div class="mark-metrics-grid">
          ${metricsHtml}
        </div>
      </div>

      <!-- Market Sizing -->
      <div class="mark-section">
        <h3 class="mark-section-title">📐 Market Sizing (TAM / SAM / SOM)</h3>
        <div class="mark-sizing-grid">
          <div class="mark-sizing-card">
            <div class="mark-sizing-label">TAM</div>
            <div class="mark-sizing-value">${marketData.marketSizing?.tam?.value || 'N/A'}</div>
            <div class="mark-sizing-desc">${marketData.marketSizing?.tam?.description || ''}</div>
          </div>
          <div class="mark-sizing-card">
            <div class="mark-sizing-label">SAM</div>
            <div class="mark-sizing-value">${marketData.marketSizing?.sam?.value || 'N/A'}</div>
            <div class="mark-sizing-desc">${marketData.marketSizing?.sam?.description || ''}</div>
          </div>
          <div class="mark-sizing-card">
            <div class="mark-sizing-label">SOM</div>
            <div class="mark-sizing-value">${marketData.marketSizing?.som?.value || 'N/A'}</div>
            <div class="mark-sizing-desc">${marketData.marketSizing?.som?.description || ''}</div>
          </div>
          <div class="mark-sizing-card mark-sizing-cagr">
            <div class="mark-sizing-label">CAGR</div>
            <div class="mark-sizing-value mark-cagr-value">${marketData.marketSizing?.growth_cagr || 'N/A'}</div>
            <div class="mark-sizing-desc">Growth rate</div>
          </div>
        </div>
      </div>

      <!-- SWOT Analysis -->
      <div class="mark-section">
        <h3 class="mark-section-title">🎯 SWOT Analysis</h3>
        ${swotHtml}
      </div>

      <!-- Competitive Landscape -->
      <div class="mark-section">
        <h3 class="mark-section-title">🏁 Competitive Landscape</h3>
        <div class="mark-competitors-grid">
          ${competitorHtml}
        </div>
      </div>

      <!-- KPI Framework -->
      <div class="mark-section">
        <h3 class="mark-section-title">📏 KPI Framework</h3>
        <div class="mark-kpi-header">
          <span>Category</span>
          <span>Metric</span>
          <span>Baseline</span>
          <span>6M Target</span>
          <span>12M Target</span>
          <span>Freq</span>
        </div>
        <div class="mark-kpi-body">
          ${kpiHtml}
        </div>
      </div>

      <!-- Segmentation -->
      <div class="mark-section">
        <h3 class="mark-section-title">👥 Target Segmentation</h3>
        <div class="mark-segment-grid">
          <div class="mark-segment-card">
            <h4>${marketData.targetMarketSegmentation?.primary?.name || 'Primary'}</h4>
            <p class="mark-segment-desc">${marketData.targetMarketSegmentation?.primary?.description || 'N/A'}</p>
            <div class="mark-segment-detail">
              <strong>Demographics:</strong> ${marketData.targetMarketSegmentation?.primary?.demographics || 'N/A'}
            </div>
            <div class="mark-segment-detail">
              <strong>Psychographics:</strong> ${marketData.targetMarketSegmentation?.primary?.psychographics || 'N/A'}
            </div>
          </div>
          <div class="mark-segment-card">
            <h4>${marketData.targetMarketSegmentation?.secondary?.name || 'Secondary'}</h4>
            <p class="mark-segment-desc">${marketData.targetMarketSegmentation?.secondary?.description || 'N/A'}</p>
            <div class="mark-segment-detail">
              <strong>Demographics:</strong> ${marketData.targetMarketSegmentation?.secondary?.demographics || 'N/A'}
            </div>
            <div class="mark-segment-detail">
              <strong>Psychographics:</strong> ${marketData.targetMarketSegmentation?.secondary?.psychographics || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      <!-- Source Quality -->
      <div class="mark-section">
        <h3 class="mark-section-title">🔍 Source Quality Analysis</h3>
        <div class="mark-quality-container">
          ${sourceQualityHtml || '<p class="mark-no-data">No sources analyzed yet.</p>'}
        </div>
      </div>

      <!-- Sources List -->
      <div class="mark-section">
        <h3 class="mark-section-title">🔗 Data Sources (${totalSources})</h3>
        <div class="mark-sources-list">
          ${firecrawlResults.map((result, idx) =>
            result.sources.map((s, si) => {
              const qualityTag = (s as any).qualityScore >= 3 ? 'badge-official' : (s as any).qualityScore >= 2 ? 'badge-reputable' : 'badge-general';
              return `
                <a href="${s.url}" target="_blank" rel="noopener" class="mark-source-item">
                  <span class="mark-source-quality ${qualityTag}">${qualityTag.replace('badge-', '')}</span>
                  <span class="mark-source-title">${escapeHtml(s.title)}</span>
                  <span class="mark-source-url">${s.url.slice(0, 60)}...</span>
                </a>
              `;
            }).join('')
          ).join('')}
        </div>
      </div>

      <!-- Strategic Recommendations -->
      <div class="mark-section">
        <h3 class="mark-section-title">💡 Strategic Recommendations</h3>
        <div class="mark-recommendations">
          ${marketData.strategicRecommendations?.map(rec => `
            <div class="mark-rec-card">
              <div class="mark-rec-header">
                <h4>${escapeHtml(rec.title)}</h4>
                <span class="mark-rec-priority mark-priority-${rec.priority?.toLowerCase()}">${rec.priority}</span>
              </div>
              <div class="mark-rec-meta">
                <span>Timeline: ${rec.timeline}</span>
                <span>Investment: ${rec.investment}</span>
                <span>ROI: ${rec.roi}</span>
              </div>
              <ul class="mark-rec-steps">
                ${rec.steps?.map(step => `<li>${escapeHtml(step)}</li>`).join('')}
              </ul>
            </div>
          `).join('') || '<p class="mark-no-data">No recommendations generated.</p>'}
        </div>
      </div>

      <!-- Executive Summary -->
      <div class="mark-section mark-section-executive">
        <h3 class="mark-section-title">📋 Executive Summary</h3>
        <div class="mark-executive-card">
          <p>${marketData.executiveSummary || 'No executive summary generated.'}</p>
        </div>
        <div class="mark-industry-metrics">
          ${(marketData.industryOverview?.metrics || []).map(m => `
            <div class="mark-industry-metric">
              <span class="mark-industry-metric-value">${m.value}</span>
              <span class="mark-industry-metric-label">${m.label}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Follow-up Chat Area -->
      <div class="mark-section mark-section-chat">
        <h3 class="mark-section-title">💬 Ask Mark (Follow-up Q&A)</h3>
        <div class="mark-chat-messages" id="mark-chat-messages">
          <div class="mark-chat-welcome">
            <p>Ask Mark any follow-up questions about the market research data above.</p>
            <p class="mark-chat-hint">e.g., "What's the main growth driver?", "Compare the top two competitors", "Explain the market sizing methodology"</p>
          </div>
        </div>
        <div class="mark-chat-input">
          <input type="text" id="mark-chat-input" placeholder="Ask Mark about the market research..." />
          <button class="btn-mark-send" id="btn-mark-send">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;

  // Wire up event listeners
  container.querySelector('#btn-mark-refresh')?.addEventListener('click', onRunResearch);
  container.querySelector('#btn-mark-send')?.addEventListener('click', () => {
    const input = container.querySelector('#mark-chat-input') as HTMLInputElement;
    if (input.value.trim()) {
      onAskFollowUp(input.value.trim());
      input.value = '';
    }
  });
  container.querySelector('#mark-chat-input')?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      const input = container.querySelector('#mark-chat-input') as HTMLInputElement;
      if (input.value.trim()) {
        onAskFollowUp(input.value.trim());
        input.value = '';
      }
    }
  });
}

function buildSwotMini(title: string, items: { factor: string; impact: string }[], color: string): string {
  return `
    <div class="mark-swot-card">
      <div class="mark-swot-title" style="background: ${color}">${title}</div>
      <div class="mark-swot-list">
        ${items.slice(0, 4).map(item => `
          <div class="mark-swot-item">
            <strong>${escapeHtml(item.factor)}</strong>
            <span>${escapeHtml(item.impact)}</span>
          </div>
        `).join('')}
        ${items.length === 0 ? '<p class="mark-no-data">No data available</p>' : ''}
      </div>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}