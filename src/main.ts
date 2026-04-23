// ===================================================================
// VMV8 — BRAND STRATEGY AGENT (BRANDY)
// Main entry point — wires services, store, and components together
// ===================================================================

import './style.css';
import { inject } from '@vercel/analytics';

inject();

// Config
import { FRAMEWORK, type ChatMessage } from './config/framework';

// Store
import { state, saveSession, loadSession, clearSession, getFilledCount, getProgressStats, hasExistingData } from './store/brandscript.store';

// Services
import { callGroq } from './services/groq.service';
import { applyExtractions } from './services/extraction.service';
import { startRecording, stopRecording, processAudioFile, audioState } from './services/audio.service';
import { scrapeContextSources } from './services/scrape.service';
import { processCSVFile } from './services/csv.service';

// Components
import { renderMessage, showTyping, removeTyping } from './components/ChatPanel';
import { renderBrandscript } from './components/BrandscriptPanel';
import { renderNav } from './components/SidebarNav';
import { renderInterviewCard } from './components/InterviewCard';
import type { SectionId } from './config/framework';
import { exportBigDoc } from './services/export.service';

// ─── DOM REFERENCES ─────────────────────────────────────────────────

const chatMessages = document.getElementById('chat-messages')!;
const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
const btnSend = document.getElementById('btn-send')!;
const btnReset = document.getElementById('btn-reset')!;
const btnExport = document.getElementById('btn-export')!;
const sectionNav = document.getElementById('section-nav')!;
const brandscriptContent = document.getElementById('brandscript-content')!;
const progressFill = document.getElementById('progress-fill')!;
const progressPct = document.getElementById('progress-pct')!;

// Audio elements
const btnMic = document.getElementById('btn-mic')!;
const btnUpload = document.getElementById('btn-upload')!;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const recordingOverlay = document.getElementById('recording-overlay')!;
const recordingTimer = document.getElementById('recording-timer')!;
const waveformCanvas = document.getElementById('waveform-canvas') as HTMLCanvasElement;
const btnCancelRecording = document.getElementById('btn-cancel-recording')!;
const btnStopRecording = document.getElementById('btn-stop-recording')!;
const recordingLiveText = document.getElementById('recording-live-text')!;
const fileUploadZone = document.getElementById('file-upload-zone')!;
const processingOverlay = document.getElementById('processing-overlay')!;
const processingTitle = document.getElementById('processing-title')!;
const processingSubtitle = document.getElementById('processing-subtitle')!;
const processingProgressBar = document.getElementById('processing-progress-bar')!;

// CSV elements
const btnCsvUpload  = document.getElementById('btn-csv-upload') as HTMLButtonElement;
const csvFileInput  = document.getElementById('csv-file-input') as HTMLInputElement;

// Context inputs
const ctxWebsite = document.getElementById('ctx-website') as HTMLInputElement;
const ctxLinkedin = document.getElementById('ctx-linkedin') as HTMLInputElement;
const ctxIndustry = document.getElementById('ctx-industry') as HTMLSelectElement;
const ctxProfession = document.getElementById('ctx-profession') as HTMLSelectElement;
const ctxServices = document.getElementById('ctx-services') as HTMLSelectElement;
const ctxCountry = document.getElementById('ctx-country') as HTMLSelectElement;
const ctxNoWebsite = document.getElementById('ctx-no-website') as HTMLInputElement;
const btnUseContext = document.getElementById('btn-use-context') as HTMLButtonElement;
const ctxLoading = document.getElementById('ctx-loading') as HTMLDivElement;
const ctxLoadingTitle = document.getElementById('ctx-loading-title') as HTMLDivElement;
const ctxLoadingSubtitle = document.getElementById('ctx-loading-subtitle') as HTMLDivElement;
const navContextSummary = document.getElementById('nav-context-summary') as HTMLButtonElement;
const contextSummaryPanel = document.getElementById('context-summary-panel') as HTMLDivElement;
const contextSummaryOverview = document.getElementById('context-summary-overview') as HTMLDivElement;
const contextSummaryPanels = document.getElementById('context-summary-panels') as HTMLDivElement;

