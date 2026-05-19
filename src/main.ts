// ===================================================================
// VMV8 Ã¢â‚¬â€ BRAND STRATEGY AGENT (BRANDY)
// Main entry point Ã¢â‚¬â€ wires services, store, and components together
// ===================================================================

import './style.css';
import { inject } from '@vercel/analytics';

inject();

// Config
import { FRAMEWORK, type ChatMessage } from './config/framework';

// Store
import { state, saveSession, loadSession, clearSession, getFilledCount, getProgressStats, hasExistingData, scheduleSaveToSupabase, loadFromSupabase } from './store/brandscript.store';

// Services
import { callGroq } from './services/groq.service';
import { applyExtractions } from './services/extraction.service';
import { startRecording, stopRecording, processAudioFile, audioState, isAcceptedAudioFile } from './services/audio.service';
import { scrapeContextSources } from './services/scrape.service';
import { processCSVFile } from './services/csv.service';
import { supabase, getCurrentSession, setupAuthListener } from './services/supabase.service';
import { getProfile, upsertProfile, uploadAvatar, logActivity, getActivity, getActivityStats } from './services/profile.service';
import { generateMarketData, type GenerateMarketDataResult, type MarketData } from './services/market.service';
import type { FirecrawlMarketResult } from './services/firecrawl.service';
import { saveBrandscriptToSupabase } from './services/brandscript.service';
import { saveMarketResearch, saveDocumentExport } from './services/brandscript.service';
import { generateHtmlDoc } from './services/html-export.service';
import { generateBigDocPdf } from './services/pdf.service';
import html2pdf from 'html2pdf.js';
import * as pdfjsLib from 'pdfjs-dist';
import PdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { ContextPanel } from './store/brandscript.store';
pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorkerUrl;

// Components
import { renderMessage, showTyping, removeTyping } from './components/ChatPanel';
import { renderBrandscript } from './components/BrandscriptPanel';
import { renderNav } from './components/SidebarNav';
import { renderInterviewCard } from './components/InterviewCard';
import type { SectionId } from './config/framework';
import { renderScriptManager, setScriptManagerCallbacks } from './components/ScriptManager';
import { renderMarkPanel } from './components/MarkPanel';
import { renderMarketResearchDashboard } from './components/MarketResearchDashboard';
import { exportBigDoc } from './services/export.service';
import { createTranscript, syncTranscriptToSupabase, loadTranscriptsFromSupabase, getRecordingSessionCount, incrementRecordingSession, MAX_RECORDING_SESSIONS } from './services/transcription.service';

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ DOM REFERENCES Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const chatMessages = document.getElementById('chat-messages')!;
const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
const btnSend = document.getElementById('btn-send')!;
const btnReset = document.getElementById('btn-reset')!;
const btnDownloadPdf = document.getElementById('btn-download-pdf') as HTMLButtonElement;
const sectionNav = document.getElementById('section-nav')!;
const brandscriptContent = document.getElementById('brandscript-content')!;
const mainLayout = document.querySelector('.main-layout') as HTMLElement;
const chatArea = document.getElementById('chat-container') as HTMLElement;
const brandscriptPanel = document.getElementById('brandscript-panel') as HTMLElement;
const marketResearchDashboardContainer = document.getElementById('market-research-container') as HTMLDivElement;
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
const processingPct = document.getElementById('processing-pct')!;
const processingSteps = document.getElementById('processing-steps')!;

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
const navMarketResearch = document.getElementById('nav-market-research') as HTMLButtonElement;
const contextSummaryPanel = document.getElementById('context-summary-panel') as HTMLDivElement;
const contextSummaryOverview = document.getElementById('context-summary-overview') as HTMLDivElement;
const contextSummaryPanels = document.getElementById('context-summary-panels') as HTMLDivElement;
const marketResearchPanel = document.getElementById('market-research-panel') as HTMLDivElement;
const marketResearchContent = document.getElementById('market-research-content') as HTMLDivElement;

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

let rightPanelView: 'brandscript' | 'context' | 'market' = 'brandscript';

function setRightPanelView(view: 'brandscript' | 'context' | 'market'): void {
  rightPanelView = view;
  const hasContext = !!state.contextOverview && state.contextPanels.length > 0;

  contextSummaryPanel.classList.toggle('hidden', !(view === 'context' && hasContext));
  marketResearchPanel.classList.toggle('hidden', view !== 'market');
  brandscriptContent.classList.toggle('hidden', view !== 'brandscript');
  navContextSummary.classList.toggle('active', view === 'context' && hasContext);
  navMarketResearch.classList.toggle('active', view === 'market');
}

function syncWorkspaceView(): void {
  const dashboardActive = state.markViewVisible;

  mainLayout?.classList.toggle('dashboard-mode', dashboardActive);
  chatArea?.classList.toggle('hidden', dashboardActive);
  brandscriptPanel?.classList.toggle('hidden', dashboardActive);
  marketResearchDashboardContainer?.classList.toggle('hidden', !dashboardActive);

  if (dashboardActive) {
    setRightPanelView('brandscript');
    if (marketResearchDashboardContainer) {
      renderMarketResearchDashboard(marketResearchDashboardContainer);
    }
    return;
  }

  setRightPanelView(rightPanelView);
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ REFRESH ALL UI Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function refreshUI(): void {
  renderNav(sectionNav, progressFill, progressPct, () => refreshUI(), startInterviewFlow, () => syncWorkspaceView());
  renderBrandscript(brandscriptContent);
  renderMarketResearchPanel();
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ INTERVIEW FLOW Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
            quickActions: [`Continue to ${FRAMEWORK[nextIndex].label} Ã¢â€ â€™`, 'Take a break Ã¢â‚¬â€ I\'ll chat instead'],
          });
        } else {
          addSystemMessage({
            role: 'agent',
            content: `Ã°Å¸Å½â€° **All 8 sections complete!**\n\nYour B.I.G Doc is ready. Click **Ã°Å¸â€œÂ¥ PDF + Market Data** to download your complete strategy, or click Ã¢Å“Â¨ **Refine** on any section to have me polish the content with AI.`,
            quickActions: ['Ã°Å¸â€œÂ¥ Download PDF', 'Ã¢Å“Â¨ Refine with AI'],
          });
        }
      },
      // onAiRefine
      (sId, fieldId, rawAnswer) => {
        const refinementPrompt = fieldId === '*'
          ? `Here are my quick answers for the ${FRAMEWORK.find(s => s.id === sId)?.label} section. Please refine and expand these into polished, professional descriptions for the B.I.G Doc:\n\n${rawAnswer}`
          : `For ${fieldId}: ${rawAnswer}. Please refine this.`;
        handleUserInput(refinementPrompt);
      },
      // onPrevious
      () => {
        if (startSectionIndex > 0) {
          startInterviewFlow(startSectionIndex - 1);
        } else {
          // Abort the interview and return to home
          addSystemMessage({
            role: 'agent',
            content: `Interview paused. You can restart or continue discussing your brand here.`,
            quickActions: ['Interview me section by section', 'Start with Context Upload'],
          });
        }
      }
    );
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 300);
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ HANDLE USER INPUT Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

