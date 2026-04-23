// ─── INTERVIEW CARD ─────────────────────────────────────────────────
// Interactive section-based interview cards with multiple-choice chips,
// custom text input, progress tracking, and skip capability.

import { FRAMEWORK, type SectionId } from '../config/framework';
import { getSectionQuestions, type FieldQuestionConfig } from '../config/questions';
import { state, saveSession } from '../store/brandscript.store';
import { applyExtractions } from '../services/extraction.service';

interface CardState {
  selectedOptions: Record<string, string[]>; // fieldId → selected option texts
  customTexts: Record<string, string>;        // fieldId → custom typed text
  currentFieldIndex: number;
}

// ─── RENDER A FULL-SECTION INTERVIEW CARD ───────────────────────────

export function renderInterviewCard(
  container: HTMLElement,
  sectionId: SectionId,
  onComplete: (sectionId: SectionId) => void,
  onAiRefine: (sectionId: SectionId, fieldId: string, rawAnswer: string) => void
): void {
  const section = FRAMEWORK.find(s => s.id === sectionId);
  if (!section) return;

  const questions = getSectionQuestions(sectionId);
  const cardState: CardState = {
    selectedOptions: {},
    customTexts: {},
    currentFieldIndex: 0,
  };

  // Pre-fill from existing brandscript state
  section.fields.forEach(field => {
    const existing = state.brandscript[sectionId][field.id];
    if (existing) {
      cardState.customTexts[field.id] = existing;
    }
  });

  const wrapper = document.createElement('div');
  wrapper.className = 'message agent';

  const card = document.createElement('div');
  card.className = 'interview-card';
  card.style.setProperty('--section-color', section.color);

  // Header
  card.innerHTML = `
    <div class="ic-header" style="border-color: ${section.color}">
      <div class="ic-header-top">
        <div class="ic-section-icon" style="background: ${section.color}20; color: ${section.color}">${section.icon}</div>
        <div class="ic-header-text">
          <h3 class="ic-title">${section.label}</h3>
          <p class="ic-subtitle">${section.fields.length} fields to complete</p>
        </div>
        <div class="ic-progress-ring" id="ic-ring-${sectionId}">
          <svg viewBox="0 0 36 36">
            <path class="ic-ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path class="ic-ring-fill" stroke="${section.color}" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <span class="ic-ring-text">0%</span>
        </div>
      </div>
      <div class="ic-field-progress" id="ic-fieldprog-${sectionId}"></div>
    </div>
    <div class="ic-body" id="ic-body-${sectionId}"></div>
    <div class="ic-footer" id="ic-footer-${sectionId}"></div>
  `;

  wrapper.appendChild(card);
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;

  // Render field progress dots (clickable)
  renderFieldProgress(sectionId, section, cardState, questions, onComplete, onAiRefine);

  // Render first field
  renderField(sectionId, section, questions, cardState, 0, onComplete, onAiRefine);
}

// ─── FIELD PROGRESS DOTS (clickable for direct navigation) ─────────

function renderFieldProgress(
  sectionId: SectionId,
  section: typeof FRAMEWORK[number],
  cardState: CardState,
  questions?: Record<string, FieldQuestionConfig>,
  onComplete?: (sectionId: SectionId) => void,
  onAiRefine?: (sectionId: SectionId, fieldId: string, rawAnswer: string) => void
): void {
  const container = document.getElementById(`ic-fieldprog-${sectionId}`);
  if (!container) return;

  container.innerHTML = section.fields.map((field, i) => {
    const filled = state.brandscript[sectionId][field.id] || cardState.customTexts[field.id] || (cardState.selectedOptions[field.id]?.length > 0);
    const active = i === cardState.currentFieldIndex;
    return `<div class="ic-field-dot ${filled ? 'filled' : ''} ${active ? 'active' : ''}" data-field-index="${i}" title="${field.label} — click to jump"></div>`;
  }).join('');

  // Make dots clickable for direct jump
  if (questions && onComplete && onAiRefine) {
    container.querySelectorAll('.ic-field-dot').forEach(dot => {
      (dot as HTMLElement).addEventListener('click', () => {
        const idx = parseInt((dot as HTMLElement).dataset.fieldIndex || '0');
        // Save current field before jumping
        const currentField = section.fields[cardState.currentFieldIndex];
        if (currentField) {
          const selected = cardState.selectedOptions[currentField.id] || [];
          const custom = cardState.customTexts[currentField.id] || '';
          const answer = custom || selected.join('; ');
          if (answer) {
            applyExtractions([{ section: sectionId, field: currentField.id, value: answer }]);
            saveSession();
          }
        }
        renderField(sectionId, section, questions, cardState, idx, onComplete, onAiRefine);
      });
    });
  }
}

