// ===================================================================
// VMV8 — BRAND STRATEGY AGENT (BRANDY)
// Main entry point — wires services, store, and components together
// ===================================================================

import './style.css';

// Config
import { FRAMEWORK, type ChatMessage } from './config/framework';

// Store
import { state, saveSession, loadSession, clearSession, getFilledCount, getProgressStats, hasExistingData } from './store/brandscript.store';

// Services
import { callGroq } from './services/groq.service';
import { applyExtractions } from './services/extraction.service';
import { startRecording, stopRecording, processAudioFile, audioState } from './services/audio.service';

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

// ─── REFRESH ALL UI ─────────────────────────────────────────────────

function refreshUI(): void {
  renderNav(sectionNav, progressFill, progressPct, () => refreshUI(), startInterviewFlow);
  renderBrandscript(brandscriptContent);
}

// ─── INTERVIEW FLOW ─────────────────────────────────────────────────

function startInterviewFlow(startSectionIndex = 0): void {
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
    const response = await callGroq(text);

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

// Reset
btnReset.addEventListener('click', () => {
  if (confirm('Are you sure you want to reset? All progress will be lost.')) {
    clearSession();
    chatMessages.innerHTML = '';
    refreshUI();
    showWelcome();
  }
});

// ─── EXPORT B.I.G DOC ──────────────────────────────────────────────

btnExport.addEventListener('click', () => {
  let md = '# 🌋 Brand Identity Guiding Document (B.I.G Doc)\n';
  md += `## VMV8 — Voice Matrix V8 Brand Strategy Framework\n\n`;
  md += `*Generated on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}*\n`;
  md += `*Powered by Brandy — VMV8 Brand Strategy Agent*\n\n---\n\n`;

  FRAMEWORK.forEach(section => {
    md += `## ${section.icon} ${section.label.toUpperCase()}\n\n`;
    section.fields.forEach(field => {
      const value = state.brandscript[section.id][field.id];
      md += `### ${field.label}\n`;
      md += `> *${field.description}*\n\n`;
      md += value ? `${value}\n\n` : `*Not yet defined*\n\n`;
    });
    md += '---\n\n';
  });

  md += `\n## About This Document\nThis B.I.G Doc was generated using the VMV8 (Voice Matrix V8) framework by Volcanic Marketing.\n`;

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'BIG-Doc-Brand-Identity-Guide.md';
  a.click();
  URL.revokeObjectURL(url);
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