interface ContextPanel {
  title: string;
  subtitle: string;
  body: string;
}

let collectedContextPayload = '';
let collectedContextOverview = '';
let collectedContextPanels: ContextPanel[] = [];
let rightPanelView: 'brandscript' | 'context' = 'brandscript';

function setRightPanelView(view: 'brandscript' | 'context'): void {
  rightPanelView = view;
  const hasContext = !!collectedContextOverview && collectedContextPanels.length > 0;

  if (view === 'context' && hasContext) {
    contextSummaryPanel.classList.remove('hidden');
    brandscriptContent.classList.add('hidden');
    navContextSummary.classList.add('active');
  } else {
    contextSummaryPanel.classList.add('hidden');
    brandscriptContent.classList.remove('hidden');
    navContextSummary.classList.remove('active');
  }
}

// ─── REFRESH ALL UI ─────────────────────────────────────────────────

function refreshUI(): void {
  renderNav(sectionNav, progressFill, progressPct, () => refreshUI(), startInterviewFlow);
  renderBrandscript(brandscriptContent);
  if (rightPanelView !== 'context') {
    setRightPanelView('brandscript');
  }
}

// ─── INTERVIEW FLOW ─────────────────────────────────────────────────

function startInterviewFlow(startSectionIndex = 0): void {
  setRightPanelView('brandscript');
  const sectionId = FRAMEWORK[startSectionIndex]?.id;
  if (!sectionId) return;

  addSystemMessage({
    role: 'agent',
    content: `Let's build your **${FRAMEWORK[startSectionIndex].label}** section! ${FRAMEWORK[startSectionIndex].icon}\n\nSelect the options that best fit, or type your own. You can skip any field.`,
  });

  setTimeout(() => {
    renderInterviewCard(
      chatMessages,
      sectionId as SectionId,
      // onComplete
      (completedSectionId) => {
        refreshUI();
        saveSession();

        const nextIndex = FRAMEWORK.findIndex(s => s.id === completedSectionId) + 1;
        if (nextIndex < FRAMEWORK.length) {
          state.activeSection = nextIndex;
          addSystemMessage({
            role: 'agent',
            content: `${FRAMEWORK[nextIndex - 1].icon} **${FRAMEWORK[nextIndex - 1].label}** section saved!\n\nReady for **${FRAMEWORK[nextIndex].label}**?`,
            quickActions: [`Continue to ${FRAMEWORK[nextIndex].label} →`, 'Take a break — I\'ll chat instead'],
          });
        } else {
          addSystemMessage({
            role: 'agent',
            content: `🎉 **All 8 sections complete!**\n\nYour B.I.G Doc is ready. Click **Export B.I.G Doc** to download it as a Markdown file, or click ✨ **Refine** on any section to have me polish the content with AI.`,
            quickActions: ['📄 Export B.I.G Doc', '✨ Refine with AI'],
          });
        }
      },
      // onAiRefine
      (sId, fieldId, rawAnswer) => {
        const refinementPrompt = fieldId === '*'
          ? `Here are my quick answers for the ${FRAMEWORK.find(s => s.id === sId)?.label} section. Please refine and expand these into polished, professional descriptions for the B.I.G Doc:\n\n${rawAnswer}`
          : `For ${fieldId}: ${rawAnswer}. Please refine this.`;
        handleUserInput(refinementPrompt);
      }
    );
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 300);
}

// ─── HANDLE USER INPUT ──────────────────────────────────────────────

async function handleUserInput(text: string): Promise<void> {
  if (!text.trim()) return;

  // Handle quick action routing
  const lower = text.toLowerCase();
  if (lower.includes('interview me') || lower.includes('section by section') || lower.includes('guided interview')) {
    startInterviewFlow(0);
    return;
  }
  if (lower.startsWith('continue to ') && lower.includes('→')) {
    const sectionName = text.replace('Continue to ', '').replace(' →', '').trim();
    const idx = FRAMEWORK.findIndex(s => s.label.toLowerCase() === sectionName.toLowerCase());
    if (idx >= 0) {
      startInterviewFlow(idx);
      return;
    }
  }
  if (lower.includes('export b.i.g doc')) {
    btnExport.click();
    return;
  }
  if (lower.includes('refine with ai') || lower.includes('refine')) {
    // Start refinement of first section with data
    const firstFilled = FRAMEWORK.findIndex(s => s.fields.some(f => state.brandscript[s.id][f.id]));
    if (firstFilled >= 0) {
      const section = FRAMEWORK[firstFilled];
      const answers = section.fields
        .filter(f => state.brandscript[section.id][f.id])
        .map(f => `${f.label}: ${state.brandscript[section.id][f.id]}`).join('\n');
      const refinementPrompt = `Please refine and expand these ${section.label} section answers into polished, professional B.I.G Doc entries:\n\n${answers}`;
      // Fall through to normal Groq handling below
      text = refinementPrompt;
    }
  }

  const userMsg = { role: 'user' as const, content: text };
  state.messages.push(userMsg);
  state.conversationHistory.push(userMsg);
  renderMessage(chatMessages, userMsg, handleUserInput);

  chatInput.value = '';
  chatInput.style.height = 'auto';

  showTyping(chatMessages);

  try {
    // JSON mode call — returns typed { message, extractions }
    const response = await callGroq(text, 2, collectedContextPayload);

    removeTyping();

    // Apply extractions to brandscript state
    applyExtractions(response.extractions);

    const agentMsg = { role: 'agent' as const, content: response.message };
    state.messages.push(agentMsg);
    state.conversationHistory.push({ role: 'agent', content: response.message });
    renderMessage(chatMessages, agentMsg, handleUserInput);

  } catch (err) {
    removeTyping();
    console.error('Groq API error:', err);
    const error = err as Error;
    let errContent = `⚠️ **AI Error**\n\n`;
    if (error.message?.includes('API_KEY')) {
      errContent += `The API key is invalid or missing. Check your \`.env\` file.`;
    } else if (error.message?.includes('quota')) {
      errContent += `Rate limit hit. Please wait a moment and try again.`;
    } else {
      errContent += `Something went wrong: ${error.message}\n\nPlease try again.`;
    }
    const errorMsg = { role: 'agent' as const, content: errContent };
    state.messages.push(errorMsg);
    renderMessage(chatMessages, errorMsg, handleUserInput);
  }

  refreshUI();
  saveSession();
}

// ─── MESSAGE HELPER ─────────────────────────────────────────────────

function addSystemMessage(msg: ChatMessage): void {
  state.messages.push(msg);
  renderMessage(chatMessages, msg, handleUserInput);
}

function setContextLoading(loading: boolean, title = 'Collecting context...', subtitle = 'Scraping and preparing strategic overview.'): void {
  ctxLoading.classList.toggle('hidden', !loading);
  ctxLoadingTitle.textContent = title;
  ctxLoadingSubtitle.textContent = subtitle;
}

function summarizeContext(text: string, limit = 260): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return 'No summary available.';
  return compact.length > limit ? `${compact.slice(0, limit).trim()}...` : compact;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderContextSummary(overview: string, panels: ContextPanel[]): void {
  if (!overview || panels.length === 0) {
    navContextSummary.classList.add('hidden');
    contextSummaryOverview.textContent = '';
    contextSummaryPanels.innerHTML = '';
    setRightPanelView('brandscript');
    return;
  }

  navContextSummary.classList.remove('hidden');
  contextSummaryOverview.textContent = overview;

  contextSummaryPanels.innerHTML = panels.map(panel => {
    return `
      <details class="context-preview-panel">
        <summary>
          <span class="context-preview-title">${escapeHtml(panel.title)}</span>
          <span class="context-preview-subtitle">${escapeHtml(panel.subtitle)}</span>
        </summary>
        <div class="context-preview-body">${escapeHtml(panel.body)}</div>
      </details>
    `;
  }).join('');
}

function clearCollectedContext(): void {
  collectedContextPayload = '';
  collectedContextOverview = '';
  collectedContextPanels = [];
  renderContextSummary('', []);
}

function openContextSummaryPanel(): void {
  if (!collectedContextOverview || collectedContextPanels.length === 0) return;
  renderContextSummary(collectedContextOverview, collectedContextPanels);
  setRightPanelView('context');
  contextSummaryPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function handleContextIngestion(): Promise<void> {
  const websiteUrl = ctxWebsite.value.trim();
  const linkedinUrl = ctxLinkedin.value.trim();
  const noWebsite = ctxNoWebsite.checked;

  const industry = ctxIndustry.value.trim();
  const profession = ctxProfession.value.trim();
  const services = ctxServices.value.trim();
  const country = ctxCountry.value.trim();

  if (!websiteUrl && !linkedinUrl && !noWebsite) {
    addSystemMessage({
      role: 'agent',
      content: 'Add at least one source: **Website URL**, **LinkedIn URL**, or mark **No website available**.',
    });
    return;
  }

  if (noWebsite) {
    const missing: string[] = [];
    if (!industry) missing.push('Industry');
    if (!profession) missing.push('Profession');
    if (!services) missing.push('Services offered');
    if (!country) missing.push('Country');

    if (missing.length > 0) {
      addSystemMessage({
        role: 'agent',
        content: `For businesses without a website, please complete: **${missing.join(', ')}**.`,
      });
      return;
    }
  }

  clearCollectedContext();
  btnUseContext.disabled = true;
  const oldLabel = btnUseContext.textContent || 'Collect Context';
  btnUseContext.textContent = 'Collecting context...';
  setContextLoading(true, 'Collecting context...', 'Scraping and generating a strategic overview from your sources.');

  try {
    let referenceContext = '';
    const contextPanels: ContextPanel[] = [];
    const sourceLabels: string[] = [];
    let totalChars = 0;

    if (!noWebsite && (websiteUrl || linkedinUrl)) {
      setContextLoading(true, 'Scraping sources...', 'Fetching and cleaning content from website/LinkedIn.');
      const results = await scrapeContextSources({ websiteUrl, linkedinUrl });
      const successful = results.filter(r => r.ok && r.text);
      const failed = results.filter(r => !r.ok);

      if (successful.length > 0) {
        referenceContext += successful.map(result => {
          if (result.text) {
            const label = result.source === 'website' ? 'Website' : 'LinkedIn';
            sourceLabels.push(label);
            totalChars += result.text.length;
            contextPanels.push({
              title: `${label} Context`,
              subtitle: `${result.url} · ${result.text.length.toLocaleString()} chars`,
              body: result.text,
            });
          }
          return `### ${result.source.toUpperCase()} CONTEXT (${result.url})\n${result.text}`;
        }).join('\n\n');
      }

      if (failed.length > 0) {
        addSystemMessage({
          role: 'agent',
          content: `Some sources could not be scraped: ${failed.map(f => `${f.source} (${f.error})`).join('; ')}`,
        });
      }
    }

    if (noWebsite) {
      const manualProfile = `Industry: ${industry}\nProfession: ${profession}\nServices offered: ${services}\nCountry: ${country}`;
      referenceContext += `\n\n### MANUAL BUSINESS PROFILE\n- Industry: ${industry}\n- Profession: ${profession}\n- Services offered: ${services}\n- Country: ${country}`;
      sourceLabels.push('Manual Profile');
      totalChars += manualProfile.length;
      contextPanels.push({
        title: 'Manual Business Profile',
        subtitle: 'User-provided fallback context',
        body: manualProfile,
      });
    }

    const usableContext = referenceContext.trim();

    if (!usableContext) {
      addSystemMessage({
        role: 'agent',
        content: 'No usable context was collected. Please adjust URLs or provide manual profile details.',
      });
      return;
    }

    collectedContextPayload = usableContext;
    const uniqueSources = Array.from(new Set(sourceLabels));
    const overview = `Generated overview from ${uniqueSources.length} source${uniqueSources.length === 1 ? '' : 's'} (${uniqueSources.join(', ')}), with about ${totalChars.toLocaleString()} characters of usable context. Click any panel to preview details. This context is now used as reference for future framework answers.`;
    collectedContextOverview = overview;
    collectedContextPanels = contextPanels.map(panel => ({
      ...panel,
      body: summarizeContext(panel.body, 1800),
    }));

    setContextLoading(false);
    renderContextSummary(collectedContextOverview, collectedContextPanels);
    openContextSummaryPanel();

    addSystemMessage({
      role: 'agent',
      content: '✅ Context collected successfully. It is now saved as reference context for future framework answers and can be reviewed from **Context Summary** in the left navigation.',
    });
  } finally {
    setContextLoading(false);
    btnUseContext.disabled = false;
    btnUseContext.textContent = oldLabel;
  }
}

// ─── EVENT LISTENERS ────────────────────────────────────────────────

btnSend.addEventListener('click', () => handleUserInput(chatInput.value));

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleUserInput(chatInput.value);
  }
});

chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
});

ctxNoWebsite.addEventListener('change', () => {
  const disabled = ctxNoWebsite.checked;
  ctxWebsite.disabled = disabled;
  ctxLinkedin.disabled = disabled;
  if (disabled) {
    ctxWebsite.value = '';
    ctxLinkedin.value = '';
  }
});

btnUseContext.addEventListener('click', () => {
  handleContextIngestion();
});

navContextSummary.addEventListener('click', () => {
  if (rightPanelView === 'context') {
    setRightPanelView('brandscript');
  } else {
    openContextSummaryPanel();
  }
});

// Reset
btnReset.addEventListener('click', () => {
  if (confirm('Are you sure you want to reset? All progress will be lost.')) {
    clearSession();
    clearCollectedContext();
    chatMessages.innerHTML = '';
    refreshUI();
    showWelcome();
  }
});

// ─── EXPORT B.I.G DOC ──────────────────────────────────────────────

btnExport.addEventListener('click', () => {
  // Detect country from context inputs or finance field
  const countryEl = document.getElementById('ctx-country') as HTMLSelectElement | null;
  const country = countryEl?.value || state.brandscript.administration?.finance || 'South Africa';
  exportBigDoc(country);
});

// ─── AUDIO: MIC RECORDING ───────────────────────────────────────────