// ─── RENDER INDIVIDUAL FIELD QUESTION ───────────────────────────────

function renderField(
  sectionId: SectionId,
  section: typeof FRAMEWORK[number],
  questions: Record<string, FieldQuestionConfig>,
  cardState: CardState,
  fieldIndex: number,
  onComplete: (sectionId: SectionId) => void,
  onAiRefine: (sectionId: SectionId, fieldId: string, rawAnswer: string) => void
): void {
  const body = document.getElementById(`ic-body-${sectionId}`);
  const footer = document.getElementById(`ic-footer-${sectionId}`);
  if (!body || !footer) return;

  // If all fields done, show summary
  if (fieldIndex >= section.fields.length) {
    renderSummary(sectionId, section, cardState, body, footer, onComplete, onAiRefine);
    return;
  }

  cardState.currentFieldIndex = fieldIndex;
  renderFieldProgress(sectionId, section, cardState, questions, onComplete, onAiRefine);

  const field = section.fields[fieldIndex];
  const q = questions[field.id];
  const existingValue = state.brandscript[sectionId][field.id];

  if (!q) {
    // No question config — skip to next
    renderField(sectionId, section, questions, cardState, fieldIndex + 1, onComplete, onAiRefine);
    return;
  }

  body.innerHTML = `
    <div class="ic-question-area">
      <div class="ic-field-counter">${fieldIndex + 1} of ${section.fields.length}</div>
      <h4 class="ic-question">${q.question}</h4>
      <p class="ic-hint">${q.hint}</p>
      ${existingValue ? `<div class="ic-existing"><span class="ic-existing-label">Current:</span> ${existingValue}</div>` : ''}
      <div class="ic-options" id="ic-options-${sectionId}">
        ${q.options.map((opt, i) => {
          const selected = cardState.selectedOptions[field.id]?.includes(opt);
          return `<button class="ic-chip ${selected ? 'selected' : ''}" data-opt-index="${i}">${opt}</button>`;
        }).join('')}
      </div>
      ${q.allowCustom ? `
        <div class="ic-custom-row">
          <input type="text" class="ic-custom-input" id="ic-custom-${sectionId}" placeholder="Or type your own answer..." value="${cardState.customTexts[field.id] || ''}" />
        </div>
      ` : ''}
    </div>
  `;

  // Chip click handlers
  body.querySelectorAll('.ic-chip').forEach((chip, i) => {
    (chip as HTMLElement).addEventListener('click', () => {
      const opt = q.options[i];

      if (!cardState.selectedOptions[field.id]) {
        cardState.selectedOptions[field.id] = [];
      }

      if (q.multiSelect) {
        // Toggle selection
        const idx = cardState.selectedOptions[field.id].indexOf(opt);
        if (idx >= 0) {
          cardState.selectedOptions[field.id].splice(idx, 1);
          chip.classList.remove('selected');
        } else {
          cardState.selectedOptions[field.id].push(opt);
          chip.classList.add('selected');
        }
      } else {
        // Single select — replace
        body.querySelectorAll('.ic-chip').forEach(c => c.classList.remove('selected'));
        cardState.selectedOptions[field.id] = [opt];
        chip.classList.add('selected');
      }

      // Clear custom if chip is selected
      const customInput = document.getElementById(`ic-custom-${sectionId}`) as HTMLInputElement;
      if (customInput && cardState.selectedOptions[field.id].length > 0) {
        cardState.customTexts[field.id] = '';
        customInput.value = '';
      }

      updateRing(sectionId, section, cardState);
    });
  });

  // Custom input handler
  const customInput = document.getElementById(`ic-custom-${sectionId}`) as HTMLInputElement;
  if (customInput) {
    customInput.addEventListener('input', () => {
      cardState.customTexts[field.id] = customInput.value;
      if (customInput.value) {
        cardState.selectedOptions[field.id] = [];
        body.querySelectorAll('.ic-chip').forEach(c => c.classList.remove('selected'));
      }
    });
    customInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveFieldAndAdvance(sectionId, section, questions, cardState, field.id, fieldIndex, onComplete, onAiRefine);
      }
    });
  }

  // Footer buttons
  footer.innerHTML = `
    <div style="display: flex; gap: 8px;">
      ${fieldIndex > 0 ? `<button class="ic-btn-skip" id="ic-back-${sectionId}">← Back</button>` : ''}
      <button class="ic-btn-skip" id="ic-skip-${sectionId}">Skip</button>
    </div>
    <button class="ic-btn-next" id="ic-next-${sectionId}" style="background: ${section.color}">
      ${fieldIndex < section.fields.length - 1 ? 'Next →' : 'Review ✓'}
    </button>
  `;

  if (fieldIndex > 0) {
    document.getElementById(`ic-back-${sectionId}`)!.addEventListener('click', () => {
      // Save current input to state before navigating back
      const selected = cardState.selectedOptions[field.id] || [];
      const custom = cardState.customTexts[field.id] || '';
      const answer = custom || selected.join('; ');
      if (answer) {
        applyExtractions([{ section: sectionId, field: field.id, value: answer }]);
        saveSession();
      }
      renderField(sectionId, section, questions, cardState, fieldIndex - 1, onComplete, onAiRefine);
    });
  }

  document.getElementById(`ic-skip-${sectionId}`)!.addEventListener('click', () => {
    renderField(sectionId, section, questions, cardState, fieldIndex + 1, onComplete, onAiRefine);
  });

  document.getElementById(`ic-next-${sectionId}`)!.addEventListener('click', () => {
    saveFieldAndAdvance(sectionId, section, questions, cardState, field.id, fieldIndex, onComplete, onAiRefine);
  });

  // Animate in
  body.querySelector('.ic-question-area')?.classList.add('ic-animate-in');
}

