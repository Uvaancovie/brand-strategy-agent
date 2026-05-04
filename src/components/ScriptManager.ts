// ─── SCRIPT MANAGER COMPONENT ───────────────────────────────────────
// Renders a CRUD panel for managing transcription scripts
// Supports: list view, detail editing, actions (context/framework/doc)

import { state, type Transcript } from '../store/brandscript.store';
import {
  getAllTranscripts,
  getTranscript,
  updateTranscript,
  deleteTranscript,
  saveTranscriptToContext,
  toggleTranscriptInDoc,
  prepopulateFrameworkFromTranscript,
  syncTranscriptToSupabase,
  deleteTranscriptFromSupabase,
  MAX_RECORDING_SESSIONS,
} from '../services/transcription.service';

let activeScriptId: string | null = null;
let onRefreshUI: (() => void) | null = null;
let userId: string | null = null;

export function setScriptManagerCallbacks(refreshFn: () => void, currentUserId: string | null) {
  onRefreshUI = refreshFn;
  userId = currentUserId;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function truncate(text: string, max = 120): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trim() + '...';
}

// ─── RENDER SCRIPTS LIST ────────────────────────────────────────────

export function renderScriptManager(container: HTMLElement): void {
  const transcripts = getAllTranscripts();
  const recordingCount = state.recordingSessionCount;

  if (transcripts.length === 0) {
    container.innerHTML = `
      <div class="scripts-empty">
        <div class="scripts-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
            <path d="M12 1a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </div>
        <h3>No Transcripts Yet</h3>
        <p>Upload an audio file or record a consultation to create your first transcript script.</p>
        <div class="scripts-session-counter">
          <span class="session-badge">🎙️ ${recordingCount} / ${MAX_RECORDING_SESSIONS} recording sessions used</span>
        </div>
      </div>
    `;
    return;
  }

  const listHtml = transcripts.map(t => {
    const isActive = t.id === activeScriptId;
    const sourceBadge = t.source === 'recording'
      ? '<span class="script-badge recording">🎙️ Recording</span>'
      : '<span class="script-badge upload">📁 Upload</span>';
    const contextBadge = t.addedToContext ? '<span class="script-badge context">🧭 In Context</span>' : '';
    const docBadge = t.addedToDoc ? '<span class="script-badge doc">📄 In B.I.G Doc</span>' : '';

    return `
      <div class="script-card ${isActive ? 'active' : ''}" data-script-id="${t.id}">
        <div class="script-card-header">
          <div class="script-card-title">${escapeHtml(t.name)}</div>
          <div class="script-card-badges">${sourceBadge}${contextBadge}${docBadge}</div>
        </div>
        ${t.description ? `<div class="script-card-desc">${escapeHtml(t.description)}</div>` : ''}
        <div class="script-card-preview">${escapeHtml(truncate(t.text, 150))}</div>
        <div class="script-card-meta">
          <span>${formatDate(t.createdAt)}</span>
          <span>${t.text.length.toLocaleString()} chars</span>
          ${t.durationSeconds ? `<span>${Math.floor(t.durationSeconds / 60)}m ${t.durationSeconds % 60}s</span>` : ''}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="scripts-header">
      <div class="scripts-title-row">
        <h3>📋 Transcript Scripts</h3>
        <span class="scripts-count">${transcripts.length} script${transcripts.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="scripts-session-counter">
        <div class="session-bar-wrap">
          <div class="session-bar-fill" style="width: ${(recordingCount / MAX_RECORDING_SESSIONS) * 100}%"></div>
        </div>
        <span class="session-badge">🎙️ ${recordingCount} / ${MAX_RECORDING_SESSIONS} recording sessions</span>
      </div>
    </div>
    <div class="scripts-list" id="scripts-list-inner">
      ${listHtml}
    </div>
    <div class="script-detail-panel ${activeScriptId ? 'visible' : ''}" id="script-detail-inner">
      ${activeScriptId ? renderScriptDetail(activeScriptId) : ''}
    </div>
  `;

  // Bind card clicks
  container.querySelectorAll('.script-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = (card as HTMLElement).dataset.scriptId;
      if (id) {
        activeScriptId = id;
        renderScriptManager(container);
      }
    });
  });

  // Bind detail actions
  bindDetailActions(container);
}

// ─── RENDER SCRIPT DETAIL ───────────────────────────────────────────

