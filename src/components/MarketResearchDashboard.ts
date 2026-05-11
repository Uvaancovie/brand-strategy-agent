// ─── MARKET RESEARCH DASHBOARD ───────────────────────────────────────
// Interactive dashboard for visualizing market research data with charts and figures

import { state, saveSession } from '../store/brandscript.store';
import { fetchMarketResearchForDisplay, formatMarketDataForCharts, hasValidMarketResearch } from '../services/market-dashboard.service';
import Chart from 'chart.js/auto';

export function renderMarketResearchDashboard(container: HTMLElement): void {
  const mr = state.marketResearch;

  // Header section
  const headerHtml = `
    <div class="mr-header">
      <div class="mr-header-content">
        <div class="mr-header-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
        </div>
        <div class="mr-header-text">
          <h2>Market Research Dashboard</h2>
          <p>Real-time market intelligence for ${state.userContext.industry || 'your industry'} in ${state.userContext.country || 'your country'}</p>
        </div>
      </div>
      <div class="mr-header-actions">
        <button id="mr-refresh-btn" class="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L23 10"></path>
          </svg>
          Refresh Research
        </button>
        ${mr.lastUpdated ? `<span class="mr-last-updated">Last updated: ${new Date(mr.lastUpdated).toLocaleString()}</span>` : ''}
      </div>
    </div>
  `;

  // Loading state
  if (mr.loading) {
    container.innerHTML = `
      ${headerHtml}
      <div class="mr-loading">
        <div class="mr-loading-spinner"></div>
        <div class="mr-loading-progress">
          <div class="mr-loading-bar">
            <div class="mr-loading-fill" style="width: 5%"></div>
          </div>
          <div class="mr-loading-pct">5%</div>
        </div>
        <div class="mr-loading-text">Initializing market research...</div>
        <div class="mr-loading-steps">
          <div class="mr-loading-step active">🔍 Searching web sources</div>
          <div class="mr-loading-step">🤖 AI analysis</div>
          <div class="mr-loading-step">📊 Generating insights</div>
          <div class="mr-loading-step">✅ Finalizing report</div>
        </div>
      </div>
    `;
    return;
  }

  // Error state
  if (mr.error) {
    container.innerHTML = `
      ${headerHtml}
      <div class="mr-error">
        <div class="mr-error-icon">⚠️</div>
        <div class="mr-error-title">Research Unavailable</div>
        <div class="mr-error-message">${mr.error}</div>
        <button id="mr-retry-btn" class="btn-secondary">Retry</button>
      </div>
    `;
    setTimeout(() => attachEventListeners(), 50);
    return;
  }

  // No data state or generate state
  if (!hasValidMarketResearch(mr.data)) {
    const hasContext = state.userContext.country && state.userContext.industry && state.userContext.profession;
    console.log('Rendering generate screen. Has context:', hasContext, 'Context:', state.userContext);

    container.innerHTML = `
      ${headerHtml}
      <div class="mr-generate-section">
        <div class="mr-generate-card">
          <div class="mr-generate-icon">🚀</div>
          <h2>Generate Market Research</h2>
          <p>Get comprehensive market intelligence for your business context. This will analyze industry trends, competitive positioning, and strategic opportunities.</p>

          ${!hasContext ? `
            <div class="mr-context-warning">
              <div class="mr-warning-icon">⚠️</div>
              <div class="mr-warning-text">
                <strong>Complete your context setup first:</strong>
                <div class="mr-requirements-list">
                  <div class="mr-requirement ${state.userContext.country ? 'complete' : 'incomplete'}">Country: ${state.userContext.country || 'Not selected'}</div>
                  <div class="mr-requirement ${state.userContext.industry ? 'complete' : 'incomplete'}">Industry: ${state.userContext.industry || 'Not selected'}</div>
                  <div class="mr-requirement ${state.userContext.profession ? 'complete' : 'incomplete'}">Profession: ${state.userContext.profession || 'Not selected'}</div>
                </div>
                <button class="btn-secondary mr-setup-context-btn">Set Up Context</button>
              </div>
            </div>
          ` : ''}

          <button id="mr-generate-btn" class="btn-primary mr-generate-btn" ${!hasContext ? 'disabled' : ''}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
            </svg>
            Generate Market Research
          </button>

          <div class="mr-generate-features">
            <div class="mr-feature">
              <div class="mr-feature-icon">📈</div>
              <div class="mr-feature-text">
                <strong>Market Sizing</strong>
                <span>TAM, SAM, SOM analysis</span>
              </div>
            </div>
            <div class="mr-feature">
              <div class="mr-feature-icon">🎯</div>
              <div class="mr-feature-text">
                <strong>Target Segmentation</strong>
                <span>Primary & secondary audiences</span>
              </div>
            </div>
            <div class="mr-feature">
              <div class="mr-feature-icon">🏆</div>
              <div class="mr-feature-text">
                <strong>Competitive Analysis</strong>
                <span>Positioning & SWOT insights</span>
              </div>
            </div>
            <div class="mr-feature">
              <div class="mr-feature-icon">📊</div>
              <div class="mr-feature-text">
                <strong>KPI Framework</strong>
                <span>Measurable success metrics</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    setTimeout(() => attachEventListeners(), 50);
    return;
  }

  // Main dashboard content
  const data = mr.data;
  const chartData = formatMarketDataForCharts(data);

  container.innerHTML = `
    ${headerHtml}
    
    <!-- Executive Summary -->
    <div class="mr-section">
      <div class="mr-section-header">
        <h3>📋 Executive Summary</h3>
      </div>
      <div class="mr-summary-card">
        <div class="mr-summary-text">${data.executiveSummary || 'No summary available'}</div>
        ${mr.sourcesCount > 0 ? `<div class="mr-summary-sources">Based on ${mr.sourcesCount} real market sources</div>` : ''}
      </div>
    </div>

    <!-- Industry Overview -->
    <div class="mr-section">
      <div class="mr-section-header">
        <h3>🏭 Industry Overview</h3>
      </div>
      <div class="mr-grid">
        <div class="mr-card mr-card-wide">
          <div class="mr-card-content">${data.industryOverview?.narrative || 'No overview available'}</div>
        </div>
        <div class="mr-card">
          <div class="mr-card-header">Key Metrics</div>
          <div class="mr-metrics-grid">
            ${chartData.industryMetrics.map((metric: any) => `
              <div class="mr-metric">
                <div class="mr-metric-label">${metric.label}</div>
                <div class="mr-metric-value">${metric.value}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- Market Sizing -->
    <div class="mr-section">
      <div class="mr-section-header">
        <h3>📈 Market Sizing</h3>
      </div>
      <div class="mr-grid">
        <div class="mr-card">
          <div class="mr-card-header">Market Size Funnel</div>
          <canvas id="market-sizing-chart" width="400" height="200"></canvas>
        </div>
        <div class="mr-card">
          <div class="mr-card-content">
            <div class="mr-market-sizing-item">
              <div class="mr-sizing-label">Total Addressable Market (TAM)</div>
              <div class="mr-sizing-value">${chartData.marketSizing?.tam || 'N/A'}</div>
              <div class="mr-sizing-desc">${data.marketSizing?.tam?.description || ''}</div>
            </div>
            <div class="mr-market-sizing-item">
              <div class="mr-sizing-label">Serviceable Addressable Market (SAM)</div>
              <div class="mr-sizing-value">${chartData.marketSizing?.sam || 'N/A'}</div>
              <div class="mr-sizing-desc">${data.marketSizing?.sam?.description || ''}</div>
            </div>
            <div class="mr-market-sizing-item">
              <div class="mr-sizing-label">Serviceable Obtainable Market (SOM)</div>
              <div class="mr-sizing-value">${chartData.marketSizing?.som || 'N/A'}</div>
              <div class="mr-sizing-desc">${data.marketSizing?.som?.description || ''}</div>
            </div>
            <div class="mr-market-sizing-growth">
              <div class="mr-sizing-label">5-Year CAGR</div>
              <div class="mr-sizing-value">${data.marketSizing?.growth_cagr || 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Target Market Segmentation -->
    <div class="mr-section">
      <div class="mr-section-header">
        <h3>🎯 Target Market Segmentation</h3>
      </div>
      <div class="mr-grid">
        <div class="mr-card">
          <div class="mr-card-header">Primary Segment</div>
          <div class="mr-segment-content">
            <h4>${data.targetMarketSegmentation?.primary?.name || 'N/A'}</h4>
            <p>${data.targetMarketSegmentation?.primary?.description || 'No description'}</p>
            <div class="mr-segment-details">
              <div class="mr-segment-detail">
                <span class="mr-detail-label">Demographics:</span>
                <span class="mr-detail-value">${data.targetMarketSegmentation?.primary?.demographics || 'N/A'}</span>
              </div>
              <div class="mr-segment-detail">
                <span class="mr-detail-label">Psychographics:</span>
                <span class="mr-detail-value">${data.targetMarketSegmentation?.primary?.psychographics || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="mr-card">
          <div class="mr-card-header">Secondary Segment</div>
          <div class="mr-segment-content">
            <h4>${data.targetMarketSegmentation?.secondary?.name || 'N/A'}</h4>
            <p>${data.targetMarketSegmentation?.secondary?.description || 'No description'}</p>
            <div class="mr-segment-details">
              <div class="mr-segment-detail">
                <span class="mr-detail-label">Demographics:</span>
                <span class="mr-detail-value">${data.targetMarketSegmentation?.secondary?.demographics || 'N/A'}</span>
              </div>
              <div class="mr-segment-detail">
                <span class="mr-detail-label">Psychographics:</span>
                <span class="mr-detail-value">${data.targetMarketSegmentation?.secondary?.psychographics || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="mr-metrics-grid">
        ${chartData.targetMetrics.map((metric: any) => `
          <div class="mr-metric-card">
            <div class="mr-metric-label">${metric.label}</div>
            <div class="mr-metric-value">${metric.value}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- SWOT Analysis -->
    <div class="mr-section">
      <div class="mr-section-header">
        <h3>🔍 SWOT Analysis</h3>
      </div>
      <div class="mr-swot-grid">
        <div class="mr-swot-card strengths">
          <h4>💪 Strengths</h4>
          <ul>
            ${data.swotAnalysis?.strengths?.map((item: any) => `<li><strong>${item.factor}:</strong> ${item.impact}</li>`).join('') || '<li>No strengths identified</li>'}
          </ul>
        </div>
        <div class="mr-swot-card weaknesses">
          <h4>⚠️ Weaknesses</h4>
          <ul>
            ${data.swotAnalysis?.weaknesses?.map((item: any) => `<li><strong>${item.factor}:</strong> ${item.impact}</li>`).join('') || '<li>No weaknesses identified</li>'}
          </ul>
        </div>
        <div class="mr-swot-card opportunities">
          <h4>🚀 Opportunities</h4>
          <ul>
            ${data.swotAnalysis?.opportunities?.map((item: any) => `<li><strong>${item.factor}:</strong> ${item.impact}</li>`).join('') || '<li>No opportunities identified</li>'}
          </ul>
        </div>
        <div class="mr-swot-card threats">
          <h4>⚡ Threats</h4>
          <ul>
            ${data.swotAnalysis?.threats?.map((item: any) => `<li><strong>${item.factor}:</strong> ${item.impact}</li>`).join('') || '<li>No threats identified</li>'}
          </ul>
        </div>
      </div>
    </div>

    <!-- Strategic Recommendations -->
    <div class="mr-section">
      <div class="mr-section-header">
        <h3>🎯 Strategic Recommendations</h3>
      </div>
      <div class="mr-recommendations-grid">
        ${data.strategicRecommendations?.map((rec: any) => `
          <div class="mr-recommendation-card">
            <div class="mr-rec-header">
              <h4>${rec.title}</h4>
              <span class="mr-rec-priority priority-${rec.priority?.toLowerCase()}">${rec.priority}</span>
            </div>
            <div class="mr-rec-details">
              <div class="mr-rec-detail"><strong>Timeline:</strong> ${rec.timeline}</div>
              <div class="mr-rec-detail"><strong>Investment:</strong> ${rec.investment}</div>
              <div class="mr-rec-detail"><strong>ROI:</strong> ${rec.roi}</div>
            </div>
            <div class="mr-rec-steps">
              <strong>Steps:</strong>
              <ol>
                ${rec.steps?.map((step: string) => `<li>${step}</li>`).join('') || '<li>No steps defined</li>'}
              </ol>
            </div>
          </div>
        `).join('') || '<div class="mr-no-data">No strategic recommendations available</div>'}
      </div>
    </div>

    <!-- KPI Framework -->
    <div class="mr-section">
      <div class="mr-section-header">
        <h3>📊 KPI Framework</h3>
      </div>
      <div class="mr-kpi-table">
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
            ${chartData.kpiFramework.map((kpi: any) => `
              <tr>
                <td>${kpi.category}</td>
                <td>${kpi.metric}</td>
                <td>${kpi.baseline}</td>
                <td>${kpi.target_6m}</td>
                <td>${kpi.target_12m}</td>
                <td>${kpi.frequency}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Data Sources -->
    ${data.dataSources && data.dataSources.length > 0 ? `
      <div class="mr-section">
        <div class="mr-section-header">
          <h3>📚 Data Sources</h3>
        </div>
        <div class="mr-sources-list">
          ${data.dataSources.map((source: any) => `
            <div class="mr-source-item">
              <a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.title}</a>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;

  // Initialize charts after DOM is rendered
  setTimeout(() => {
    initializeCharts(chartData);
    attachEventListeners();
  }, 100);
}

function initializeCharts(chartData: any) {
  // Market Sizing Funnel Chart
  const sizingCanvas = document.getElementById('market-sizing-chart') as HTMLCanvasElement;
  if (sizingCanvas && chartData?.marketSizing) {
    const ctx = sizingCanvas.getContext('2d');
    if (ctx) {
      const marketSizing = chartData.marketSizing;
      const tam = marketSizing.tam ? parseFloat(marketSizing.tam.replace(/[^0-9.-]/g, '')) || 0 : 0;
      const sam = marketSizing.sam ? parseFloat(marketSizing.sam.replace(/[^0-9.-]/g, '')) || 0 : 0;
      const som = marketSizing.som ? parseFloat(marketSizing.som.replace(/[^0-9.-]/g, '')) || 0 : 0;

      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['TAM', 'SAM', 'SOM'],
          datasets: [{
            label: 'Market Size',
            data: [tam, sam, som],
            backgroundColor: [
              'rgba(54, 162, 235, 0.8)',
              'rgba(255, 206, 86, 0.8)',
              'rgba(75, 192, 192, 0.8)'
            ],
            borderColor: [
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function (value) {
                  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                }
              }
            }
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    }
  }
}

function attachEventListeners() {
  console.log('Attaching event listeners...');
  // Generate button
  const generateBtn = document.getElementById('mr-generate-btn');
  if (generateBtn) {
    console.log('Generate button found and event listener attached');
    generateBtn.addEventListener('click', async () => {
      console.log('Generate button clicked');
      console.log('Current context:', state.userContext);

      if (!state.userContext.country || !state.userContext.industry || !state.userContext.profession) {
        alert('Please complete your context setup (Country, Industry, Profession) before generating market research.');
        return;
      }

      console.log('Starting market research generation...');
      state.marketResearch.loading = true;
      state.marketResearch.error = null;
      saveSession();

      // Re-render to show loading state
      const container = document.querySelector('.market-research-container') as HTMLElement;
      if (container) {
        renderMarketResearchDashboard(container);
      }

      try {
        const result = await fetchMarketResearchForDisplay({
          brandContext: state.contextPayload,
          country: state.userContext.country,
          industry: state.userContext.industry,
          profession: state.userContext.profession,
          services: state.userContext.services
        }, (step, pct) => {
          // Update loading progress
          const loadingPct = document.querySelector('.mr-loading-pct');
          const loadingFill = document.querySelector('.mr-loading-fill');
          const loadingText = document.querySelector('.mr-loading-text');
          const loadingSteps = document.querySelectorAll('.mr-loading-step');

          if (loadingPct) {
            loadingPct.textContent = `${Math.round(pct)}%`;
          }
          if (loadingFill) {
            (loadingFill as HTMLElement).style.width = `${Math.round(pct)}%`;
          }
          if (loadingText) {
            loadingText.textContent = step;
          }

          // Update step status based on progress
          loadingSteps.forEach((stepEl, index) => {
            const stepProgress = (index + 1) * 25; // Each step represents 25%
            if (pct >= stepProgress) {
              stepEl.classList.add('active');
            } else {
              stepEl.classList.remove('active');
            }
          });
        });

        console.log('Market research generation completed successfully');
        state.marketResearch.data = result.data;
        state.marketResearch.sourcesCount = result.sourcesCount;
        state.marketResearch.lastUpdated = result.lastUpdated;
        state.marketResearch.loading = false;
        state.marketResearch.error = null;

        saveSession();

        // Re-render with new data
        if (container) {
          renderMarketResearchDashboard(container);
        }

      } catch (error) {
        console.error('Error in market research generation:', error);
        state.marketResearch.loading = false;
        state.marketResearch.error = (error as Error).message || 'Failed to generate market research data';

        saveSession();

        // Re-render with error state
        if (container) {
          renderMarketResearchDashboard(container);
        }
      }
    });
  }

  // Refresh button (for when data already exists)
  const refreshBtn = document.getElementById('mr-refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      if (!state.userContext.country || !state.userContext.industry || !state.userContext.profession) {
        alert('Please complete your context setup (Country, Industry, Profession) before refreshing market research.');
        return;
      }

      state.marketResearch.loading = true;
      state.marketResearch.error = null;
      saveSession();

      // Re-render to show loading state
      const container = document.querySelector('.market-research-container') as HTMLElement;
      if (container) {
        renderMarketResearchDashboard(container);
      }

      try {
        const result = await fetchMarketResearchForDisplay({
          brandContext: state.contextPayload,
          country: state.userContext.country,
          industry: state.userContext.industry,
          profession: state.userContext.profession,
          services: state.userContext.services
        }, (step, pct) => {
          // Update loading progress
          const loadingPct = document.querySelector('.mr-loading-pct');
          const loadingFill = document.querySelector('.mr-loading-fill');
          const loadingText = document.querySelector('.mr-loading-text');
          const loadingSteps = document.querySelectorAll('.mr-loading-step');

          if (loadingPct) {
            loadingPct.textContent = `${Math.round(pct)}%`;
          }
          if (loadingFill) {
            (loadingFill as HTMLElement).style.width = `${Math.round(pct)}%`;
          }
          if (loadingText) {
            loadingText.textContent = step;
          }

          // Update step status based on progress
          loadingSteps.forEach((stepEl, index) => {
            const stepProgress = (index + 1) * 25; // Each step represents 25%
            if (pct >= stepProgress) {
              stepEl.classList.add('active');
            } else {
              stepEl.classList.remove('active');
            }
          });
        });

        state.marketResearch.data = result.data;
        state.marketResearch.sourcesCount = result.sourcesCount;
        state.marketResearch.lastUpdated = result.lastUpdated;
        state.marketResearch.loading = false;
        state.marketResearch.error = null;

      } catch (error) {
        state.marketResearch.loading = false;
        state.marketResearch.error = (error as Error).message || 'Failed to fetch market research data';
      }

      saveSession();

      // Re-render with new data
      if (container) {
        renderMarketResearchDashboard(container);
      }
    });
  }

  // Retry button
  const retryBtn = document.getElementById('mr-retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      const generateBtn = document.getElementById('mr-generate-btn');
      if (generateBtn) {
        generateBtn.click();
      }
    });
  }
}