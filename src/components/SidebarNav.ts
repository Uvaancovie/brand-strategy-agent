// ─── SIDEBAR NAV ────────────────────────────────────────────────────
// Renders sidebar navigation with auto-completion ticks and edit-on-click

import { FRAMEWORK, type SectionId } from '../config/framework';
import { state, getFilledCount, getProgressStats, saveSession } from '../store/brandscript.store';

export function renderNav(
  navContainer: HTMLElement,
  progressFill: HTMLElement,
  progressPct: HTMLElement,
  onUpdate?: () => void,
  onSectionClick?: (sectionIndex: number) => void
): void {
  navContainer.innerHTML = FRAMEWORK.map((section, i) => {
    const filled  = getFilledCount(section.id);
    const total   = section.fields.length;
    const allDone = filled === total;          // auto-complete when every field has a value
    const active  = i === state.activeSection;

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
         data-index="${i}" style="color: ${section.color}" title="${allDone ? 'All done — click to edit' : 'Click to fill in'}">
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

  // Section click → open interview card (new or edit mode)
  navContainer.querySelectorAll('.nav-item').forEach(item => {
    (item as HTMLElement).addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.nav-check-btn')) return;
      const idx = parseInt((item as HTMLElement).dataset.index || '0');
      state.activeSection = idx;
      renderNav(navContainer, progressFill, progressPct, onUpdate, onSectionClick);
      if (onSectionClick) onSectionClick(idx);
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
      renderNav(navContainer, progressFill, progressPct, onUpdate, onSectionClick);
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