const recordingElements = {
  btnMic,
  overlay: recordingOverlay,
  liveText: recordingLiveText,
  timer: recordingTimer,
  canvas: waveformCanvas,
};

btnMic.addEventListener('click', () => {
  if (audioState.isRecording) {
    stopRecording(true, recordingElements, handleUserInput, addSystemMessage);
  } else {
    startRecording(recordingElements, addSystemMessage);
  }
});

btnStopRecording.addEventListener('click', () => {
  stopRecording(true, recordingElements, handleUserInput, addSystemMessage);
});

btnCancelRecording.addEventListener('click', () => {
  stopRecording(false, recordingElements, handleUserInput, addSystemMessage);
  addSystemMessage({ role: 'agent', content: `🎙️ Recording cancelled. Click the mic when ready, or type/paste content.` });
});

// ─── AUDIO: FILE UPLOAD ─────────────────────────────────────────────

btnUpload.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    processAudioFile(target.files[0], processingOverlay, processingTitle, processingSubtitle, processingProgressBar, handleUserInput, addSystemMessage);
  }
  fileInput.value = '';
});

// ─── CSV: ANALYTICS UPLOAD ──────────────────────────────────────────

btnCsvUpload.addEventListener('click', () => csvFileInput.click());
csvFileInput.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    processCSVFile(
      target.files[0],
      (msg) => addSystemMessage(msg),
      (msg) => addSystemMessage(msg)
    );
  }
  csvFileInput.value = '';
});