async function handleUserInput(text: string): Promise<void> {
  if (!text.trim()) return;

  // Handle quick action routing
  const lower = text.toLowerCase();
  if (lower.includes('interview me') || lower.includes('section by section') || lower.includes('guided interview')) {
    startInterviewFlow(0);
    return;
  }
  if (lower.startsWith('continue to ') && lower.includes('Ã¢â€ â€™')) {
    const sectionName = text.replace('Continue to ', '').replace(' Ã¢â€ â€™', '').trim();
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

  const isTranscription = text.includes('Ã°Å¸â€œÂ [Audio File') || text.includes('Ã°Å¸Å½â„¢Ã¯Â¸Â [Audio Recording') || text.includes('Ã°Å¸Å½â„¢Ã¯Â¸Â **');
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
    // JSON mode call Ã¢â‚¬â€ returns typed { message, extractions }
    const response = await callGroq(text, 2, state.contextPayload);

    removeTyping();

    // Apply extractions to brandscript state
    applyExtractions(response.extractions);

    const agentMsg = { role: 'agent' as const, content: response.message };
    state.messages.push(agentMsg);
    state.conversationHistory.push({ role: 'agent', content: response.message });
    renderMessage(chatMessages, agentMsg, handleUserInput);

  } catch (err) {
    removeTyping();
    console.error('AI API error:', err);
    const error = err as Error;
    let errContent = `⚠️ **AI Error**\n\n`;
    if (error.message?.includes('API_KEY') || error.message?.includes('Missing Gemini API key')) {
      errContent += `The API key is invalid or missing. Check your \`.env\` file.`;
    } else if (error.message?.includes('503') || error.message?.includes('UNAVAILABLE') || error.message?.includes('high demand')) {
      errContent += `The AI model is currently busy. Please try again in a moment.`;
    } else if (error.message?.includes('quota') || error.message?.includes('429') || error.message?.includes('rate_limit_exceeded')) {
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
  if (currentUserId) scheduleSaveToSupabase(currentUserId);
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ MESSAGE HELPER Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export function addSystemMessage(msg: ChatMessage): void {
  state.messages.push(msg);
  renderMessage(chatMessages, msg, handleUserInput);
}

function setContextLoading(loading: boolean, title = 'Collecting context...', subtitle = 'Scraping and preparing strategic overview.'): void {
  ctxLoading.classList.toggle('hidden', !loading);
  ctxLoadingTitle.textContent = title;
  ctxLoadingSubtitle.textContent = subtitle;
}

export function summarizeContext(text: string, limit = 260): string {
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

export function renderContextSummary(overview: string, panels: ContextPanel[]): void {
  // Premium overview card
  contextSummaryOverview.innerHTML = `
    <div class="ctx-summary-glass">
      <div class="ctx-summary-header">
        <div class="ctx-summary-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
        </div>
        <h3>Strategic Context</h3>
      </div>
      <div class="ctx-summary-text">${escapeHtml(overview)}</div>
    </div>
  `;

  // Premium panels
  contextSummaryPanels.innerHTML = panels.map((panel, idx) => {
    return `
      <details class="context-preview-panel" ${idx === 0 ? 'open' : ''}>
        <summary>
          <div class="ctx-panel-header">
            <span class="ctx-panel-title">${escapeHtml(panel.title)}</span>
            <span class="ctx-panel-subtitle">${escapeHtml(panel.subtitle)}</span>
          </div>
          <svg class="ctx-panel-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </summary>
        <div class="context-preview-body">
          <div class="ctx-body-content">${escapeHtml(panel.body)}</div>
        </div>
      </details>
    `;
  }).join('');
}

// Removed duplicate renderMarketResearchPanel and runMarketResearchOnly functions
// The newer versions below (starting at line 997) replace these

function clearCollectedContext(): void {
  state.contextPayload = '';
  state.contextOverview = '';
  state.contextPanels = [];
  renderContextSummary('', []);
}

function openContextSummaryPanel(): void {
  if (!state.contextOverview || state.contextPanels.length === 0) return;
  renderContextSummary(state.contextOverview, state.contextPanels);
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

  // Country, Industry, and Profession are ALWAYS compulsory
  const missing: string[] = [];
  if (!country) missing.push('Country');
  if (!industry) missing.push('Industry');
  if (!profession) missing.push('Profession');

  if (missing.length > 0) {
    addSystemMessage({
      role: 'agent',
      content: `Ã¢Å¡Â Ã¯Â¸Â Please select your **${missing.join(', ')}** Ã¢â‚¬â€ these are required for accurate market research in your B.I.G Doc.`,
    });
    return;
  }

  if (!websiteUrl && !linkedinUrl && !noWebsite) {
    addSystemMessage({
      role: 'agent',
      content: 'Add at least one source: **Website URL**, **LinkedIn URL**, or mark **No website available**.',
    });
    return;
  }

  // Save user context to state
  state.userContext = { country, industry, profession, services };
  state.contextPayload = '';
  state.contextOverview = '';
  state.contextPanels = [];

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
              subtitle: `${result.url} Ã‚Â· ${result.text.length.toLocaleString()} chars`,
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

    state.contextPayload = usableContext;
    const uniqueSources = Array.from(new Set(sourceLabels));
    const overview = `Generated overview from ${uniqueSources.length} source${uniqueSources.length === 1 ? '' : 's'} (${uniqueSources.join(', ')}), with about ${totalChars.toLocaleString()} characters of usable context. Click any panel to preview details. This context is now used as reference for future framework answers.`;
    state.contextOverview = overview;
    state.contextPanels = contextPanels.map(panel => ({
      ...panel,
      body: summarizeContext(panel.body, 1800),
    }));

    setContextLoading(false);
    renderContextSummary(state.contextOverview, state.contextPanels);
    openContextSummaryPanel();

    addSystemMessage({
      role: 'agent',
      content: 'Ã¢Å“â€¦ Context collected successfully. It is now saved as reference context for future framework answers and can be reviewed from **Context Summary** in the left navigation.',
    });
  } finally {
    setContextLoading(false);
    btnUseContext.disabled = false;
    btnUseContext.textContent = oldLabel;
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ AUTHENTICATION Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
  else showAuthError('Ã¢Å“â€¦ Account created! Check your email to confirm, then sign in.', true);
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
    // Load brandscript from Supabase and merge with local
    const loaded = await loadFromSupabase(session.user.id);
    if (loaded) {
      // Restore context dropdowns from Supabase data
      if (state.userContext.country && ctxCountry) ctxCountry.value = state.userContext.country;
      if (state.userContext.industry && ctxIndustry) ctxIndustry.value = state.userContext.industry;
      if (state.userContext.profession && ctxProfession) ctxProfession.value = state.userContext.profession;
      if (state.userContext.services && ctxServices) ctxServices.value = state.userContext.services;
      refreshUI();
    }
    // Load transcripts from Supabase and sync recording session count
    try {
      const supaTranscripts = await loadTranscriptsFromSupabase(session.user.id);
      if (supaTranscripts.length > 0) {
        // Merge: keep Supabase as source of truth, but don't duplicate
        const existingIds = new Set(state.transcripts.map(t => t.id));
        for (const t of supaTranscripts) {
          if (!existingIds.has(t.id)) {
            state.transcripts.push(t);
          }
        }
        // Sort newest first
        state.transcripts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        saveSession();
      }
      await getRecordingSessionCount(session.user.id);
    } catch (e) {
      console.warn('Failed to load transcripts from Supabase:', e);
    }
    // Log login event
    await logActivity(session.user.id, 'login', 'Signed in', session.user.email || '');
  } else {
    authOverlay.classList.remove('hidden');
    currentUserId = null;
  }
});

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ CONTEXT PAGE EDITING Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function updateCtxMeta() {
  const len = contextPageEdit.value.length;
  const sources = state.contextPanels.length;
  ctxCharCount.textContent = `${len.toLocaleString()} chars`;
  contextEditorMeta.innerHTML = sources > 0
    ? state.contextPanels.map(p =>
        `<span class="ctx-meta-pill">Ã°Å¸â€œâ€ž ${p.title} <small style="opacity:0.6">${p.subtitle}</small></span>`
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
  state.contextPayload = contextPageEdit.value.trim();
  const len = state.contextPayload.length;
  state.contextOverview = `Edited context summary Ã¢â‚¬â€ ${len.toLocaleString()} characters, ${state.contextPanels.length} source(s).`;
  renderContextSummary(state.contextOverview, state.contextPanels.length > 0 ? state.contextPanels : [{
    title: 'Edited Context',
    subtitle: 'Manually edited by user',
    body: summarizeContext(state.contextPayload, 1800)
  }]);
  contextPage.classList.add('hidden');
  addSystemMessage({ role: 'agent', content: `Ã¢Å“â€¦ Context saved Ã¢â‚¬â€ **${len.toLocaleString()} characters** of context will be used by Brandy.` });
});

btnContextCancel.addEventListener('click', () => {
  contextPage.classList.add('hidden');
});

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ EVENT LISTENERS Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
  contextPageEdit.value = state.contextPayload;
  updateCtxMeta();
  contextPage.classList.remove('hidden');
});

