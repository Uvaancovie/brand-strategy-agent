// ─── BRANDSCRIPT PANEL ──────────────────────────────────────────────
// Renders the B.I.G Doc preview panel with collapsible sections

import { FRAMEWORK } from '../config/framework';
import { state } from '../store/brandscript.store';

export function renderBrandscript(container: HTMLElement): void {
  container.innerHTML = FRAMEWORK.map(section => {
    // Calculate progress
    const totalFields = section.fields.length;
    const filledFields = section.fields.filter(f => !!state.brandscript[section.id][f.id]).length;
    
    return `
    <div class="bs-section open" data-section="${section.id}">
      <div class="bs-section-header" data-toggle="${section.id}">
        <div class="bs-section-dot" style="background: ${section.color}"></div>
        <span class="bs-section-title">${section.icon} ${section.label}</span>
        <div class="bs-section-right">
        <span class="bs-section-progress-pill">${filledFields}/${totalFields}</span>
        <select class="bs-section-progress-dropdown" aria-label="${section.label} progress details" onclick="event.stopPropagation()" onchange="event.stopPropagation()">
          <option disabled selected>Field completion</option>
          ${section.fields.map(field => {
            const isFilled = !!state.brandscript[section.id][field.id];
            return `<option value="${field.id}">${isFilled ? '✅' : '❌'} ${field.label}</option>`;
          }).join('')}
        </select>
        </div>
        <span class="bs-section-chevron">▾</span>
      </div>
      <div class="bs-section-body">
        ${section.fields.map(field => {
          const value = state.brandscript[section.id][field.id];
          return `
            <div class="bs-field">
              <div class="bs-field-label">${field.label}</div>
              <div class="bs-field-value ${value ? 'filled' : 'empty'}">
                ${value || 'Awaiting extraction...'}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `}).join('');

  container.querySelectorAll('.bs-section-header').forEach(header => {
    (header as HTMLElement).addEventListener('click', () => {
      header.closest('.bs-section')?.classList.toggle('open');
    });
  });
}
