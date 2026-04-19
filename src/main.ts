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
import { supabase, getCurrentSession, setupAuthListener } from './services/supabase.service';
import { getProfile, upsertProfile, uploadAvatar, logActivity, getActivity, getActivityStats } from './services/profile.service';
import { generateMarketData } from './services/market.service';
import { generateBigDocPdf } from './services/pdf.service';
import * as pdfjsLib from 'pdfjs-dist';
import PdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorkerUrl;

// Components
import { renderMessage, showTyping, removeTyping } from './components/ChatPanel';
import { renderBrandscript } from './components/BrandscriptPanel';
import { renderNav } from './components/SidebarNav';
import { renderInterviewCard } from './components/InterviewCard';
import type { SectionId } from './config/framework';

// ─── DOM REFERENCES ─────────────────────────────────────────────────

const chatMessages = document.getElementById('chat-messages')!;
const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
const btnSend = document.getElementById('btn-send')!;
const btnReset = document.getElementById('btn-reset')!;
const btnDownloadPdf = document.getElementById('btn-download-pdf') as HTMLButtonElement;
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

// Auth & Pages
const authOverlay = document.getElementById('auth-overlay')!;
const authErrorEl = document.getElementById('auth-error')!;
const authErrorSignup = document.getElementById('auth-error-signup')!;
const btnSignin = document.getElementById('btn-signin')!;
const btnSignup = document.getElementById('btn-signup')!;
const contextPage = document.getElementById('context-page')!;
const contextPageEdit = document.getElementById('context-page-edit') as HTMLTextAreaElement;
const btnContextSave = document.getElementById('btn-context-save')!;
const btnContextCancel = document.getElementById('btn-context-cancel')!;
const contextEditorMeta = document.getElementById('context-editor-meta')!;
const ctxCharCount = document.getElementById('ctx-char-count')!;
const ctxClearBtn = document.getElementById('ctx-clear-btn')!;
// Transcription modal
const transcriptionModal = document.getElementById('transcription-modal')!;
const transcriptName = document.getElementById('transcript-name') as HTMLInputElement;
const transcriptDesc = document.getElementById('transcript-desc') as HTMLTextAreaElement;
const modalSave = document.getElementById('modal-save')!;
const modalSkip = document.getElementById('modal-skip')!;
const modalClose = document.getElementById('modal-close')!;
// Recording progress
const recordingLimitFill = document.getElementById('recording-limit-fill')!;
let pendingTranscriptText = '';
let recordingLimitTimer: ReturnType<typeof setInterval> | null = null;
// Profile page
const profilePage = document.getElementById('profile-page')!;
const btnProfile = document.getElementById('btn-profile')!;
const btnProfileClose = document.getElementById('btn-profile-close')!;
const btnSignout = document.getElementById('btn-signout')!;
const btnProfileSave = document.getElementById('btn-profile-save')!;
const profileDisplayName = document.getElementById('profile-display-name') as HTMLInputElement;
const profileUsername = document.getElementById('profile-username') as HTMLInputElement;
const profileBio = document.getElementById('profile-bio') as HTMLTextAreaElement;
const profileEmail = document.getElementById('profile-email')!;
const profileJoined = document.getElementById('profile-joined')!;
const profileSaveMsg = document.getElementById('profile-save-msg')!;
const profileAvatarInitials = document.getElementById('profile-avatar-initials')!;
const profileAvatarImg = document.getElementById('profile-avatar-img') as HTMLImageElement;
const headerAvatarInitials = document.getElementById('header-avatar-initials')!;
const headerAvatarImg = document.getElementById('header-avatar-img') as HTMLImageElement;
const avatarInput = document.getElementById('avatar-input') as HTMLInputElement;
const profileActivityFeed = document.getElementById('profile-activity-feed')!;
let currentUserId: string | null = null;

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
            content: `🎉 **All 8 sections complete!**\n\nYour B.I.G Doc is ready. Click **📥 PDF + Market Data** to download your complete strategy, or click ✨ **Refine** on any section to have me polish the content with AI.`,
            quickActions: ['📥 Download PDF', '✨ Refine with AI'],
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
  if (lower.includes('download pdf')) {
    btnDownloadPdf.click();
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

  const isTranscription = text.includes('📁 [Audio File') || text.includes('🎙️ [Audio Recording') || text.includes('🎙️ **');
  const userMsg = { role: 'user' as const, content: isTranscription ? text.replace(/\n\n\[SYSTEM:.*\]$/g, '') : text };
  
  state.messages.push(userMsg);
  state.conversationHistory.push({ role: 'user', content: text }); // text includes system prompt
  renderMessage(chatMessages, userMsg, handleUserInput);

  // Log prompt activity
  if (currentUserId && !isTranscription) {
    logActivity(currentUserId, 'prompt', text.slice(0, 120), `${text.length} chars`);
  }

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

// ─── AUTHENTICATION ────────────────────────────────────────────────

function showAuthError(msg: string, signup = false) {
  const el = signup ? authErrorSignup : authErrorEl;
  el.textContent = msg;
  el.classList.remove('hidden');
}
function clearAuthErrors() {
  authErrorEl.textContent = '';
  authErrorEl.classList.add('hidden');
  authErrorSignup.textContent = '';
  authErrorSignup.classList.add('hidden');
}

// Tab switching
document.getElementById('tab-signin')?.addEventListener('click', () => {
  document.getElementById('auth-form-signin')?.classList.remove('hidden');
  document.getElementById('auth-form-signup')?.classList.add('hidden');
  document.getElementById('tab-signin')?.classList.add('active');
  document.getElementById('tab-signup')?.classList.remove('active');
  clearAuthErrors();
});
document.getElementById('tab-signup')?.addEventListener('click', () => {
  document.getElementById('auth-form-signup')?.classList.remove('hidden');
  document.getElementById('auth-form-signin')?.classList.add('hidden');
  document.getElementById('tab-signup')?.classList.add('active');
  document.getElementById('tab-signin')?.classList.remove('active');
  clearAuthErrors();
});

// Show/hide password toggle
document.getElementById('auth-pass-toggle')?.addEventListener('click', () => {
  const inp = document.getElementById('auth-password') as HTMLInputElement;
  const btn = document.getElementById('auth-pass-toggle')!;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? 'Show' : 'Hide';
});
document.getElementById('auth-pass-toggle-signup')?.addEventListener('click', () => {
  const inp = document.getElementById('auth-password-signup') as HTMLInputElement;
  const btn = document.getElementById('auth-pass-toggle-signup')!;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? 'Show' : 'Hide';
});

btnSignin.addEventListener('click', async () => {
  const emailInput = document.getElementById('auth-email') as HTMLInputElement;
  const passInput = document.getElementById('auth-password') as HTMLInputElement;
  if (!emailInput?.value || !passInput?.value) return showAuthError('Please enter your email and password.');
  clearAuthErrors();
  btnSignin.textContent = 'Signing in...';
  (btnSignin as HTMLButtonElement).disabled = true;
  const { error } = await supabase.auth.signInWithPassword({ email: emailInput.value, password: passInput.value });
  btnSignin.textContent = 'Sign In';
  (btnSignin as HTMLButtonElement).disabled = false;
  if (error) showAuthError(error.message);
});

btnSignup.addEventListener('click', async () => {
  const emailInput = document.getElementById('auth-email-signup') as HTMLInputElement;
  const passInput = document.getElementById('auth-password-signup') as HTMLInputElement;
  if (!emailInput?.value || !passInput?.value) return showAuthError('Please enter your email and password.', true);
  if (passInput.value.length < 6) return showAuthError('Password must be at least 6 characters.', true);
  clearAuthErrors();
  btnSignup.textContent = 'Creating account...';
  (btnSignup as HTMLButtonElement).disabled = true;
  const { error } = await supabase.auth.signUp({ email: emailInput.value, password: passInput.value });
  btnSignup.textContent = 'Create Account';
  (btnSignup as HTMLButtonElement).disabled = false;
  if (error) showAuthError(error.message, true);
  else showAuthError('✅ Account created! Check your email to confirm, then sign in.', true);
});

// Allow Enter key in auth inputs
['auth-email','auth-password'].forEach(id => {
  document.getElementById(id)?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') btnSignin.click();
  });
});
['auth-email-signup','auth-password-signup'].forEach(id => {
  document.getElementById(id)?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') btnSignup.click();
  });
});