navMarketResearch.addEventListener('click', () => {
  state.markViewVisible = true;
  renderMarketResearchPanel();
});

// ─── MARK: MARKET RESEARCH PANEL ──────────────────────────────────────

let markResearchRunning = false;

async function runMarkResearch(): Promise<void> {
  if (markResearchRunning) return;
  markResearchRunning = true;

  const country = state.userContext.country || ctxCountry.value.trim() || 'South Africa';
  const industry = state.userContext.industry || ctxIndustry.value.trim() || '';
  const profession = state.userContext.profession || ctxProfession.value.trim() || '';
  const services = state.userContext.services || ctxServices.value.trim() || '';

  if (!country || !industry || !profession) {
    addSystemMessage({
      role: 'agent',
      content: '⚠️ Please select your **Country**, **Industry**, and **Profession** in the Context Sources panel before running market research.',
    });
    markResearchRunning = false;
    return;
  }

  state.markLoading = true;
  state.marketResearch.loading = true;
  state.marketResearch.error = null;
  state.markViewVisible = true;
  renderMarketResearchPanel();

  try {
    const result = await generateMarketData({
      brandContext: state.contextPayload,
      country,
      industry,
      profession,
      services,
      onProgress: (step, pct) => {
        // Update loading status in the Mark panel if it's visible
        const statusEl = document.getElementById('mark-loading-status');
        const barEl = document.getElementById('mark-loading-bar');
        if (statusEl) statusEl.textContent = step;
        if (barEl) barEl.style.width = `${pct}%`;
      },
    });

    state.marketData = result.marketData;
    state.firecrawlResults = result.firecrawlResults;
    state.markLoading = false;
    state.marketResearch.loading = false;
    state.marketResearch.error = null;
    state.marketResearch.data = result.marketData;
    state.marketResearch.sourcesCount = result.firecrawlResults.reduce((sum, r) => sum + r.sources.length, 0);
    state.marketResearch.lastUpdated = new Date().toISOString();
    state.marketResearch.firecrawlResults = result.firecrawlResults;
    saveSession();
    renderMarketResearchPanel();

    if (currentUserId) {
      await saveMarketResearch({
        user_id: currentUserId,
        country,
        industry,
        profession,
        firecrawl_results: result.firecrawlResults,
        market_data: result.marketData,
      });
      logActivity(currentUserId, 'prompt', 'Market research generated', `${country} · ${industry}`);
    }

  } catch (err) {
    state.markLoading = false;
    state.marketResearch.loading = false;
    state.marketResearch.error = (err as Error).message || 'Failed to generate market research data';
    console.error('Mark research error:', err);
    renderMarketResearchPanel();
  } finally {
    markResearchRunning = false;
  }
}