// Drag & Drop
const chatInputArea = document.querySelector('.chat-input-area')!;
['dragenter', 'dragover'].forEach(evt => {
  chatInputArea.addEventListener(evt, (e) => {
    e.preventDefault();
    fileUploadZone.classList.add('active');
  });
});
['dragleave', 'drop'].forEach(evt => {
  chatInputArea.addEventListener(evt, (e) => {
    e.preventDefault();
    fileUploadZone.classList.remove('active');
  });
});
chatInputArea.addEventListener('drop', (e) => {
  e.preventDefault();
  const de = e as DragEvent;
  const files = de.dataTransfer?.files;
  if (files && files.length > 0 && files[0].type.startsWith('audio/')) {
    processAudioFile(files[0], processingOverlay, processingTitle, processingSubtitle, processingProgressBar, handleUserInput, addSystemMessage);
  }
});

// ─── WELCOME MESSAGE ────────────────────────────────────────────────

function showWelcome(): void {
  chatMessages.innerHTML = `
    <div class="welcome-card">
      <h1>Build Your Brand Strategy</h1>
      <p>I'm <strong>Brandy</strong>, your AI Brand Strategist powered by the VMV8 framework. Choose how you'd like to build your <strong>B.I.G Doc</strong> — guided interview, free chat, audio recording, or paste a transcript.</p>
      <div class="welcome-sections">
        ${FRAMEWORK.map(s => `
          <div class="welcome-section-chip">
            <div class="welcome-chip-dot" style="background: ${s.color}"></div>
            ${s.icon} ${s.label}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  setTimeout(() => {
    addSystemMessage({
      role: 'agent',
      content: `Welcome! 👋 I'm **Brandy**, your VMV8 Brand Strategy Agent.\n\nI'll help you build your **B.I.G Doc** (Brand Identity Guiding Document) across **8 sections**.\n\nHow would you like to get started?`,
      quickActions: [
        '📝 Guided Interview (recommended)',
        '🎙️ Record a meeting',
        '📋 Paste a transcript',
        '💬 Free chat',
      ],
    });
  }, 500);
}