setupAuthListener(async (session) => {
  if (session) {
    authOverlay.classList.add('hidden');
    currentUserId = session.user.id;
    // Load profile to show avatar/initials in header
    const profile = await getProfile(session.user.id);
    const initials = getInitials(profile?.display_name || null, session.user.email || null);
    setAvatarUI(profile?.avatar_url || null, initials);
    // Log login event
    await logActivity(session.user.id, 'login', 'Signed in', session.user.email || '');
  } else {
    authOverlay.classList.remove('hidden');
    currentUserId = null;
  }
});

// ─── CONTEXT PAGE EDITING ──────────────────────────────────────────

function updateCtxMeta() {
  const len = contextPageEdit.value.length;
  const sources = collectedContextPanels.length;
  ctxCharCount.textContent = `${len.toLocaleString()} chars`;
  contextEditorMeta.innerHTML = sources > 0
    ? collectedContextPanels.map(p =>
        `<span class="ctx-meta-pill">📄 ${p.title} <small style="opacity:0.6">${p.subtitle}</small></span>`
      ).join('')
    : '<span style="color:var(--text-muted)">No sources collected yet.</span>';
}

contextPageEdit.addEventListener('input', () => {
  ctxCharCount.textContent = `${contextPageEdit.value.length.toLocaleString()} chars`;
});