async function handleMarkFollowUp(question: string): Promise<void> {
  if (!state.marketData || !question.trim()) return;

  const chatContainer = document.getElementById('mark-chat-messages');
  if (!chatContainer) return;

  // Add user question
  const userDiv = document.createElement('div');
  userDiv.className = 'mark-chat-message mark-chat-user';
  userDiv.innerHTML = `<div class="mark-chat-bubble">${escapeHtml(question)}</div>`;
  chatContainer.appendChild(userDiv);

  // Build context from market data
  const marketContext = `
MARK MARKET RESEARCH CONTEXT:
- Industry: ${state.userContext.industry}
- Country: ${state.userContext.country}
- TAM: ${state.marketData.marketSizing?.tam?.value}
- SAM: ${state.marketData.marketSizing?.sam?.value}
- SOM: ${state.marketData.marketSizing?.som?.value}
- CAGR: ${state.marketData.marketSizing?.growth_cagr}
- Key competitors: ${state.marketData.competitivePositioning?.competitors?.map(c => c.archetype + ' (' + c.market_share + ')').join(', ')}

KEY FINDINGS:
${state.marketData.industryOverview?.narrative?.substring(0, 1000) || 'No industry overview available.'}

EXECUTIVE SUMMARY:
${state.marketData.executiveSummary}
`;

  try {
    // Use Groq for Mark follow-up questions
    const response = await callGroqMarkFollowUp(question, marketContext);

    const agentDiv = document.createElement('div');
    agentDiv.className = 'mark-chat-message mark-chat-agent';
    agentDiv.innerHTML = `<div class="mark-chat-bubble mark-chat-agent-bubble">
      <div class="mark-chat-sender">Mark — Market Analyst</div>
      ${formatMarkChatResponse(response)}
    </div>`;
    chatContainer.appendChild(agentDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  } catch (err) {
    const errDiv = document.createElement('div');
    errDiv.className = 'mark-chat-message mark-chat-agent';
    errDiv.innerHTML = `<div class="mark-chat-bubble"><em>Sorry, I couldn't process that question. The AI service may be temporarily unavailable.</em></div>`;
    chatContainer.appendChild(errDiv);
  }
}

async function callGroqMarkFollowUp(question: string, marketContext: string): Promise<string> {
  const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    throw new Error('Missing Groq API key');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are Mark — Volcanic Marketing's Market Research Agent. You have access to detailed market research data above. Answer the user's follow-up question using ONLY the market data provided. Be specific, cite data points, and maintain a professional consulting tone. Keep responses concise and actionable. Do not use markdown formatting.`
        },
        {
          role: 'user',
          content: marketContext + '\n\nQUESTION: ' + question
        }
      ],
      temperature: 0.2,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response available.';
}

function renderMarketResearchPanel(): void {
  syncWorkspaceView();

  if (state.markViewVisible) {
    return;
  }

  if (markResearchRunning) {
    // Show loading state handled by MarkPanel
  }

  const marketData = state.marketData;
  const firecrawlResults = state.firecrawlResults;
  const isLoading = state.markLoading;

  if (!marketData && !isLoading) {
    // Show empty state
    renderMarkPanelEmpty();
    return;
  }

  renderMarkPanelFull(marketData, firecrawlResults, isLoading);
}

function renderMarkPanelEmpty(): void {
  const container = document.getElementById('market-research-content');
  if (!container) return;

  container.innerHTML = `
    <div class="mark-empty">
      <div class="mark-empty-icon">📊</div>
      <h3>Market Intelligence</h3>
      <p>Run market research to generate a comprehensive analysis of your industry, competitors, and target market.</p>
      <p class="mark-empty-sub">Mark will search real web sources, analyze quantitative metrics, and build a complete market intelligence report.</p>
      <button class="btn-mark-run" id="btn-mark-run-start">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Run Market Research
      </button>
      <p class="mark-empty-note">Uses Firecrawl web search + Groq AI analysis</p>
    </div>
  `;

  document.getElementById('btn-mark-run-start')?.addEventListener('click', () => {
    renderMarketResearchPanel();
    runMarkResearch();
  });
}

function renderMarkPanelFull(
  marketData: MarketData | null,
  firecrawlResults: FirecrawlMarketResult[],
  isLoading: boolean
): void {
  const container = document.getElementById('market-research-content');
  if (!container) return;

  if (isLoading) {
    container.innerHTML = `
      <div class="mark-loading">
        <div class="mark-loading-spinner"></div>
        <h3>Mark is researching your market...</h3>
        <p>Searching web sources and collecting data.</p>
        <div class="mark-loading-progress"><div class="mark-loading-bar" id="mark-loading-bar"></div></div>
        <p class="mark-loading-status" id="mark-loading-status">Initializing search...</p>
      </div>
    `;
    return;
  }

  if (!marketData) {
    renderMarkPanelEmpty();
    return;
  }

  const totalSources = firecrawlResults.reduce((sum, r) => sum + r.sources.length, 0);
  const currency = getCurrencyForCountry(state.userContext.country || '');

  // Build key metrics
  const allMetrics = extractQuantitativeMetrics(marketData);
  const metricsHtml = allMetrics.length > 0
    ? allMetrics.map(m => `
        <div class="mark-metric-card">
          <div class="mark-metric-value">${escapeHtml(m.value)}</div>
          <div class="mark-metric-label">${escapeHtml(m.label)}</div>
        </div>
      `).join('')
    : '<p class="mark-no-metrics">No quantitative metrics extracted yet.</p>';

  // Build SWOT mini cards
  const swotHtml = buildSwotHtml(marketData);

  // Build competitor cards
  const competitorHtml = marketData.competitivePositioning?.competitors && marketData.competitivePositioning.competitors.length > 0
    ? marketData.competitivePositioning.competitors.map(c => `
        <div class="mark-competitor-card">
          <div class="mark-competitor-header">
            <span class="mark-competitor-archetype">${escapeHtml(c.archetype)}</span>
            <span class="mark-competitor-share">${c.market_share} share</span>
          </div>
          <div class="mark-competitor-details">
            <div class="mark-competitor-row"><span class="mark-competitor-label">Pricing:</span><span>${c.price_tier}</span></div>
            <div class="mark-competitor-row"><span class="mark-competitor-label">Strength:</span><span class="mark-competitor-positive">${escapeHtml(c.strength)}</span></div>
            <div class="mark-competitor-row"><span class="mark-competitor-label">Weakness:</span><span class="mark-competitor-negative">${escapeHtml(c.weakness)}</span></div>
          </div>
        </div>
      `).join('')
    : '<p class="mark-no-data">No competitor data available.</p>';

  // Build KPI rows
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

  // Build source quality rows
  const sourceQualityHtml = firecrawlResults.length > 0
    ? firecrawlResults.map(result => {
        const sources = result.sources || [];
        const ratedSources = sources.map(s => {
          const score = (s as any).qualityScore || 1;
          return { ...s, qualityScore: score };
        });
        const high = ratedSources.filter(s => s.qualityScore >= 3).length;
        const med = ratedSources.filter(s => s.qualityScore === 2).length;
        const low = ratedSources.filter(s => s.qualityScore <= 1).length;
        return { query: result.query, high, med, low, total: sources.length };
      }).map(q => `
        <div class="mark-quality-row">
          <span class="mark-quality-label">${escapeHtml(q.query.slice(0, 45))}...</span>
          <div class="mark-quality-bars">
            <span class="mark-quality-bar high" style="width:${Math.max(q.high * 4, 4)}px" title="${q.high} official"></span>
            <span class="mark-quality-bar medium" style="width:${Math.max(q.med * 4, 4)}px" title="${q.med} reputable"></span>
            <span class="mark-quality-bar low" style="width:${Math.max(q.low * 4, 4)}px" title="${q.low} general"></span>
          </div>
          <span class="mark-quality-count">${q.total}</span>
        </div>
      `).join('')
    : '';

  // Sources list
  const sourcesHtml = firecrawlResults.length > 0
    ? firecrawlResults.map(result =>
        (result.sources || []).map(s => {
          const qualityScore = (s as any).qualityScore || 1;
          const qualityTag = qualityScore >= 3 ? 'official' : qualityScore >= 2 ? 'reputable' : 'general';
          const metrics = (s as any).extractedMetrics || [];
          return `
            <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener" class="mark-source-item">
              <span class="mark-source-quality badge-${qualityTag}">${qualityTag}</span>
              <span class="mark-source-title">${escapeHtml(s.title)}</span>
              <span class="mark-source-url">${escapeHtml(s.url.slice(0, 70))}...</span>
              ${metrics.length > 0 ? `<span class="mark-source-metrics">${escapeHtml(metrics.slice(0, 3).join(', '))}</span>` : ''}
            </a>
          `;
        }).join('')
      ).join('')
    : '<p class="mark-no-data">No sources found.</p>';

  container.innerHTML = `
    <div class="mark-panel-inner">
      <!-- Mark Header -->
      <div class="mark-header">
        <div class="mark-header-info">
          <div class="mark-agent-badge">AGENT 02 — MARK</div>
          <h2>Market Intelligence Dashboard</h2>
          <p class="mark-subtitle">Quantitative analysis powered by Firecrawl + Groq AI</p>
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
          <span class="mark-status-number">${allMetrics.length}</span>
          <span class="mark-status-label">Metrics Extracted</span>
        </div>
        <div class="mark-status-item">
          <span class="mark-status-number">${marketData.competitivePositioning?.competitors?.length || 0}</span>
          <span class="mark-status-label">Competitors</span>
        </div>
        <div class="mark-status-item">
          <span class="mark-status-number">${marketData.kpiFramework?.length || 0}</span>
          <span class="mark-status-label">KPIs</span>
        </div>
      </div>

      <!-- Ticker Tape -->
      ${allMetrics.length > 0 ? `
      <div class="mark-ticker">
        <div class="mark-ticker-track">
          ${allMetrics.map(m => `
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
            <div class="mark-sizing-desc">${escapeHtml(marketData.marketSizing?.tam?.description || '')}</div>
          </div>
          <div class="mark-sizing-card">
            <div class="mark-sizing-label">SAM</div>
            <div class="mark-sizing-value">${marketData.marketSizing?.sam?.value || 'N/A'}</div>
            <div class="mark-sizing-desc">${escapeHtml(marketData.marketSizing?.sam?.description || '')}</div>
          </div>
          <div class="mark-sizing-card">
            <div class="mark-sizing-label">SOM</div>
            <div class="mark-sizing-value">${marketData.marketSizing?.som?.value || 'N/A'}</div>
            <div class="mark-sizing-desc">${escapeHtml(marketData.marketSizing?.som?.description || '')}</div>
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
            <h4>${escapeHtml(marketData.targetMarketSegmentation?.primary?.name || 'Primary')}</h4>
            <p class="mark-segment-desc">${escapeHtml(marketData.targetMarketSegmentation?.primary?.description || 'N/A')}</p>
            <div class="mark-segment-detail"><strong>Demographics:</strong> ${escapeHtml(marketData.targetMarketSegmentation?.primary?.demographics || 'N/A')}</div>
            <div class="mark-segment-detail"><strong>Psychographics:</strong> ${escapeHtml(marketData.targetMarketSegmentation?.primary?.psychographics || 'N/A')}</div>
          </div>
          <div class="mark-segment-card">
            <h4>${escapeHtml(marketData.targetMarketSegmentation?.secondary?.name || 'Secondary')}</h4>
            <p class="mark-segment-desc">${escapeHtml(marketData.targetMarketSegmentation?.secondary?.description || 'N/A')}</p>
            <div class="mark-segment-detail"><strong>Demographics:</strong> ${escapeHtml(marketData.targetMarketSegmentation?.secondary?.demographics || 'N/A')}</div>
            <div class="mark-segment-detail"><strong>Psychographics:</strong> ${escapeHtml(marketData.targetMarketSegmentation?.secondary?.psychographics || 'N/A')}</div>
          </div>
        </div>
      </div>

      <!-- Source Quality -->
      <div class="mark-section">
        <h3 class="mark-section-title">🔍 Source Quality</h3>
        <div class="mark-quality-container">
          ${sourceQualityHtml || '<p class="mark-no-data">No sources analyzed yet.</p>'}
        </div>
      </div>

      <!-- Sources List -->
      <div class="mark-section">
        <h3 class="mark-section-title">🔗 Data Sources (${totalSources})</h3>
        <div class="mark-sources-list">
          ${sourcesHtml}
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
                <span class="mark-rec-priority mark-priority-${(rec.priority || '').toLowerCase()}">${rec.priority}</span>
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
              <span class="mark-industry-metric-value">${escapeHtml(m.value)}</span>
              <span class="mark-industry-metric-label">${escapeHtml(m.label)}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Follow-up Chat -->
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

  // Wire events
  document.getElementById('btn-mark-refresh')?.addEventListener('click', () => {
    state.markLoading = false;
    runMarkResearch();
  });

  const sendBtn = document.getElementById('btn-mark-send');
  const chatInput = document.getElementById('mark-chat-input') as HTMLInputElement;

  const doSend = () => {
    if (chatInput.value.trim()) {
      handleMarkFollowUp(chatInput.value.trim());
      chatInput.value = '';
    }
  };

  sendBtn?.addEventListener('click', doSend);
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSend();
  });
}