// ─── SAVE FIELD AND ADVANCE ─────────────────────────────────────────

function saveFieldAndAdvance(
  sectionId: SectionId,
  section: typeof FRAMEWORK[number],
  questions: Record<string, FieldQuestionConfig>,
  cardState: CardState,
  fieldId: string,
  fieldIndex: number,
  onComplete: (sectionId: SectionId) => void,
  onAiRefine: (sectionId: SectionId, fieldId: string, rawAnswer: string) => void
): void {
  const selected = cardState.selectedOptions[fieldId] || [];
  const custom = cardState.customTexts[fieldId] || '';
  const answer = custom || selected.join('; ');

  if (answer) {
    // Apply directly to state
    applyExtractions([{ section: sectionId, field: fieldId, value: answer }]);
    saveSession();
  }

  updateRing(sectionId, section, cardState);
  renderField(sectionId, section, questions, cardState, fieldIndex + 1, onComplete, onAiRefine);
}

// ─── SUMMARY SCREEN ─────────────────────────────────────────────────

function renderSummary(
  sectionId: SectionId,
  section: typeof FRAMEWORK[number],
  cardState: CardState,
  body: HTMLElement,
  footer: HTMLElement,
  onComplete: (sectionId: SectionId) => void,
  onAiRefine: (sectionId: SectionId, fieldId: string, rawAnswer: string) => void
): void {
  const questions = getSectionQuestions(sectionId);
  const filledFields = section.fields.filter(f => state.brandscript[sectionId][f.id]);
  const emptyFields = section.fields.filter(f => !state.brandscript[sectionId][f.id]);

  body.innerHTML = `
    <div class="ic-summary">
      <div class="ic-summary-header">
        <span class="ic-summary-icon" style="color: ${section.color}">✓</span>
        <h4>${section.label} — ${filledFields.length}/${section.fields.length} completed</h4>
      </div>
      <div class="ic-summary-fields">
        ${section.fields.map((f, i) => {
          const value = state.brandscript[sectionId][f.id];
          const isFilled = !!value;
          return `
            <div class="ic-summary-field ${isFilled ? 'filled' : 'empty'}" data-edit-index="${i}" style="cursor: pointer;" title="Click to edit">
              <span class="ic-sf-label">${f.label}</span>
              <div class="ic-sf-right">
                <span class="ic-sf-value">${isFilled ? truncate(value, 50) : 'Skipped'}</span>
                <span class="ic-sf-edit">✎</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      ${filledFields.length > 0 ? `
        <button class="ic-btn-refine" id="ic-refine-${sectionId}" style="border-color: ${section.color}; color: ${section.color}">
          ✨ Let Brandy refine these answers with AI
        </button>
      ` : ''}
    </div>
  `;

  // Click any summary row to jump back to that field for editing
  body.querySelectorAll('[data-edit-index]').forEach(row => {
    (row as HTMLElement).addEventListener('click', () => {
      const idx = parseInt((row as HTMLElement).dataset.editIndex || '0');
      renderField(sectionId, section, questions, cardState, idx, onComplete, onAiRefine);
    });
  });

  footer.innerHTML = `
    <button class="ic-btn-skip" id="ic-redo-${sectionId}">↩ Redo section</button>
    <button class="ic-btn-next" id="ic-done-${sectionId}" style="background: ${section.color}">Complete ✓</button>
  `;

  document.getElementById(`ic-redo-${sectionId}`)?.addEventListener('click', () => {
    cardState.currentFieldIndex = 0;
    renderField(sectionId, section, questions, cardState, 0, onComplete, onAiRefine);
  });

  document.getElementById(`ic-done-${sectionId}`)?.addEventListener('click', () => {
    onComplete(sectionId);
  });

  document.getElementById(`ic-refine-${sectionId}`)?.addEventListener('click', () => {
    const allAnswers = filledFields.map(f => `${f.label}: ${state.brandscript[sectionId][f.id]}`).join('\n');
    onAiRefine(sectionId, '*', allAnswers);
  });

  renderFieldProgress(sectionId, section, cardState, questions, onComplete, onAiRefine);
  updateRing(sectionId, section, cardState);
}

// ─── PROGRESS RING ──────────────────────────────────────────────────

function updateRing(
  sectionId: SectionId,
  section: typeof FRAMEWORK[number],
  cardState: CardState
): void {
  const filled = section.fields.filter(f =>
    state.brandscript[sectionId][f.id] || cardState.customTexts[f.id] || (cardState.selectedOptions[f.id]?.length > 0)
  ).length;
  const pct = Math.round((filled / section.fields.length) * 100);

  const ring = document.querySelector(`#ic-ring-${sectionId} .ic-ring-fill`) as SVGPathElement;
  const ringText = document.querySelector(`#ic-ring-${sectionId} .ic-ring-text`);
  if (ring) ring.setAttribute('stroke-dasharray', `${pct}, 100`);
  if (ringText) ringText.textContent = `${pct}%`;
}

// ─── HELPERS ────────────────────────────────────────────────────────

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str;
}