ctxClearBtn.addEventListener('click', () => {
  if (confirm('Clear all context? This cannot be undone.')) {
    contextPageEdit.value = '';
    ctxCharCount.textContent = '0 chars';
  }
});

btnContextSave.addEventListener('click', () => {
  collectedContextPayload = contextPageEdit.value.trim();
  const len = collectedContextPayload.length;
  collectedContextOverview = `Edited context summary — ${len.toLocaleString()} characters, ${collectedContextPanels.length} source(s).`;
  renderContextSummary(collectedContextOverview, collectedContextPanels.length > 0 ? collectedContextPanels : [{
    title: 'Edited Context',
    subtitle: 'Manually edited by user',
    body: summarizeContext(collectedContextPayload, 1800)
  }]);
  contextPage.classList.add('hidden');
  addSystemMessage({ role: 'agent', content: `✅ Context saved — **${len.toLocaleString()} characters** of context will be used by Brandy.` });
});

btnContextCancel.addEventListener('click', () => {
  contextPage.classList.add('hidden');
});

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
  contextPageEdit.value = collectedContextPayload;
  updateCtxMeta();
  contextPage.classList.remove('hidden');
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

// ─── DOWNLOAD B.I.G DOC PDF ─────────────────────────────────────────

btnDownloadPdf.addEventListener('click', async () => {
  const stats = getProgressStats();
  if (stats.pct !== 100) {
    addSystemMessage({
      role: 'agent',
      content: `⚠️ **Action Not Allowed**\n\nPlease complete all 8 framework sections before exporting the B.I.G. Doc. You are currently at ${stats.pct}% completion.`,
    });
    return;
  }

  // Disable button and show generating state
  btnDownloadPdf.disabled = true;
  const originalLabel = btnDownloadPdf.innerHTML;
  btnDownloadPdf.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
    Generating market data...`;

  // Show processing overlay
  processingTitle.textContent = 'Generating Market Intelligence';
  processingSubtitle.textContent = 'Analyzing your brand data with AI...';
  processingProgressBar.style.width = '20%';
  processingOverlay.classList.remove('hidden');

  try {
    // 1. Generate market data with AI
    const marketData = await generateMarketData(collectedContextPayload);

    // Update overlay
    processingTitle.textContent = 'Building Your PDF';
    processingSubtitle.textContent = 'Assembling B.I.G Doc with market intelligence...';
    processingProgressBar.style.width = '70%';

    // Small delay so the user sees the progress update
    await new Promise(r => setTimeout(r, 600));

    // 2. Generate and download the PDF
    generateBigDocPdf({
      brandscript: state.brandscript,
      contextPayload: collectedContextPayload,
      marketData,
    });

    processingProgressBar.style.width = '100%';

    addSystemMessage({
      role: 'agent',
      content: '📥 **B.I.G Doc PDF downloaded!** Your document includes your brand strategy framework and AI-generated market intelligence.',
    });

    // Log activity
    if (currentUserId) {
      logActivity(currentUserId, 'pdf_upload', 'B.I.G Doc PDF exported', 'PDF with market data');
    }

  } catch (err) {
    console.error('PDF generation error:', err);
    addSystemMessage({
      role: 'agent',
      content: `⚠️ **PDF Generation Failed**\n\n${(err as Error).message || 'Something went wrong. Please try again.'}`,
    });
  } finally {
    // Reset button and hide overlay
    setTimeout(() => {
      processingOverlay.classList.add('hidden');
      processingProgressBar.style.width = '0%';
    }, 800);
    btnDownloadPdf.disabled = false;
    btnDownloadPdf.innerHTML = originalLabel;
  }
});

// ─── TRANSCRIPTION MODAL ────────────────────────────────────────────

function showTranscriptionModal(transcript: string) {
  pendingTranscriptText = transcript;
  transcriptName.value = '';
  transcriptDesc.value = '';
  transcriptionModal.classList.remove('hidden');
  setTimeout(() => transcriptName.focus(), 100);
  // Log transcription activity
  if (currentUserId) logActivity(currentUserId, 'transcription', 'Audio transcribed', `${transcript.length} chars`);
}

function submitTranscription() {
  const name = transcriptName.value.trim();
  const desc = transcriptDesc.value.trim();
  let finalText = pendingTranscriptText;
  if (name) finalText = `🎙️ **${name}**${desc ? `\n> ${desc}` : ''}\n\n${pendingTranscriptText}`;
  transcriptionModal.classList.add('hidden');
  
  const instruction = '\n\n[SYSTEM: Review the preceding transcript. If it contains new business logic, please aggressively update ALL applicable framework input boxes in the B.I.G Doc that we have not yet established or that need revision. Extract and return these updates.]';
  handleUserInput(finalText + instruction);
}

modalSave.addEventListener('click', submitTranscription);
modalSkip.addEventListener('click', () => {
  transcriptionModal.classList.add('hidden');
  const instruction = '\n\n[SYSTEM: Review the preceding transcript. If it contains new business logic, please aggressively update ALL applicable framework input boxes in the B.I.G Doc that we have not yet established or that need revision. Extract and return these updates.]';
  handleUserInput(pendingTranscriptText + instruction);
});
modalClose.addEventListener('click', () => transcriptionModal.classList.add('hidden'));

// ─── AUDIO: MIC RECORDING ───────────────────────────────────────────

const MAX_RECORDING_SECONDS = 5 * 60; // 5 minutes

function startRecordingLimitBar() {
  let elapsed = 0;
  recordingLimitFill.style.width = '0%';
  if (recordingLimitTimer) clearInterval(recordingLimitTimer);
  recordingLimitTimer = setInterval(() => {
    elapsed++;
    const pct = (elapsed / MAX_RECORDING_SECONDS) * 100;
    recordingLimitFill.style.width = `${pct}%`;
    if (elapsed >= MAX_RECORDING_SECONDS) {
      clearInterval(recordingLimitTimer!);
      recordingLimitTimer = null;
      stopRecording(true, recordingElements,
        (text) => showTranscriptionModal(`🎙️ [Audio Recording — 5 min limit reached]\n\n${text}`),
        addSystemMessage
      );
    }
  }, 1000);
}

function stopRecordingLimitBar() {
  if (recordingLimitTimer) { clearInterval(recordingLimitTimer); recordingLimitTimer = null; }
  recordingLimitFill.style.width = '0%';
}

const recordingElements = {
  btnMic,
  overlay: recordingOverlay,
  liveText: recordingLiveText,
  timer: recordingTimer,
  canvas: waveformCanvas,
};

btnMic.addEventListener('click', () => {
  if (audioState.isRecording) {
    stopRecordingLimitBar();
    stopRecording(true, recordingElements, (text) => showTranscriptionModal(`🎙️ [Audio Recording]\n\n${text}`), addSystemMessage);
  } else {
    startRecording(recordingElements, addSystemMessage);
    startRecordingLimitBar();
  }
});

btnStopRecording.addEventListener('click', () => {
  stopRecordingLimitBar();
  stopRecording(true, recordingElements, (text) => showTranscriptionModal(`🎙️ [Audio Recording]\n\n${text}`), addSystemMessage);
});

btnCancelRecording.addEventListener('click', () => {
  stopRecordingLimitBar();
  stopRecording(false, recordingElements, handleUserInput, addSystemMessage);
  addSystemMessage({ role: 'agent', content: `🎙️ Recording cancelled.` });
});

// ─── AUDIO & PDF: FILE UPLOAD ───────────────────────────────────────

async function processFileSelection(file: File) {
  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    const MAX_PDF_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_PDF_SIZE) {
      addSystemMessage({ role: 'agent', content: `❌ The PDF file is too large! Maximum allowed size is 5MB.` });
      return;
    }
    if (currentUserId) logActivity(currentUserId, 'pdf_upload', `PDF: ${file.name}`, `${(file.size/1024).toFixed(0)} KB`, file.size);
    await processPdfFile(file);
  } else if (file.type.startsWith('audio/')) {
    if (currentUserId) logActivity(currentUserId, 'file_upload', `Audio: ${file.name}`, `${(file.size/1024).toFixed(0)} KB`, file.size);
    processAudioFile(file, processingOverlay, processingTitle, processingSubtitle, processingProgressBar, handleUserInput, addSystemMessage);
  } else {
    addSystemMessage({ role: 'agent', content: `❌ Unsupported file type. Please upload audio or a PDF.` });
  }
}

async function processPdfFile(file: File) {
  processingTitle.textContent = "Processing PDF";
  processingSubtitle.textContent = "Extracting text content from the document...";
  processingOverlay.classList.remove('hidden');
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        fullText += strings.join(" ") + "\\n";
    }
    
    // Save as context
    collectedContextPayload += "\\n\\n### IMPORTED PDF: " + file.name + "\\n" + fullText;
    collectedContextOverview = `Added imported PDF "${file.name}" to context.`;
    collectedContextPanels.push({
      title: 'PDF Document',
      subtitle: file.name,
      body: summarizeContext(fullText, 1800)
    });
    
    // Refresh context summary UI
    renderContextSummary(collectedContextOverview, collectedContextPanels);
    
    addSystemMessage({ 
      role: 'agent', 
      content: `✅ Successfully extracted text from **${file.name}**. It's now added to your Context Summary!` 
    });
  } catch (error: any) {
    addSystemMessage({ role: 'agent', content: `❌ Failed to extract PDF text: ${error.message}` });
  } finally {
    processingOverlay.classList.add('hidden');
  }
}