// ─── HELPER: Extract quantitative metrics from MarketData ────────────

function extractQuantitativeMetrics(marketData: MarketData): Array<{ label: string; value: string }> {
  const metrics: Array<{ label: string; value: string }> = [];

  // From marketSizing
  const ms = marketData.marketSizing;
  if (ms?.tam?.value && ms.tam.value !== 'N/A') metrics.push({ label: 'Total Addressable Market', value: ms.tam.value });
  if (ms?.sam?.value && ms.sam.value !== 'N/A') metrics.push({ label: 'Serviceable Addressable Market', value: ms.sam.value });
  if (ms?.som?.value && ms.som.value !== 'N/A') metrics.push({ label: 'Serviceable Obtainable Market', value: ms.som.value });
  if (ms?.growth_cagr && ms.growth_cagr !== 'N/A') metrics.push({ label: 'Growth Rate (CAGR)', value: ms.growth_cagr });

  // From extractedMetrics
  if (marketData.extractedMetrics?.length) {
    metrics.push(...marketData.extractedMetrics.slice(0, 8));
  }

  // From industryOverview metrics
  if (marketData.industryOverview?.metrics?.length) {
    metrics.push(...marketData.industryOverview.metrics);
  }

  // From targetMarketSegmentation metrics
  if (marketData.targetMarketSegmentation?.metrics?.length) {
    metrics.push(...marketData.targetMarketSegmentation.metrics);
  }

  // From competitor market shares
  marketData.competitivePositioning?.competitors?.forEach(c => {
    if (c.market_share && c.market_share !== 'N/A') {
      metrics.push({ label: `${c.archetype} Market Share`, value: c.market_share });
    }
  });

  return metrics;
}