// ─── INITIALIZE ─────────────────────────────────────────────────────

const hadSession = loadSession();
refreshUI();

if (hadSession && hasExistingData()) {
  const { filled, pct } = getProgressStats();
  const totalFields = FRAMEWORK.reduce((acc, s) => acc + s.fields.length, 0);

  // Find next incomplete section
  const nextIncomplete = FRAMEWORK.findIndex(s =>
    s.fields.some(f => !state.brandscript[s.id][f.id])
  );
  const nextLabel = nextIncomplete >= 0 ? FRAMEWORK[nextIncomplete].label : null;

  chatMessages.innerHTML = `
    <div class="welcome-card">
      <h1>Welcome Back! 🌋</h1>
      <p>Your previous session has been restored. You have <strong>${filled}/${totalFields}</strong> fields completed in your B.I.G Doc.</p>
      <div class="welcome-sections">
        ${FRAMEWORK.map(s => `
          <div class="welcome-section-chip">
            <div class="welcome-chip-dot" style="background: ${s.color}"></div>
            ${s.icon} ${s.label} — ${getFilledCount(s.id)}/${s.fields.length}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const quickActions = [
    nextLabel ? `📝 Continue ${nextLabel} section` : '📄 Export B.I.G Doc',
    '📝 Guided Interview (restart)',
    '💬 Free chat',
    '🎙️ Record audio',
  ];

  setTimeout(() => {
    addSystemMessage({
      role: 'agent',
      content: `Welcome back! 👋 Your B.I.G Doc session has been restored — **${filled}/${totalFields}** fields filled (${pct}%).\n\nYou can continue, start the guided interview, or chat freely.`,
      quickActions,
    });
  }, 400);
} else {
  showWelcome();
}

// Route quick actions that trigger interviews
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (!target.classList.contains('quick-action-btn')) return;
  const action = target.dataset.action || '';
  const lower = action.toLowerCase();

  if (lower.includes('guided interview')) {
    startInterviewFlow(0);
    return;
  }
  if (lower.startsWith('📝 continue ') && lower.includes('section')) {
    const sectionName = action.replace('📝 Continue ', '').replace(' section', '').trim();
    const idx = FRAMEWORK.findIndex(s => s.label.toLowerCase() === sectionName.toLowerCase());
    if (idx >= 0) {
      startInterviewFlow(idx);
      return;
    }
  }
});