function renderScriptDetail(id: string): string {
  const t = getTranscript(id);
  if (!t) return '<div class="script-detail-empty">Script not found.</div>';

  return `
    <div class="script-detail-header">
      <button class="btn-ghost script-detail-back" id="script-back-btn">← Back to list</button>
      <div class="script-detail-actions-row">
        <button class="btn-ghost script-action-btn" id="script-action-delete" title="Delete this transcript">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Delete
        </button>
      </div>
    </div>
    <div class="script-detail-form">
      <label class="script-form-label">
        Name
        <input type="text" id="script-edit-name" class="script-edit-input" value="${escapeHtml(t.name)}" maxlength="80" />
      </label>
      <label class="script-form-label">
        Description
        <textarea id="script-edit-desc" class="script-edit-textarea" rows="2" maxlength="200">${escapeHtml(t.description)}</textarea>
      </label>
      <label class="script-form-label">
        Transcript Text
        <textarea id="script-edit-text" class="script-edit-textarea script-edit-body" rows="10">${escapeHtml(t.text)}</textarea>
      </label>
      <div class="script-edit-meta">
        <span>${t.text.length.toLocaleString()} characters</span>
        <span>Source: ${t.source === 'recording' ? '🎙️ Recording' : '📁 Upload'}</span>
        <span>Created: ${formatDate(t.createdAt)}</span>
      </div>
    </div>
    <div class="script-detail-toolbar">
      <button class="btn-primary-sm script-toolbar-btn" id="script-action-save">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
        Save Changes
      </button>
      <button class="btn-ghost script-toolbar-btn ${t.addedToContext ? 'active-action' : ''}" id="script-action-context">
        🧭 ${t.addedToContext ? 'Already in Context' : 'Save to Context'}
      </button>
      <button class="btn-ghost script-toolbar-btn" id="script-action-prefill">
        🧠 Pre-fill Framework
      </button>
      <button class="btn-ghost script-toolbar-btn ${t.addedToDoc ? 'active-action' : ''}" id="script-action-doc">
        📄 ${t.addedToDoc ? 'Remove from B.I.G Doc' : 'Add to B.I.G Doc'}
      </button>
    </div>
    <div class="script-status-msg hidden" id="script-status-msg"></div>
  `;
}

// ─── BIND DETAIL ACTIONS ────────────────────────────────────────────

function showStatus(container: HTMLElement, msg: string, isError = false) {
  const el = container.querySelector('#script-status-msg') as HTMLElement;
  if (!el) return;
  el.textContent = msg;
  el.className = `script-status-msg ${isError ? 'error' : 'success'}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

function bindDetailActions(container: HTMLElement) {
  // Back button
  container.querySelector('#script-back-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    activeScriptId = null;
    renderScriptManager(container);
  });

  // Save
  container.querySelector('#script-action-save')?.addEventListener('click', async () => {
    if (!activeScriptId) return;
    const name = (container.querySelector('#script-edit-name') as HTMLInputElement)?.value?.trim();
    const desc = (container.querySelector('#script-edit-desc') as HTMLTextAreaElement)?.value?.trim();
    const text = (container.querySelector('#script-edit-text') as HTMLTextAreaElement)?.value?.trim();
    const result = updateTranscript(activeScriptId, { name, description: desc, text });
    if (result && userId) {
      syncTranscriptToSupabase(userId, result);
    }
    showStatus(container, result ? '✅ Saved!' : '❌ Save failed.');
    if (onRefreshUI) onRefreshUI();
  });

  // Context
  container.querySelector('#script-action-context')?.addEventListener('click', () => {
    if (!activeScriptId) return;
    const ok = saveTranscriptToContext(activeScriptId);
    showStatus(container, ok ? '🧭 Added to context!' : '❌ Failed.');
    renderScriptManager(container);
    if (onRefreshUI) onRefreshUI();
  });

  // Pre-fill Framework
  container.querySelector('#script-action-prefill')?.addEventListener('click', async () => {
    if (!activeScriptId) return;
    const btn = container.querySelector('#script-action-prefill') as HTMLButtonElement;
    if (btn) { btn.disabled = true; btn.textContent = '🧠 Analyzing...'; }
    try {
      const msg = await prepopulateFrameworkFromTranscript(activeScriptId);
      showStatus(container, '🧠 Framework updated with transcript insights!');
      if (onRefreshUI) onRefreshUI();
    } catch (e) {
      showStatus(container, '❌ AI analysis failed: ' + (e as Error).message, true);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🧠 Pre-fill Framework'; }
    }
  });

  // Toggle B.I.G Doc
  container.querySelector('#script-action-doc')?.addEventListener('click', () => {
    if (!activeScriptId) return;
    const isAdded = toggleTranscriptInDoc(activeScriptId);
    showStatus(container, isAdded ? '📄 Added to B.I.G Doc export!' : '📄 Removed from B.I.G Doc.');
    renderScriptManager(container);
  });

  // Delete
  container.querySelector('#script-action-delete')?.addEventListener('click', async () => {
    if (!activeScriptId) return;
    if (!confirm('Delete this transcript? This cannot be undone.')) return;
    const id = activeScriptId;
    deleteTranscript(id);
    if (userId) deleteTranscriptFromSupabase(id);
    activeScriptId = null;
    renderScriptManager(container);
    if (onRefreshUI) onRefreshUI();
  });
}

export function resetActiveScript(): void {
  activeScriptId = null;
}