function buildSwotHtml(marketData: MarketData): string {
  const buildSection = (title: string, items: Array<{factor: string; impact: string}>, color: string) => `
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

  return `
    <div class="mark-swot-grid">
      ${buildSection('Strengths', marketData.swotAnalysis?.strengths || [], 'var(--accent-green)')}
      ${buildSection('Weaknesses', marketData.swotAnalysis?.weaknesses || [], 'var(--accent-orange)')}
      ${buildSection('Opportunities', marketData.swotAnalysis?.opportunities || [], 'var(--accent-amber)')}
      ${buildSection('Threats', marketData.swotAnalysis?.threats || [], 'var(--accent-red)')}
    </div>
  `;
}

// This function is now defined at line 341, removing duplicate

function formatMarkChatResponse(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^- (.*)/gm, '• $1');
}

function getCurrencyForCountry(country: string): string {
  const map: Record<string, string> = {
    'United States': 'USD', 'Australia': 'AUD', 'Canada': 'CAD',
    'France': 'EUR', 'Germany': 'EUR', 'Ghana': 'GHS', 'India': 'INR',
    'Indonesia': 'IDR', 'Ireland': 'EUR', 'Italy': 'EUR', 'Kenya': 'KES',
    'Malaysia': 'MYR', 'Netherlands': 'EUR', 'New Zealand': 'NZD',
    'Nigeria': 'NGN', 'Philippines': 'PHP', 'Portugal': 'EUR',
    'Saudi Arabia': 'SAR', 'Singapore': 'SGD', 'South Africa': 'ZAR',
    'Spain': 'EUR', 'Sweden': 'SEK', 'Switzerland': 'CHF',
    'United Arab Emirates': 'AED', 'United Kingdom': 'GBP', 'Zimbabwe': 'ZWL',
  };
  return map[country] || 'USD';
}

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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ PROCESSING OVERLAY HELPERS Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

let currentStepEl: HTMLElement | null = null;

function updateProgress(pct: number, subtitle?: string): void {
  const clamped = Math.min(100, Math.max(0, Math.round(pct)));
  processingPct.textContent = `${clamped}%`;
  processingProgressBar.style.width = `${clamped}%`;
  if (subtitle) processingSubtitle.textContent = subtitle;
}

function addProcessingStep(text: string, pct?: number): void {
  // Mark previous step as done
  if (currentStepEl) {
    currentStepEl.classList.remove('active');
    currentStepEl.classList.add('done');
    const icon = currentStepEl.querySelector('.processing-step-icon');
    if (icon) icon.textContent = 'Ã¢Å“â€œ';
  }
  // Create new active step
  const step = document.createElement('div');
  step.className = 'processing-step active';
  step.innerHTML = `
    <div class="processing-step-icon">Ã¢â€”Â</div>
    <div class="processing-step-text">${text}</div>
    ${pct !== undefined ? `<div class="processing-step-pct">${Math.round(pct)}%</div>` : ''}
  `;
  processingSteps.appendChild(step);
  processingSteps.scrollTop = processingSteps.scrollHeight;
  currentStepEl = step;
}

function completeAllSteps(): void {
  if (currentStepEl) {
    currentStepEl.classList.remove('active');
    currentStepEl.classList.add('done');
    const icon = currentStepEl.querySelector('.processing-step-icon');
    if (icon) icon.textContent = 'Ã¢Å“â€œ';
    currentStepEl = null;
  }
}

function resetProcessingOverlay(): void {
  processingSteps.innerHTML = '';
  currentStepEl = null;
  processingPct.textContent = '0%';
  processingProgressBar.style.width = '0%';
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ DOWNLOAD B.I.G DOC PDF Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

btnDownloadPdf.addEventListener('click', async () => {
  const stats = getProgressStats();
  if (stats.pct !== 100) {
    addSystemMessage({
      role: 'agent',
      content: `Ã¢Å¡Â Ã¯Â¸Â **Action Not Allowed**\n\nPlease complete all 8 framework sections before exporting the B.I.G. Doc. You are currently at ${stats.pct}% completion.`,
    });
    return;
  }

  // Get country/industry/profession from state or DOM fallback
  const country = state.userContext.country || ctxCountry.value.trim() || 'South Africa';
  const industry = state.userContext.industry || ctxIndustry.value.trim() || '';
  const profession = state.userContext.profession || ctxProfession.value.trim() || '';
  const services = state.userContext.services || ctxServices.value.trim() || '';

  if (!country || !industry || !profession) {
    addSystemMessage({
      role: 'agent',
      content: 'Ã¢Å¡Â Ã¯Â¸Â Please select your **Country**, **Industry**, and **Profession** in the Context Sources panel before generating your B.I.G Doc. This data is needed for accurate market research.',
    });
    return;
  }

  // Disable button and show generating state
  btnDownloadPdf.disabled = true;
  const originalLabel = btnDownloadPdf.innerHTML;
  btnDownloadPdf.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
    Researching market...`;

  // Reset and show processing overlay
  resetProcessingOverlay();
  processingTitle.textContent = 'Researching Your Market';
  processingSubtitle.textContent = `Preparing market research for ${industry} in ${country}...`;
  processingOverlay.classList.remove('hidden');
  updateProgress(2);
  addProcessingStep(`Initializing research for ${country}`, 2);

  try {
    // 1. Generate market data with Firecrawl search + AI synthesis
    addProcessingStep('Connecting to Firecrawl search engine...', 5);
    updateProgress(5);

    const result: GenerateMarketDataResult = await generateMarketData({
      brandContext: state.contextPayload,
      country,
      industry,
      profession,
      services,
      onProgress: (step, pct) => {
        const totalPct = Math.round(5 + pct * 0.6); // 5% Ã¢â€ â€™ 65%
        updateProgress(totalPct, step);
        addProcessingStep(step, totalPct);
      },
    });

    const { marketData, firecrawlResults } = result;
    state.marketData = marketData;
    state.firecrawlResults = firecrawlResults;
    saveSession();
    renderMarketResearchPanel();
    const sourceCount = firecrawlResults.reduce((sum, r) => sum + r.sources.length, 0);

    // Phase 2: Building the report
    processingTitle.textContent = 'Building Your Report';
    addProcessingStep(`${sourceCount} web sources collected — assembling B.I.G Doc...`, 70);
    updateProgress(70, 'Compiling PDF document with market intelligence...');

    await new Promise(r => setTimeout(r, 500));

    // 2. Generate PDF with live progress tracking
    const bName = state.brandscript.name?.purpose?.split('.')[0]?.trim() || 'Your Brand';
    const safe = bName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
    const fileName = `BIG-Doc-${safe}-${new Date().toISOString().slice(0, 10)}.pdf`;

    await generateBigDocPdf({
      brandscript: state.brandscript,
      contextPayload: state.contextPayload,
      marketData,
      brandName: bName,
      onProgress: (step, pct) => {
        // Map PDF progress (0-100) to overall progress (70-88)
        const totalPct = Math.round(70 + pct * 0.18);
        updateProgress(totalPct, step);
        addProcessingStep(step, totalPct);
      },
    });

    addProcessingStep('PDF downloaded successfully \u2714', 88);
    updateProgress(88);


    // 3. Save to Supabase (market research + document export)
    if (currentUserId) {
      addProcessingStep('Saving market research to database...', 90);
      updateProgress(90);

      // Save market research
      const mrResult = await saveMarketResearch({
        user_id: currentUserId,
        country,
        industry,
        profession,
        firecrawl_results: firecrawlResults,
        market_data: marketData,
      });

      addProcessingStep('Saving document snapshot...', 95);
      updateProgress(95);

      // Save document export snapshot
      await saveDocumentExport({
        user_id: currentUserId,
        market_research_id: mrResult?.id || undefined,
        brand_name: bName,
        brandscript_snapshot: state.brandscript,
        market_data_snapshot: marketData,
        context_snapshot: state.contextPayload,
        file_name: fileName,
      });
    }

    // Complete!
    processingTitle.textContent = 'Report Complete!';
    addProcessingStep(`B.I.G Doc generated with ${sourceCount} real sources`, 100);
    updateProgress(100, 'Your market-researched brand strategy document is ready.');
    completeAllSteps();

    const sourceMsg = sourceCount > 0
      ? ` Research was grounded in **${sourceCount} real web sources** specific to ${country}.`
      : '';

    addSystemMessage({
      role: 'agent',
      content: `🔥 **B.I.G Doc HTML report downloaded!** Your document includes your brand strategy framework and market intelligence for **${industry}** in **${country}**.${sourceMsg} Open it in any browser and print to PDF.`,
    });

    // Log activity
    if (currentUserId) {
      logActivity(currentUserId, 'pdf_upload', 'B.I.G Doc HTML exported', `${country} · ${industry} · ${sourceCount} sources`);
    }

  } catch (err) {
    console.error('PDF generation error:', err);
    completeAllSteps();
    addSystemMessage({
      role: 'agent',
      content: `⚠ **PDF Generation Failed**\n\n${(err as Error).message || 'Something went wrong. Please try again.'}`,
    });
  } finally {
    // Reset button and hide overlay after a short delay
    setTimeout(() => {
      processingOverlay.classList.add('hidden');
      resetProcessingOverlay();
    }, 1200);
    btnDownloadPdf.disabled = false;
    btnDownloadPdf.innerHTML = originalLabel;
  }
});

