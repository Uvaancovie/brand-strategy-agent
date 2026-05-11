// ─── SIDEBAR NAV ────────────────────────────────────────────────────
// Renders sidebar navigation with auto-completion ticks and edit-on-click

import { FRAMEWORK, type SectionId } from '../config/framework';
import { state, getFilledCount, getProgressStats, saveSession } from '../store/brandscript.store';

export function renderNav(
  navContainer: HTMLElement,
  progressFill: HTMLElement,
  progressPct: HTMLElement,
  onUpdate?: () => void,
  onSectionClick?: (sectionIndex: number) => void,
  onViewChange?: (view: 'chat' | 'dashboard') => void
): void {
  const frameworkItems = FRAMEWORK.map((section, i) => {
    const filled  = getFilledCount(section.id);
    const total   = section.fields.length;
    const allDone = filled === total;          // auto-complete when every field has a value
    
    // FIX: Replaced state.currentView === 'chat' with !state.markViewVisible
    const active  = i === state.activeSection && !state.markViewVisible;

    // Badge label: show fraction, colour it green when fully done
    const badgeClass = allDone ? 'nav-badge done' : 'nav-badge';

    // Check button: always shown; auto-checked when all fields filled
    const isChecked = allDone || !!state.manualSectionCompletion[section.id];
    const checkClass = `nav-check-btn ${isChecked ? 'checked' : ''}`;

    // Edit hint shown on completed sections so users know they can click to edit
    const editHint = allDone
      ? `<span class="nav-edit-hint" title="Click to edit">✎</span>`
      : '';

    return `
    <div class="nav-item ${active ? 'active' : ''} ${allDone ? 'completed' : ''}"
         data-index="${i}" data-view="chat" style="color: ${section.color}" title="${allDone ? 'All done — click to edit' : 'Click to fill in'}">
      <div class="nav-dot ${allDone ? 'done' : ''}"></div>
      <span class="nav-label">${section.icon} ${section.label}</span>
      <div class="nav-right">
        <span class="${badgeClass}">${filled}/${total}</span>
        ${editHint}
        <button class="${checkClass}" data-section="${section.id}" title="${isChecked ? 'Unmark complete' : 'Mark complete'}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
      </div>
    </div>`;
  }).join('');

  // FIX: Replaced marketResearch.sourcesCount with firecrawlResults.length
  const sourcesCount = state.firecrawlResults ? state.firecrawlResults.length : 0;

  // Market Research Dashboard item
  // FIX: Replaced state.currentView === 'dashboard' with state.markViewVisible
  const marketResearchItem = `
    <div class="nav-item ${state.markViewVisible ? 'active' : ''}" data-view="dashboard" style="color: #8b5cf6" title="View market research dashboard">
      <div class="nav-dot"></div>
      <span class="nav-label">📊 Market Research</span>
      <div class="nav-right">
        <span class="nav-badge">${sourcesCount}</span>
      </div>
    </div>
  `;

  navContainer.innerHTML = frameworkItems + marketResearchItem;

  // Section click → open interview card (new or edit mode)
  navContainer.querySelectorAll('.nav-item').forEach(item => {
    (item as HTMLElement).addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.nav-check-btn')) return;

      const view = (item as HTMLElement).dataset.view as 'chat' | 'dashboard';
      const idx = parseInt((item as HTMLElement).dataset.index || '0');

      if (view === 'dashboard') {
        // FIX: Update markViewVisible instead of currentView
        state.markViewVisible = true;
        renderNav(navContainer, progressFill, progressPct, onUpdate, onSectionClick, onViewChange);
        if (onViewChange) onViewChange('dashboard');
        return;
      }

      // FIX: Update markViewVisible instead of currentView
      state.markViewVisible = false;
      state.activeSection = idx;
      renderNav(navContainer, progressFill, progressPct, onUpdate, onSectionClick, onViewChange);
      if (onSectionClick) onSectionClick(idx);
      if (onViewChange) onViewChange('chat');
    });
  });

  // Manual check-button toggle (for sections which aren't fully filled yet)
  navContainer.querySelectorAll('.nav-check-btn').forEach(btn => {
    (btn as HTMLElement).addEventListener('click', (e) => {
      e.stopPropagation();
      const sectionId = (btn as HTMLElement).dataset.section as SectionId;
      const filled  = getFilledCount(sectionId);
      const total   = FRAMEWORK.find(s => s.id === sectionId)?.fields.length ?? 0;
      // If auto-completed, clicking the check sends them to edit the section instead
      if (filled === total) {
        const idx = FRAMEWORK.findIndex(s => s.id === sectionId);
        state.activeSection = idx;
        renderNav(navContainer, progressFill, progressPct, onUpdate, onSectionClick);
        if (onSectionClick) onSectionClick(idx);
        return;
      }
      state.manualSectionCompletion[sectionId] = !state.manualSectionCompletion[sectionId];
      renderNav(navContainer, progressFill, progressPct, onUpdate, onSectionClick, onViewChange);
      saveSession();
    });
  });

  updateProgress(progressFill, progressPct);
}

export function updateProgress(progressFill: HTMLElement, progressPct: HTMLElement): void {
  const { pct } = getProgressStats();
  progressFill.style.width = `${pct}%`;
  progressPct.textContent = `${pct}%`;
}