btnUpload.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    processFileSelection(target.files[0]);
  }
  fileInput.value = '';
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
  if (files && files.length > 0) {
    processFileSelection(files[0]);
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

// ─── PROFILE PAGE ────────────────────────────────────────────────────

const ACTIVITY_ICONS: Record<string, string> = {
  prompt: '💬', transcription: '🎙️', file_upload: '📁', pdf_upload: '📄', login: '🔑'
};
const ACTIVITY_LABELS: Record<string, string> = {
  prompt: 'Prompt sent', transcription: 'Audio transcribed', file_upload: 'Audio file uploaded',
  pdf_upload: 'PDF uploaded', login: 'Signed in'
};

function getInitials(name: string | null, email: string | null): string {
  if (name && name.trim()) return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  if (email) return email[0].toUpperCase();
  return '?';
}

function setAvatarUI(avatarUrl: string | null, initials: string) {
  // Profile page avatar
  profileAvatarInitials.textContent = initials;
  if (avatarUrl) {
    profileAvatarImg.src = avatarUrl;
    profileAvatarImg.style.display = 'block';
    profileAvatarInitials.style.display = 'none';
  } else {
    profileAvatarImg.style.display = 'none';
    profileAvatarInitials.style.display = '';
  }
  // Header avatar
  headerAvatarInitials.textContent = initials;
  if (avatarUrl) {
    headerAvatarImg.src = avatarUrl;
    headerAvatarImg.style.display = 'block';
    headerAvatarInitials.style.display = 'none';
  } else {
    headerAvatarImg.style.display = 'none';
    headerAvatarInitials.style.display = '';
  }
}

function renderActivityFeed(activities: any[]) {
  if (!activities.length) {
    profileActivityFeed.innerHTML = '<div class="profile-activity-empty">No activity yet. Start a session to see your history here.</div>';
    return;
  }
  profileActivityFeed.innerHTML = activities.map(a => {
    const icon = ACTIVITY_ICONS[a.type] || '◆';
    const label = a.label || ACTIVITY_LABELS[a.type] || a.type;
    const time = new Date(a.created_at).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
    return `
      <div class="profile-activity-item">
        <div class="profile-act-icon ${a.type}">${icon}</div>
        <div class="profile-act-body">
          <div class="profile-act-label">${label}</div>
          ${a.detail ? `<div class="profile-act-detail">${a.detail}</div>` : ''}
        </div>
        <div class="profile-act-time">${time}</div>
      </div>`;
  }).join('');
}

async function openProfilePage() {
  if (!currentUserId) return;
  profilePage.classList.remove('hidden');

  // Load profile
  const [profile, activities, stats] = await Promise.all([
    getProfile(currentUserId),
    getActivity(currentUserId, 50),
    getActivityStats(currentUserId),
  ]);

  // Auth info
  const { data: { user } } = await supabase.auth.getUser();
  profileEmail.textContent = user?.email || '—';
  profileJoined.textContent = user?.created_at
    ? `Joined ${new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
    : '';

  // Fill form
  profileDisplayName.value = profile?.display_name || '';
  profileUsername.value = profile?.username || '';
  profileBio.value = profile?.bio || '';

  // Avatar
  const initials = getInitials(profile?.display_name || null, user?.email || null);
  setAvatarUI(profile?.avatar_url || null, initials);

  // Stats
  const limitBytes = profile?.storage_limit_bytes || (500 * 1024 * 1024);
  const usedBytes = stats.storageUsedBytes || 0;
  const storagePct = Math.min(100, Math.round((usedBytes / limitBytes) * 100));
  
  const pctEl = document.getElementById('stat-storage-pct');
  if (pctEl) pctEl.textContent = `${storagePct}%`;
  
  const barEl = document.getElementById('stat-storage-bar');
  if (barEl) barEl.style.width = `${storagePct}%`;
  
  const usedEl = document.getElementById('stat-storage-used');
  if (usedEl) usedEl.textContent = `${(usedBytes / (1024*1024)).toFixed(1)} MB`;
  
  const limitEl = document.getElementById('stat-storage-limit');
  if (limitEl) limitEl.textContent = `${(limitBytes / (1024*1024)).toFixed(0)} MB limit`;
  
  const transLimit = profile?.transcriptions_limit || 50;
  const tLeftEl = document.getElementById('stat-transcriptions-left');
  if (tLeftEl) tLeftEl.textContent = String(Math.max(0, transLimit - stats.transcriptions));
  
  const promptEl = document.getElementById('stat-prompts');
  if (promptEl) promptEl.textContent = String(stats.prompts);
  
  const loginEl = document.getElementById('stat-logins');
  if (loginEl) loginEl.textContent = String(stats.logins);

  // Activity feed
  renderActivityFeed(activities);
}

btnProfile.addEventListener('click', openProfilePage);
btnProfileClose.addEventListener('click', () => profilePage.classList.add('hidden'));

btnProfileSave.addEventListener('click', async () => {
  if (!currentUserId) return;
  (btnProfileSave as HTMLButtonElement).disabled = true;
  btnProfileSave.textContent = 'Saving...';
  const result = await upsertProfile({
    id: currentUserId,
    display_name: profileDisplayName.value.trim() || null,
    username: profileUsername.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || null,
    bio: profileBio.value.trim() || null,
  });
  (btnProfileSave as HTMLButtonElement).disabled = false;
  btnProfileSave.textContent = 'Save Profile';
  if (result) {
    profileSaveMsg.textContent = '✅ Profile saved!';
    profileSaveMsg.classList.remove('hidden');
    // Update header initials if name changed
    const initials = getInitials(result.display_name, null);
    headerAvatarInitials.textContent = initials;
    profileAvatarInitials.textContent = initials;
    setTimeout(() => profileSaveMsg.classList.add('hidden'), 3000);
  } else {
    profileSaveMsg.textContent = '❌ Save failed. Username may already be taken.';
    profileSaveMsg.style.color = '#FF6B6B';
    profileSaveMsg.classList.remove('hidden');
  }
});

// Avatar upload
avatarInput.addEventListener('change', async () => {
  if (!currentUserId || !avatarInput.files?.length) return;
  const file = avatarInput.files[0];
  if (file.size > 2 * 1024 * 1024) {
    profileSaveMsg.textContent = '❌ Image must be under 2MB.';
    profileSaveMsg.style.color = '#FF6B6B';
    profileSaveMsg.classList.remove('hidden');
    return;
  }
  (btnProfileSave as HTMLButtonElement).disabled = true;
  btnProfileSave.textContent = 'Uploading photo...';
  profileSaveMsg.classList.add('hidden');

  const url = await uploadAvatar(currentUserId, file);
  avatarInput.value = ''; // reset so same file can be re-selected

  (btnProfileSave as HTMLButtonElement).disabled = false;
  btnProfileSave.textContent = 'Save Profile';

  if (url) {
    setAvatarUI(url, getInitials(profileDisplayName.value || null, null));
    profileSaveMsg.textContent = '✅ Photo updated!';
    profileSaveMsg.style.color = '';
    profileSaveMsg.classList.remove('hidden');
    setTimeout(() => profileSaveMsg.classList.add('hidden'), 3000);
  } else {
    profileSaveMsg.textContent = '❌ Photo upload failed. Check browser console for details.';
    profileSaveMsg.style.color = '#FF6B6B';
    profileSaveMsg.classList.remove('hidden');
  }
});

// Sign out
btnSignout.addEventListener('click', async () => {
  await supabase.auth.signOut();
  profilePage.classList.add('hidden');
  currentUserId = null;
});