// ──────────────── TRANSCRIPTION MODAL ──────────────────────────────────────

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
  transcriptName.value = '';
  transcriptDesc.value = '';
  submitTranscription();
});
modalClose.addEventListener('click', () => {
  transcriptionModal.classList.add('hidden');
});

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
        (text) => {
          const transcript = createTranscript({
            name: `Recording ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} (5m limit)`,
            text,
            source: 'recording',
            durationSeconds: MAX_RECORDING_SECONDS,
          });
          if (currentUserId) {
            syncTranscriptToSupabase(currentUserId, transcript);
            incrementRecordingSession(currentUserId);
          }
          showTranscriptionModal(`[Audio Recording — 5 min limit reached]\n\n${text}`);
        },
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

btnMic.addEventListener('click', async () => {
  if (audioState.isRecording) {
    stopRecordingLimitBar();
    stopRecording(true, recordingElements, (text) => {
      const transcript = createTranscript({
        name: `Recording ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
        text,
        source: 'recording',
      });
      if (currentUserId) {
        syncTranscriptToSupabase(currentUserId, transcript);
        incrementRecordingSession(currentUserId);
      }
      showTranscriptionModal(`[Audio Recording]\n\n${text}`);
    }, addSystemMessage);
  } else {
    // Check 24-session limit
    if (state.recordingSessionCount >= MAX_RECORDING_SESSIONS) {
      addSystemMessage({
        role: 'agent',
        content: `You've reached the maximum of **${MAX_RECORDING_SESSIONS} recording sessions**. Please delete old recordings or upgrade your plan to record more.`,
      });
      return;
    }
    startRecording(recordingElements, addSystemMessage);
    startRecordingLimitBar();
  }
});

btnStopRecording.addEventListener('click', () => {
  stopRecordingLimitBar();
  stopRecording(true, recordingElements, (text) => {
    const transcript = createTranscript({
      name: `Recording ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
      text,
      source: 'recording',
    });
    if (currentUserId) {
      syncTranscriptToSupabase(currentUserId, transcript);
      incrementRecordingSession(currentUserId);
    }
    showTranscriptionModal(`[Audio Recording]\n\n${text}`);
  }, addSystemMessage);
});

btnCancelRecording.addEventListener('click', () => {
  stopRecordingLimitBar();
  stopRecording(false, recordingElements, handleUserInput, addSystemMessage);
  addSystemMessage({ role: 'agent', content: `Recording cancelled.` });
});

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ AUDIO & PDF: FILE UPLOAD Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

async function processFileSelection(file: File) {
  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    const MAX_PDF_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_PDF_SIZE) {
      addSystemMessage({ role: 'agent', content: `Ã¢ÂÅ’ The PDF file is too large! Maximum allowed size is 5MB.` });
      return;
    }
    if (currentUserId) logActivity(currentUserId, 'pdf_upload', `PDF: ${file.name}`, `${(file.size/1024).toFixed(0)} KB`, file.size);
    await processPdfFile(file);
  } else if (file.name.toLowerCase().endsWith('.md') || file.name.toLowerCase().endsWith('.markdown')) {
    if (currentUserId) logActivity(currentUserId, 'file_upload', `Markdown: ${file.name}`, `${(file.size/1024).toFixed(0)} KB`, file.size);
    await processMarkdownFile(file);
  } else if (file.name.toLowerCase().endsWith('.json') || file.type === 'application/json') {
    if (currentUserId) logActivity(currentUserId, 'file_upload', `JSON: ${file.name}`, `${(file.size/1024).toFixed(0)} KB`, file.size);
    await processJsonFile(file);
  } else if (isAcceptedAudioFile(file)) {
    if (currentUserId) logActivity(currentUserId, 'file_upload', `Audio: ${file.name}`, `${(file.size/1024).toFixed(0)} KB`, file.size);
    processAudioFile(file, processingOverlay, processingTitle, processingSubtitle, processingProgressBar,
      (text) => {
        // After transcription, save as a transcript script
        const transcript = createTranscript({
          name: file.name.replace(/\.[^.]+$/, ''),
          text: text.replace(/^📁 \[Audio File:.*\]\n\n/, ''),
          source: 'upload',
          fileName: file.name,
        });
        if (currentUserId) syncTranscriptToSupabase(currentUserId, transcript);
        showTranscriptionModal(text);
      },
      addSystemMessage
    );
  } else {
    addSystemMessage({ role: 'agent', content: `🚫 Unsupported file type. Please upload audio (mp3, flac, aac, aiff, wav), PDF, JSON, or Markdown.` });
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
        fullText += strings.join(" ") + "\n";
    }
    
    // Save as context
    state.contextPayload += "\n\n### IMPORTED PDF: " + file.name + "\n" + fullText;
    state.contextOverview = `Added imported PDF "${file.name}" to context.`;
    state.contextPanels.push({
      title: 'PDF Document',
      subtitle: file.name,
      body: summarizeContext(fullText, 1800)
    });
    
    // Refresh context summary UI
    renderContextSummary(state.contextOverview, state.contextPanels);
    
    addSystemMessage({ 
      role: 'agent', 
      content: `✅ Successfully extracted text from **${file.name}**. It's now added to your Context Summary!` 
    });
  } catch (error: any) {
    addSystemMessage({ role: 'agent', content: `🚫 Failed to extract PDF text: ${error.message}` });
  } finally {
    processingOverlay.classList.add('hidden');
  }
}

async function analyseImportedDocument(fileName: string, documentText: string, documentType: 'Markdown' | 'JSON'): Promise<void> {
  const trimmed = documentText.trim().slice(0, 6000);
  if (!trimmed) return;

  const prompt = `You are Brandy, the VMV8 Brand Strategy Agent.

The user has uploaded a ${documentType} document named "${fileName}".
Analyze it as strategic brand and market-research context.

What to do:
1. Summarize the most important business, audience, offer, positioning, competitor, and market signals.
2. Extract any confident B.I.G Doc fields you can infer from the document.
3. Highlight any concrete market-research clues, metrics, risks, opportunities, or customer segments.
4. Keep your response concise, polished, and actionable.

Document:
${trimmed}`;

  const response = await callGroq(prompt, 2, state.contextPayload);
  applyExtractions(response.extractions);

  if (response.message?.trim()) {
    state.contextPayload += `\n\n### BRANDY ANALYSIS: ${fileName}\n${response.message.trim()}`;
    state.contextPanels.push({
      title: 'Brandy Analysis',
      subtitle: fileName,
      body: summarizeContext(response.message, 1800),
    });
    renderContextSummary(state.contextOverview, state.contextPanels);
    addSystemMessage({
      role: 'agent',
      content: `📘 **Brandy analyzed ${fileName}.**\n\n${response.message}`,
    });
  }
}

async function processMarkdownFile(file: File) {
  processingTitle.textContent = "Processing Markdown";
  processingSubtitle.textContent = "Reading and analyzing content...";
  processingOverlay.classList.remove('hidden');
  try {
    const text = await file.text();

    state.contextPayload += `\n\n### IMPORTED MARKDOWN: ${file.name}\n${text}`;
    state.contextOverview = `Added imported Markdown "${file.name}" to context.`;
    state.contextPanels.push({
      title: 'Markdown Document',
      subtitle: file.name,
      body: summarizeContext(text, 1800)
    });

    renderContextSummary(state.contextOverview, state.contextPanels);

    await analyseImportedDocument(file.name, text, 'Markdown');

    addSystemMessage({
      role: 'agent',
      content: `Ã¢Å“â€¦ Successfully imported Markdown from **${file.name}**. It's now added to your Context Summary and queued for market-research analysis!`
    });
  } catch (error: any) {
    addSystemMessage({ role: 'agent', content: `Ã¢ÂÅ’ Failed to read Markdown file: ${error.message}` });
  } finally {
    processingOverlay.classList.add('hidden');
  }
}

async function processJsonFile(file: File) {
  processingTitle.textContent = "Processing JSON";
  processingSubtitle.textContent = "Parsing and analyzing structured data...";
  processingOverlay.classList.remove('hidden');
  try {
    const text = await file.text();
    const cleaned = text.replace(/```json\n?/gi, '').replace(/```/g, '').trim();
    const json = JSON.parse(cleaned);
    const prettyJson = JSON.stringify(json, null, 2);

    state.contextPayload += `\n\n### IMPORTED JSON: ${file.name}\n${prettyJson}`;
    state.contextOverview = `Added imported JSON "${file.name}" to context.`;
    state.contextPanels.push({
      title: 'JSON Document',
      subtitle: file.name,
      body: summarizeContext(prettyJson, 1800)
    });

    renderContextSummary(state.contextOverview, state.contextPanels);

    await analyseImportedDocument(file.name, prettyJson, 'JSON');

    addSystemMessage({
      role: 'agent',
      content: `Ã¢Å“â€¦ Successfully imported JSON from **${file.name}**. It's now added to your Context Summary and queued for market-research analysis!`
    });
  } catch (error: any) {
    addSystemMessage({ role: 'agent', content: `Ã¢ÂÅ’ Failed to parse JSON file: ${error.message}` });
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

// --- CSV: ANALYTICS UPLOAD ---

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
  if (files && files.length > 0) {
    processFileSelection(files[0]);
  }
});

// --- SCRIPTS PAGE ---

const scriptsPage = document.getElementById('scripts-page');
const btnScripts = document.getElementById('btn-scripts');
const btnScriptsClose = document.getElementById('btn-scripts-close');
const scriptsContainer = document.getElementById('scripts-list-container');

if (btnScripts) {
  btnScripts.addEventListener('click', () => {
    if (scriptsPage) {
      scriptsPage.classList.remove('hidden');
      setScriptManagerCallbacks(refreshUI, currentUserId);
      if (scriptsContainer) renderScriptManager(scriptsContainer);
    }
  });
}

if (btnScriptsClose) {
  btnScriptsClose.addEventListener('click', () => {
    if (scriptsPage) scriptsPage.classList.add('hidden');
  });
}

// --- WELCOME SCREEN ---

function showWelcome(): void {
  chatMessages.innerHTML = `
    <div class="welcome-card">
      <h1>Build Your B.I.G Doc</h1>
      <p>Let Brandy guide you through the VMV8 framework â€” 8 sections that define your brand's identity, voice, and strategy.</p>
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
      content: `Welcome! I'm **Brandy**, your VMV8 Brand Strategy Agent.\n\nI'll help you build your **B.I.G Doc** (Brand Identity Guiding Document) across **8 sections**.\n\nHow would you like to get started?`,
      quickActions: [
        'Guided Interview (recommended)',
        'Record a meeting',
        'Paste a transcript',
        'Free chat',
      ],
    });
  }, 500);
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ INITIALIZE Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
      <h1>Welcome Back! Ã°Å¸Å’â€¹</h1>
      <p>Your previous session has been restored. You have <strong>${filled}/${totalFields}</strong> fields completed in your B.I.G Doc.</p>
      <div class="welcome-sections">
        ${FRAMEWORK.map(s => `
          <div class="welcome-section-chip">
            <div class="welcome-chip-dot" style="background: ${s.color}"></div>
            ${s.icon} ${s.label} Ã¢â‚¬â€ ${getFilledCount(s.id)}/${s.fields.length}
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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ PROFILE PAGE Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
    const icon = ACTIVITY_ICONS[a.type] || 'Ã¢â€”â€ ';
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
  profileEmail.textContent = user?.email || 'Ã¢â‚¬â€';
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
    profileSaveMsg.textContent = 'Ã¢Å“â€¦ Profile saved!';
    profileSaveMsg.classList.remove('hidden');
    // Update header initials if name changed
    const initials = getInitials(result.display_name, null);
    headerAvatarInitials.textContent = initials;
    profileAvatarInitials.textContent = initials;
    setTimeout(() => profileSaveMsg.classList.add('hidden'), 3000);
  } else {
    profileSaveMsg.textContent = 'Ã¢ÂÅ’ Save failed. Username may already be taken.';
    profileSaveMsg.style.color = '#FF6B6B';
    profileSaveMsg.classList.remove('hidden');
  }
});

// Avatar upload
avatarInput.addEventListener('change', async () => {
  if (!currentUserId || !avatarInput.files?.length) return;
  const file = avatarInput.files[0];
  if (file.size > 2 * 1024 * 1024) {
    profileSaveMsg.textContent = 'Ã¢ÂÅ’ Image must be under 2MB.';
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
    profileSaveMsg.textContent = 'Ã¢Å“â€¦ Photo updated!';
    profileSaveMsg.style.color = '';
    profileSaveMsg.classList.remove('hidden');
    setTimeout(() => profileSaveMsg.classList.add('hidden'), 3000);
  } else {
    profileSaveMsg.textContent = 'Ã¢ÂÅ’ Photo upload failed. Check browser console for details.';
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

