// ===================================================================
// BRAND STRATEGY AGENT — Volcanic Marketing
// A local-first brand strategy extraction agent built on the
// Voice Matrix / VM Brand Strategy 8-section framework.
// Powered by Google Gemini AI
// ===================================================================

import './style.css';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ─── GEMINI SETUP ───────────────────────────────────────────────────
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  systemInstruction: {
    role: 'model',
    parts: [{ text: '' }],  // will be set via system prompt below
  },
});

// ─── FRAMEWORK DEFINITION ───────────────────────────────────────────
const FRAMEWORK = [
  {
    id: 'name',
    label: 'Name',
    color: '#FF6B35',
    icon: '✦',
    fields: [
      { id: 'purpose', label: 'Purpose', description: 'Where the visionary has identified a problem they have a conviction to fix. The solution exists in one of three forms: Physical, Emotional, or Spiritual. Purpose is married to the archetype\'s core desire.' },
      { id: 'origin_story_character', label: 'Origin Story — Character', description: 'What do they want? Defined through Conviction (Benevolence/Heartbreak) and Cause (Anger/The Fight).' },
      { id: 'origin_story_problem', label: 'Origin Story — Problem', description: 'External (tangible obstacle), Internal (emotional toll/frustration), Philosophical/Spiritual (why it\'s fundamentally wrong).' },
      { id: 'origin_story_guide', label: 'Origin Story — Guide', description: 'Empathy (understanding their fear) and Authority/Testimony (what they\'ve seen, heard, experienced).' },
      { id: 'tagline', label: 'Tagline', description: 'The "salt" — distilled to a max of 3 words. Must balance with the business name: Abstract Name → Clear Tagline, Clear Name → Abstract Tagline.' },
      { id: 'slogan', label: 'Slogan', description: 'A temporary, seasonal advertising hook for campaigns. Must align with brand character and tone.' },
    ],
  },
  {
    id: 'character',
    label: 'Character',
    color: '#E86FBF',
    icon: '♦',
    fields: [
      { id: 'values', label: 'Values', description: 'Core moral principles the business will never compromise on.' },
      { id: 'conviction', label: 'Conviction & Cause', description: 'The benevolence that drives them and the injustice making them angry.' },
      { id: 'charity', label: 'Charity', description: 'How the business expresses character through giving back or supporting aligned causes.' },
    ],
  },
  {
    id: 'intent',
    label: 'Intent',
    color: '#7C6BFF',
    icon: '◈',
    fields: [
      { id: 'vision', label: 'Vision', description: 'The desired end that does not currently exist. If achieved, the business\'s job is done.' },
      { id: 'mission', label: 'Mission', description: 'Need/Problem + Action (sent to carry out what) + Audience (sent to who).' },
      { id: 'message', label: 'Message', description: 'What awaits / is possible — a promise. What the recipient gets out of the mission.' },
    ],
  },
  {
    id: 'voice',
    label: 'Voice',
    color: '#4ECDC4',
    icon: '◉',
    fields: [
      { id: 'archetype', label: 'Archetype', description: 'One of Mark & Pearson\'s 12 brand archetypes (e.g., Hero, Creator, Explorer, Sage, etc.).' },
      { id: 'tone', label: 'Tone', description: 'Mapped from Plutchik\'s Emotion Wheel: Joy, Trust, Fear, Surprise, Sadness, Disgust, Anger — each with specific tones.' },
      { id: 'topics_of_authority', label: 'Topics of Authority', description: 'The subjects and domains the brand is qualified to speak about.' },
    ],
  },
  {
    id: 'creation',
    label: 'Creation',
    color: '#F7C948',
    icon: '★',
    fields: [
      { id: 'product', label: 'Product', description: 'The tangible thing(s) the business creates or sells.' },
      { id: 'service', label: 'Service', description: 'The intangible service(s) the business provides.' },
      { id: 'superpower', label: 'Superpower', description: 'The unique differentiator — what makes this brand\'s creation extraordinary.' },
    ],
  },
  {
    id: 'operation',
    label: 'Operation',
    color: '#45B7D1',
    icon: '⚡',
    fields: [
      { id: 'tools', label: 'Tools', description: 'The specific tools and technologies used in operations.' },
      { id: 'processes', label: 'Processes', description: 'The workflows and methodologies the business follows.' },
      { id: 'systems', label: 'Systems', description: 'The integrated systems and platforms that power the business.' },
      { id: 'logistics', label: 'Logistics', description: 'Delivery, fulfilment, and operational logistics.' },
    ],
  },
  {
    id: 'image',
    label: 'Image',
    color: '#FF8C61',
    icon: '◐',
    fields: [
      { id: 'logo', label: 'Logo', description: 'Description or concept of the brand\'s visual mark.' },
      { id: 'fonts', label: 'Fonts', description: 'Typography choices and their rationale.' },
      { id: 'colour_palette', label: 'Colour Palette', description: 'Primary, secondary, and accent colours with emotional reasoning.' },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    color: '#98D4A6',
    icon: '▣',
    fields: [
      { id: 'policies', label: 'Policies', description: 'Key business policies.' },
      { id: 'procedures', label: 'Procedures', description: 'Standard operating procedures.' },
      { id: 'legal', label: 'Legal', description: 'Legal structure, trademarks, IP.' },
      { id: 'finance', label: 'Finance', description: 'Revenue model, pricing strategy, financial structure.' },
    ],
  },
];

// ─── AGENT SYSTEM PROMPT ────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the Volcanic Brand Strategy Agent. Your job is to help business owners build their complete brand strategy by extracting information from meeting transcripts, conversations, or by interviewing them directly.

You work within an 8-section framework: NAME, CHARACTER, INTENT, VOICE, CREATION, OPERATION, IMAGE, ADMINISTRATION.

## How You Work:
1. When the user pastes a transcript or describes their brand, you analyze it and extract relevant information for each section.
2. When information is missing, you ask targeted, insightful questions to fill in the gaps.
3. You always maintain context of what has been filled and what is still needed.

## The 8 Sections and What to Extract:

### NAME
- **Purpose:** Where the visionary identified a problem they have a conviction to fix. The solution exists in one of three forms: Physical, Emotional, or Spiritual. Purpose is married to the archetype's core desire.
- **Origin Story — Character:** What do they want? Defined through: Conviction (Benevolence/Heartbreak — what they must do to feel fulfilled) and Cause (Anger/The Fight — what injustice they can't stand).
- **Origin Story — Problem:** External (tangible obstacle), Internal (emotional toll), Philosophical/Spiritual (why it's fundamentally wrong).
- **Origin Story — Guide:** Empathy (understanding their fear) and Authority/Testimony (what they've seen, heard, experienced that qualifies them).
- **Tagline:** The "salt" — distilled to max 3 words. Rule: Abstract Name needs Clear Tagline, Clear Name allows Abstract Tagline. Only massive brands can have both abstract.
- **Slogan:** Temporary, seasonal advertising hook for campaigns. Must align with brand character and tone.

### CHARACTER
- **Values:** Core moral principles the business will never compromise on.
- **Conviction & Cause:** The benevolence driving them, and the injustice making them angry.
- **Charity:** How the business gives back or supports aligned causes.
The Character section acts as the ultimate filter for business decisions — it keeps the business pure and prevents corruption.

### INTENT
- **Vision:** The desired end that does NOT currently exist. If achieved, the business's job is done.
- **Mission:** Need/Problem + Action (what you're sent to carry out) + Audience (who you're sent to).
- **Message:** What awaits / is possible — a promise. What the recipient gets out of the mission.

### VOICE
- **Archetype:** One of Mark & Pearson's 12 brand archetypes.
- **Tone:** Mapped from Plutchik's Emotion Wheel (Joy, Trust, Fear, Surprise, Sadness, Disgust, Anger), each with specific brand tones.
- **Topics of Authority:** Subjects and domains the brand is qualified to speak about.

### CREATION
- **Product:** Tangible things the business creates or sells.
- **Service:** Intangible services provided.
- **Superpower:** The unique differentiator.

### OPERATION
- **Tools, Processes, Systems, Logistics:** How the business operates day-to-day.

### IMAGE
- **Logo, Fonts, Colour Palette:** Visual identity with emotional reasoning.

### ADMINISTRATION
- **Policies, Procedures, Legal, Finance:** Business infrastructure.

## Your Communication Style:
- Be warm, insightful, and professional.
- Ask one section at a time — don't overwhelm.
- When you extract something, confirm it with the user.
- Use the StoryBrand principle: the customer is the hero, the brand is the guide.
- Reference the specific frameworks (Plutchik's Emotion Wheel, Mark & Pearson's 12 Archetypes) when relevant.

## Output Format:
When you extract information, clearly label it with the section and field name so it can be mapped to the BrandScript Card. Use this format:
[EXTRACT: section.field] The extracted value here.

For example:
[EXTRACT: name.purpose] To create ethical gaming experiences that protect children from predatory gambling mechanics.
[EXTRACT: intent.vision] To legislate against unethical gambling targeted at children.`;

// ─── STATE ──────────────────────────────────────────────────────────
const state = {
  activeSection: 0,
  messages: [],
  brandscript: {},
  manualSectionCompletion: {},
  conversationHistory: [],
};

// Initialize empty brandscript
FRAMEWORK.forEach(section => {
  state.brandscript[section.id] = {};
  section.fields.forEach(field => {
    state.brandscript[section.id][field.id] = '';
  });
});

// ─── DOM REFERENCES ─────────────────────────────────────────────────
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const btnSend = document.getElementById('btn-send');
const btnReset = document.getElementById('btn-reset');
const btnExport = document.getElementById('btn-export');
const sectionNav = document.getElementById('section-nav');
const brandscriptContent = document.getElementById('brandscript-content');
const progressFill = document.getElementById('progress-fill');
const progressPct = document.getElementById('progress-pct');

// ─── RENDER: SIDEBAR NAV ───────────────────────────────────────────
function renderNav() {
  sectionNav.innerHTML = FRAMEWORK.map((section, i) => {
    const isCompleted = isSectionCompleted(section.id);
    return `
    <div class="nav-item ${i === state.activeSection ? 'active' : ''} ${isCompleted ? 'completed' : ''}"
         data-index="${i}" style="color: ${section.color}">
      <div class="nav-dot"></div>
      <span class="nav-label">${section.icon} ${section.label}</span>
      <div class="nav-right">
        <span class="nav-badge">${getFilledCount(section.id)}/${section.fields.length}</span>
        <button class="nav-check-btn ${state.manualSectionCompletion[section.id] ? 'checked' : ''}" data-section="${section.id}" title="Mark section as manually complete">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </button>
      </div>
    </div>
  `}).join('');

  sectionNav.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // Ignore click if clicking the checkmark button directly
      if (e.target.closest('.nav-check-btn')) return;
      state.activeSection = parseInt(item.dataset.index);
      renderNav();
    });
  });

  sectionNav.querySelectorAll('.nav-check-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sectionId = btn.dataset.section;
      state.manualSectionCompletion[sectionId] = !state.manualSectionCompletion[sectionId];
      renderNav();
      updateProgress();
    });
  });
}

function isSectionCompleted(sectionId) {
  if (state.manualSectionCompletion[sectionId]) return true;
  const section = FRAMEWORK.find(s => s.id === sectionId);
  return section.fields.every(f => state.brandscript[sectionId][f.id]);
}

function getFilledCount(sectionId) {
  const section = FRAMEWORK.find(s => s.id === sectionId);
  return section.fields.filter(f => state.brandscript[sectionId][f.id]).length;
}

// ─── RENDER: BRANDSCRIPT PANEL ──────────────────────────────────────
function renderBrandscript() {
  brandscriptContent.innerHTML = FRAMEWORK.map(section => `
    <div class="bs-section open" data-section="${section.id}">
      <div class="bs-section-header" data-toggle="${section.id}">
        <div class="bs-section-dot" style="background: ${section.color}"></div>
        <span class="bs-section-title">${section.icon} ${section.label}</span>
        <span class="bs-section-chevron">▾</span>
      </div>
      <div class="bs-section-body">
        ${section.fields.map(field => {
          const value = state.brandscript[section.id][field.id];
          return `
            <div class="bs-field">
              <div class="bs-field-label">
                ${field.label}
                <div class="bs-field-question">${formatMessage(getFieldQuestion(section.id, field.id))}</div>
              </div>
              <div class="bs-field-value ${value ? 'filled' : 'empty'}">
                ${value || 'Awaiting extraction...'}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');

  // Toggle sections
  brandscriptContent.querySelectorAll('.bs-section-header').forEach(header => {
    header.addEventListener('click', () => {
      header.closest('.bs-section').classList.toggle('open');
    });
  });
}

// ─── RENDER: PROGRESS ───────────────────────────────────────────────
function updateProgress() {
  let total = 0, filled = 0;
  FRAMEWORK.forEach(section => {
    if (state.manualSectionCompletion[section.id]) {
      // If manually marked complete, count all fields internally as filled for progress bar
      total += section.fields.length;
      filled += section.fields.length;
    } else {
      section.fields.forEach(field => {
        total++;
        if (state.brandscript[section.id][field.id]) filled++;
      });
    }
  });
  const pct = Math.round((filled / total) * 100);
  progressFill.style.width = `${pct}%`;
  progressPct.textContent = `${pct}%`;
}

// ─── RENDER: MESSAGES ───────────────────────────────────────────────
function renderMessage(msg) {
  const div = document.createElement('div');
  div.className = `message ${msg.role}`;

  let bubbleContent = '';
  if (msg.role === 'agent') {
    bubbleContent = `<div class="message-sender">Brand Strategy Agent</div>`;
  } else {
    bubbleContent = `<div class="message-sender">You</div>`;
  }
  bubbleContent += `<div>${formatMessage(msg.content)}</div>`;
  
  if (msg.quickActions && msg.quickActions.length) {
    bubbleContent += `<div class="quick-actions">`;
    msg.quickActions.forEach(action => {
      bubbleContent += `<button class="quick-action-btn" data-action="${action}">${action}</button>`;
    });
    bubbleContent += `</div>`;
  }

  div.innerHTML = `<div class="message-bubble">${bubbleContent}</div>`;
  chatMessages.appendChild(div);

  // Quick action handlers
  div.querySelectorAll('.quick-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      handleUserInput(btn.dataset.action);
    });
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatMessage(text) {
  // Convert markdown-like formatting
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
    .replace(/^- (.*)/gm, '• $1');
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'message agent';
  div.id = 'typing-indicator';
  div.innerHTML = `
    <div class="message-bubble">
      <div class="message-sender">Brand Strategy Agent</div>
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

// ─── GEMINI API CALL ────────────────────────────────────────────────
const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function callGemini(userText, retries = 2) {
  // Build current brandscript status to inject as context
  const bsStatus = FRAMEWORK.map(section => {
    const fields = section.fields.map(field => {
      const val = state.brandscript[section.id][field.id];
      return `  ${field.label}: ${val ? `"${val}"` : 'NOT YET FILLED'}`;
    }).join('\n');
    return `### ${section.label}\n${fields}`;
  }).join('\n\n');

  const contextInjection = `\n\n---\n## CURRENT BRANDSCRIPT STATUS (use this to know what's filled and what needs extracting):\n${bsStatus}\n---\n`;

  // systemInstruction MUST be on the model, not startChat — rebuild model per call
  const chatModel = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_PROMPT + contextInjection,
  });

  // Build prior history (exclude the current message — passed via sendMessage)
  const history = state.conversationHistory.map(m => ({
    role: m.role === 'agent' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const chat = chatModel.startChat({ history });

  try {
    const result = await chat.sendMessage(userText);
    return result.response.text();
  } catch (err) {
    if (retries > 0 && err.message && (err.message.includes('quota') || err.message.includes('429'))) {
      console.warn(`Rate limit hit. Retrying... (${retries} attempts left)`);
      await delay(2500); // Wait 2.5 seconds before retrying
      return callGemini(userText, retries - 1);
    }
    throw err;
  }
}


function parseExtractions(responseText) {
  // Parse [EXTRACT: section.field] tags from agent response
  const regex = /\[EXTRACT:\s*([\w]+)\.([\w]+)\]\s*([^\[]+)/g;
  const extractions = [];
  let match;
  while ((match = regex.exec(responseText)) !== null) {
    const [, section, field, value] = match;
    if (state.brandscript[section] !== undefined && state.brandscript[section][field] !== undefined) {
      extractions.push({ section, field, value: value.trim() });
    }
  }
  return extractions;
}

// ─── HANDLE USER INPUT ──────────────────────────────────────────────
async function handleUserInput(text) {
  if (!text.trim()) return;

  // Add user message
  const userMsg = { role: 'user', content: text };
  state.messages.push(userMsg);
  state.conversationHistory.push(userMsg);
  renderMessage(userMsg);

  // Clear input
  chatInput.value = '';
  chatInput.style.height = 'auto';

  // Show typing
  showTyping();

  try {
    const responseText = await callGemini(text);

    removeTyping();

    // Parse [EXTRACT: ...] tags and update brandscript
    const extractions = parseExtractions(responseText);
    extractions.forEach(ext => {
      state.brandscript[ext.section][ext.field] = ext.value;
    });

    // Clean up response to remove raw extract tags from display
    const cleanResponse = responseText
      .replace(/\[EXTRACT:\s*[\w]+\.[\w]+\]\s*/g, '')
      .trim();

    const agentMsg = { role: 'agent', content: cleanResponse };
    state.messages.push(agentMsg);
    state.conversationHistory.push({ role: 'agent', content: cleanResponse });
    renderMessage(agentMsg);

  } catch (err) {
    removeTyping();
    console.error('Gemini API error:', err);

    let errContent = `⚠️ **AI Error**\n\n`;
    if (err.message && err.message.includes('API_KEY')) {
      errContent += `The API key is invalid or missing. Please check your \`.env\` file.`;
    } else if (err.message && err.message.includes('quota')) {
      errContent += `You've hit the API rate limit. Please wait a moment and try again.`;
    } else {
      errContent += `Something went wrong: ${err.message}\n\nPlease try again.`;
    }

    const errorMsg = { role: 'agent', content: errContent };
    state.messages.push(errorMsg);
    renderMessage(errorMsg);
  }

  // Update UI
  renderNav();
  renderBrandscript();
  updateProgress();
}

// Stub to keep wiring intact (audio uses this)
function analyzeInput(text) {
  const extractions = [];
  const lower = text.toLowerCase();

  // === NAME SECTION ===
  // Purpose detection
  if (lower.includes('conviction') || lower.includes('purpose') || lower.includes('problem') && (lower.includes('fix') || lower.includes('solve'))) {
    const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 15);
    const purposeSentence = sentences.find(s => {
      const sl = s.toLowerCase();
      return sl.includes('purpose') || sl.includes('conviction') || sl.includes('fix') || sl.includes('solve') || sl.includes('believe');
    });
    if (purposeSentence) {
      extractions.push({ section: 'name', field: 'purpose', value: purposeSentence.trim() });
    }
  }

  // Origin Story - Character (Conviction / Cause)
  if (lower.includes('heartbreak') || lower.includes('breaks my heart') || lower.includes('benevolence') || lower.includes('must do') || lower.includes('feel fulfilled')) {
    const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 10);
    const match = sentences.find(s => {
      const sl = s.toLowerCase();
      return sl.includes('heart') || sl.includes('benevolence') || sl.includes('must') || sl.includes('fulfilled');
    });
    if (match) extractions.push({ section: 'name', field: 'origin_story_character', value: match.trim() });
  }

  if (lower.includes('angry') || lower.includes('injustice') || lower.includes('fight') || lower.includes('can\'t stand') || lower.includes('wrong')) {
    const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 10);
    const match = sentences.find(s => {
      const sl = s.toLowerCase();
      return sl.includes('angry') || sl.includes('injustice') || sl.includes('fight') || sl.includes('wrong') || sl.includes('stand');
    });
    if (match) {
      if (!extractions.find(e => e.field === 'origin_story_character')) {
        extractions.push({ section: 'name', field: 'origin_story_character', value: match.trim() });
      } else {
        // Append to existing
        const existing = extractions.find(e => e.field === 'origin_story_character');
        existing.value += ' | Cause: ' + match.trim();
      }
    }
  }

  // Origin Story - Problem
  if ((lower.includes('external') && lower.includes('problem')) || (lower.includes('internal') && lower.includes('problem')) || lower.includes('philosophical') || lower.includes('spiritual')) {
    const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 10);
    const problemParts = [];
    sentences.forEach(s => {
      const sl = s.toLowerCase();
      if (sl.includes('external')) problemParts.push('External: ' + s.trim());
      if (sl.includes('internal') || sl.includes('frustrat') || sl.includes('fear')) problemParts.push('Internal: ' + s.trim());
      if (sl.includes('philosophical') || sl.includes('spiritual') || sl.includes('wrong')) problemParts.push('Philosophical: ' + s.trim());
    });
    if (problemParts.length) {
      extractions.push({ section: 'name', field: 'origin_story_problem', value: problemParts.join('\n') });
    }
  }

  // Tagline
  if (lower.includes('tagline')) {
    const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 3);
    const match = sentences.find(s => s.toLowerCase().includes('tagline'));
    if (match) {
      const taglineMatch = match.match(/tagline[:\s]*["""]?([^"""]+)/i);
      if (taglineMatch) {
        extractions.push({ section: 'name', field: 'tagline', value: taglineMatch[1].trim() });
      }
    }
  }

  // === CHARACTER SECTION ===
  if (lower.includes('values') || lower.includes('never compromise') || lower.includes('principles')) {
    const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 10);
    const match = sentences.find(s => {
      const sl = s.toLowerCase();
      return sl.includes('value') || sl.includes('compromise') || sl.includes('principle') || sl.includes('believe');
    });
    if (match) extractions.push({ section: 'character', field: 'values', value: match.trim() });
  }

  // === INTENT SECTION ===
  // Vision
  if (lower.includes('vision') || lower.includes('world where') || lower.includes('dream') || lower.includes('ultimate goal') || lower.includes('end goal')) {
    const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 10);
    const match = sentences.find(s => {
      const sl = s.toLowerCase();
      return sl.includes('vision') || sl.includes('world where') || sl.includes('dream') || sl.includes('ultimate') || sl.includes('end goal');
    });
    if (match) extractions.push({ section: 'intent', field: 'vision', value: match.trim() });
  }

  // Mission
  if (lower.includes('mission') || (lower.includes('we') && (lower.includes('help') || lower.includes('provide') || lower.includes('serve')) && lower.includes('to'))) {
    const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 10);
    const match = sentences.find(s => {
      const sl = s.toLowerCase();
      return sl.includes('mission') || (sl.includes('help') && sl.includes('to'));
    });
    if (match) extractions.push({ section: 'intent', field: 'mission', value: match.trim() });
  }

  // Message
  if (lower.includes('message') || lower.includes('promise') || lower.includes('what you get') || lower.includes('awaits')) {
    const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 10);
    const match = sentences.find(s => {
      const sl = s.toLowerCase();
      return sl.includes('message') || sl.includes('promise') || sl.includes('awaits') || sl.includes('get out of');
    });
    if (match) extractions.push({ section: 'intent', field: 'message', value: match.trim() });
  }

  // === VOICE SECTION ===
  const archetypes = ['hero', 'creator', 'explorer', 'sage', 'outlaw', 'magician', 'lover', 'jester', 'everyman', 'caregiver', 'ruler', 'innocent'];
  archetypes.forEach(arch => {
    if (lower.includes(arch) && (lower.includes('archetype') || lower.includes('brand personality') || lower.includes('we are the'))) {
      extractions.push({ section: 'voice', field: 'archetype', value: arch.charAt(0).toUpperCase() + arch.slice(1) });
    }
  });

  // Tone
  const emotionTones = {
    joy: ['bubbly', 'cheerful', 'playful', 'witty', 'optimistic', 'uplifting', 'fun', 'humorous'],
    trust: ['authentic', 'credible', 'warm', 'professional', 'transparent', 'reliable', 'approachable'],
    fear: ['urgent', 'cautious', 'protective', 'intense', 'vigilant'],
    surprise: ['innovative', 'quirky', 'audacious', 'whimsical', 'unconventional', 'dynamic'],
    sadness: ['empathetic', 'nostalgic', 'heartfelt', 'reflective', 'tender'],
    disgust: ['irreverent', 'blunt', 'cynical', 'critical'],
    anger: ['bold', 'assertive', 'defiant', 'rebellious', 'tenacious', 'fierce'],
  };
  const detectedTones = [];
  Object.entries(emotionTones).forEach(([emotion, tones]) => {
    tones.forEach(tone => {
      if (lower.includes(tone)) detectedTones.push(`${tone} (${emotion})`);
    });
  });
  if (detectedTones.length) {
    extractions.push({ section: 'voice', field: 'tone', value: detectedTones.join(', ') });
  }

  // === CREATION SECTION ===
  if (lower.includes('product') || lower.includes('we sell') || lower.includes('we make') || lower.includes('we create')) {
    const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 10);
    const match = sentences.find(s => {
      const sl = s.toLowerCase();
      return sl.includes('product') || sl.includes('sell') || sl.includes('make') || sl.includes('create');
    });
    if (match) extractions.push({ section: 'creation', field: 'product', value: match.trim() });
  }

  if (lower.includes('service') || lower.includes('we offer') || lower.includes('we provide')) {
    const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 10);
    const match = sentences.find(s => {
      const sl = s.toLowerCase();
      return sl.includes('service') || sl.includes('offer') || sl.includes('provide');
    });
    if (match) extractions.push({ section: 'creation', field: 'service', value: match.trim() });
  }

  if (lower.includes('superpower') || lower.includes('unique') || lower.includes('differentiator') || lower.includes('what sets us apart')) {
    const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 10);
    const match = sentences.find(s => {
      const sl = s.toLowerCase();
      return sl.includes('superpower') || sl.includes('unique') || sl.includes('different') || sl.includes('sets us apart');
    });
    if (match) extractions.push({ section: 'creation', field: 'superpower', value: match.trim() });
  }

  return extractions;
}

function getNextQuestion() {
  // Find the first unfilled field and ask about it
  for (const section of FRAMEWORK) {
    if (state.manualSectionCompletion[section.id]) continue; // Skip manually marked sections

    for (const field of section.fields) {
      if (!state.brandscript[section.id][field.id]) {
        return {
          sectionId: section.id,
          sectionLabel: section.label,
          field: field,
          color: section.color,
        };
      }
    }
  }
  return null; // All filled!
}

function generateAgentResponse(userText, extractions) {
  let response = '';

  if (extractions.length > 0) {
    response += `Great! I extracted the following from your input:\n\n`;
    extractions.forEach(ext => {
      const section = FRAMEWORK.find(s => s.id === ext.section);
      const field = section.fields.find(f => f.id === ext.field);
      response += `**${section.label} → ${field.label}:**\n${ext.value}\n\n`;
      
      // Update state
      state.brandscript[ext.section][ext.field] = ext.value;
    });
  }

  // Check for the next empty field
  const next = getNextQuestion();
  if (next) {
    if (extractions.length === 0) {
      // If no extractions, the input might be a direct answer to the current question
      // Store it as the current active field's value
      const currentSection = FRAMEWORK[state.activeSection];
      for (const field of currentSection.fields) {
        if (!state.brandscript[currentSection.id][field.id] && userText.length > 5) {
          state.brandscript[currentSection.id][field.id] = userText;
          response += `**${currentSection.label} → ${field.label}:** Captured!\n\n`;
          break;
        }
      }
    }

    // Re-check after potential capture
    const nextAfterCapture = getNextQuestion();
    if (nextAfterCapture) {
      // Navigate to the section
      const sectionIndex = FRAMEWORK.findIndex(s => s.id === nextAfterCapture.sectionId);
      state.activeSection = sectionIndex;

      response += `\nLet's work on **${nextAfterCapture.sectionLabel}** → **${nextAfterCapture.field.label}**.\n\n`;
      response += `*${nextAfterCapture.field.description}*\n\n`;

      // Generate targeted question
      const questions = getFieldQuestion(nextAfterCapture.sectionId, nextAfterCapture.field.id);
      response += questions;
    } else {
      response += `\n🎉 **Incredible! Your BrandScript Card is complete!**\n\nAll 8 sections of your brand strategy have been filled out. You can now export your full brand strategy using the Export button at the top right.`;
    }
  } else {
    response += `\n🎉 **Your BrandScript Card is fully complete!**\n\nYou can review all sections in the panel on the right, or export your full brand strategy.`;
  }

  return response;
}

function getFieldQuestion(sectionId, fieldId) {
  const questions = {
    'name.purpose': `Tell me about the founder's conviction. What problem did they identify that they absolutely had to fix? What was the moment they knew they couldn't stay silent?\n\nRemember: Purpose starts where the visionary has identified a problem they have a conviction to fix. The solution will exist in one of three forms: **Physical**, **Emotional**, or **Spiritual**.`,
    'name.origin_story_character': `Let's uncover the origin. I need to understand two things:\n\n1. **Conviction (Heartbreak):** What breaks the founder's heart? What do they feel they *must* do to feel fulfilled?\n2. **Cause (Anger):** What makes them angry? What injustice can they not stand?`,
    'name.origin_story_problem': `Now let's define the problem the audience faces. Tell me about:\n\n- **External:** What is the tangible, physical obstacle?\n- **Internal:** What emotional toll does it take? What frustration or fear?\n- **Philosophical/Spiritual:** Why is it fundamentally *wrong* that people deal with this?`,
    'name.origin_story_guide': `How does this brand position itself as the **Guide**?\n\n- **Empathy:** How do they understand the audience's fear and pain?\n- **Authority (Testimony):** What have they seen, heard, and experienced that proves they can lead?`,
    'name.tagline': `Time to create the tagline — the "salt" of the brand, boiled down to a **maximum of 3 words**.\n\nFirst, tell me: if you could boil the entire mission down to one single sentence, what would it be?\n\nAlso, is the business name abstract or clear? (This determines whether the tagline should be literal or aspirational.)`,
    'name.slogan': `The slogan is a **seasonal advertising hook** for campaigns. Unlike the tagline (permanent), the slogan changes.\n\nDo you have a current campaign or seasonal focus? What message are you trying to push right now?`,
    'character.values': `What are the **core values** this business will never compromise on?\n\nThink about: if a misaligned corporation offered a lucrative partnership, what specific principles would make you walk away?`,
    'character.conviction': `Tell me about the brand's **conviction and cause**.\n\n- What benevolence drives the business?\n- What injustice fuels the fight?`,
    'character.charity': `How does this brand **give back**? Is there a charity, cause, or community initiative that aligns with the brand's values?`,
    'intent.vision': `What is the brand's **Vision** — the massive, ultimate goal that does NOT currently exist?\n\nIf this business fulfills its ultimate purpose, what will the world look like? What change will have been brought into reality?`,
    'intent.mission': `Let's craft the **Mission** using the formula:\n\n**Need/Problem** + **Action (what you're sent to do)** + **Audience (who you're sent to)**\n\nBecause of [what problem], our mission is to [what action] for [what audience].`,
    'intent.message': `What is the brand's **Message** — the promise?\n\nWhat awaits the audience if they engage with this brand? What will they receive, experience, or become? This is what the recipient gets out of the mission.`,
    'voice.archetype': `Which of the **12 Brand Archetypes** best represents this brand?\n\nThe Hero, Creator, Explorer, Sage, Outlaw, Magician, Lover, Jester, Everyman, Caregiver, Ruler, or Innocent?\n\nDescribe the brand's personality and I'll help identify the archetype.`,
    'voice.tone': `Based on **Plutchik's Emotion Wheel**, what emotional tone does the brand communicate with?\n\nExamples: Joy (playful, witty), Trust (authentic, warm), Surprise (innovative, quirky), Anger (bold, defiant)\n\nDescribe how the brand "sounds" when it speaks.`,
    'voice.topics_of_authority': `What **Topics of Authority** is this brand qualified to speak about? What subjects does the brand own expertise in?`,
    'creation.product': `What **products** does the business create or sell? Describe the tangible offerings.`,
    'creation.service': `What **services** does the business provide? Describe the intangible offerings.`,
    'creation.superpower': `What is the brand's **Superpower** — its unique differentiator? What makes this brand's creation extraordinary compared to competitors?`,
    'operation.tools': `What **tools and technologies** does the business use in its day-to-day operations?`,
    'operation.processes': `What are the key **workflows and processes** the business follows?`,
    'operation.systems': `What **systems and platforms** power the business?`,
    'operation.logistics': `Describe the **logistics** — delivery, fulfilment, and operational flow.`,
    'image.logo': `Describe the brand's **logo** — or the concept/vision for it. What does it represent?`,
    'image.fonts': `What **typography** does the brand use? What fonts and why?`,
    'image.colour_palette': `What is the brand's **colour palette**? What are the primary, secondary, and accent colours, and what emotions do they evoke?`,
    'administration.policies': `What are the key business **policies**?`,
    'administration.procedures': `What **standard operating procedures** does the business follow?`,
    'administration.legal': `Describe the **legal structure** — business type, trademarks, IP considerations.`,
    'administration.finance': `What is the **revenue model**? Describe pricing strategy and financial structure.`,
  };

  const key = `${sectionId}.${fieldId}`;
  return questions[key] || `Please tell me about this aspect of your brand.`;
}

// (handleUserInput is defined above in the Gemini API section)

// ─── EVENT LISTENERS ────────────────────────────────────────────────
btnSend.addEventListener('click', () => {
  handleUserInput(chatInput.value);
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleUserInput(chatInput.value);
  }
});

// Auto-resize textarea
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
});

// Reset
btnReset.addEventListener('click', () => {
  if (confirm('Are you sure you want to reset? All progress will be lost.')) {
    state.messages = [];
    state.activeSection = 0;
    FRAMEWORK.forEach(section => {
      section.fields.forEach(field => {
        state.brandscript[section.id][field.id] = '';
      });
    });
    chatMessages.innerHTML = '';
    renderNav();
    renderBrandscript();
    updateProgress();
    showWelcome();
  }
});

// Export
btnExport.addEventListener('click', () => {
  let markdown = '# Brand Strategy — BrandScript Card\n\n';
  markdown += `*Generated on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}*\n\n---\n\n`;
  
  FRAMEWORK.forEach(section => {
    markdown += `## ${section.icon} ${section.label.toUpperCase()}\n\n`;
    section.fields.forEach(field => {
      const value = state.brandscript[section.id][field.id];
      markdown += `### ${field.label}\n`;
      markdown += value ? `${value}\n\n` : `*Not yet defined*\n\n`;
    });
    markdown += '---\n\n';
  });

  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'brand-strategy-brandscript.md';
  a.click();
  URL.revokeObjectURL(url);
});

// ─── AUDIO RECORDING MODULE ─────────────────────────────────────────
const btnMic = document.getElementById('btn-mic');
const recordingOverlay = document.getElementById('recording-overlay');
const recordingTimer = document.getElementById('recording-timer');
const waveformCanvas = document.getElementById('waveform-canvas');
const btnCancelRecording = document.getElementById('btn-cancel-recording');
const btnStopRecording = document.getElementById('btn-stop-recording');
const recordingLiveText = document.getElementById('recording-live-text');

const audioState = {
  isRecording: false,
  mediaRecorder: null,
  audioChunks: [],
  stream: null,
  audioContext: null,
  analyser: null,
  animationFrame: null,
  timerInterval: null,
  startTime: null,
  recognition: null,
  transcribedText: '',
  interimText: '',
};

// Check for Speech Recognition support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function startTimer() {
  audioState.startTime = Date.now();
  audioState.timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - audioState.startTime) / 1000);
    recordingTimer.textContent = formatTime(elapsed);
  }, 1000);
}

function stopTimer() {
  clearInterval(audioState.timerInterval);
  audioState.timerInterval = null;
}

// Waveform visualization
function drawWaveform() {
  if (!audioState.analyser) return;

  const canvas = waveformCanvas;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  
  // Set canvas resolution
  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);
  
  const width = canvas.offsetWidth;
  const height = canvas.offsetHeight;
  const bufferLength = audioState.analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    audioState.animationFrame = requestAnimationFrame(draw);
    audioState.analyser.getByteTimeDomainData(dataArray);

    ctx.clearRect(0, 0, width, height);

    // Draw background gradient bars
    const barCount = 60;
    const barWidth = width / barCount;
    const samplesPerBar = Math.floor(bufferLength / barCount);

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < samplesPerBar; j++) {
        const idx = i * samplesPerBar + j;
        sum += Math.abs(dataArray[idx] - 128);
      }
      const avg = sum / samplesPerBar;
      const barHeight = Math.max(2, (avg / 128) * height * 1.5);
      
      const x = i * barWidth;
      const y = (height - barHeight) / 2;
      
      // Gradient from orange to amber
      const progress = i / barCount;
      const r = Math.round(255 - progress * 8);
      const g = Math.round(107 + progress * 94);
      const b = Math.round(53 + progress * 19);
      
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.5 + avg / 200})`;
      ctx.beginPath();
      ctx.roundRect(x + 1, y, barWidth - 2, barHeight, 2);
      ctx.fill();
    }

    // Draw center line waveform
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 107, 53, 0.8)';
    ctx.lineWidth = 2;
    const sliceWidth = width / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * height) / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();
  }

  draw();
}

function stopWaveform() {
  if (audioState.animationFrame) {
    cancelAnimationFrame(audioState.animationFrame);
    audioState.animationFrame = null;
  }
}

// Start recording
async function startRecording() {
  try {
    // Request basic microphone access (simplifying params often helps with Speech Recognition reliability)
    audioState.stream = await navigator.mediaDevices.getUserMedia({ 
      audio: true 
    });

    // Note: We don't use MediaRecorder because it can sometimes conflict with SpeechRecognition on the same stream

    // Set up Web Audio API for visualization
    audioState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioState.audioContext.createMediaStreamSource(audioState.stream);
    audioState.analyser = audioState.audioContext.createAnalyser();
    audioState.analyser.fftSize = 2048;
    audioState.analyser.smoothingTimeConstant = 0.85;
    source.connect(audioState.analyser);

    // Set up Speech Recognition for live transcription
    audioState.transcribedText = '';
    audioState.interimText = '';

    if (SpeechRecognition) {
      audioState.recognition = new SpeechRecognition();
      audioState.recognition.continuous = true;
      audioState.recognition.interimResults = true;
      audioState.recognition.lang = 'en-US';
      audioState.recognition.maxAlternatives = 1;

      audioState.recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript + ' ';
          } else {
            interim += transcript;
          }
        }
        if (final) {
          audioState.transcribedText += final;
        }
        audioState.interimText = interim;

        // Update live text display
        const displayText = audioState.transcribedText + (interim ? `<span style="color: var(--text-muted)">${interim}</span>` : '');
        if (recordingLiveText) {
          recordingLiveText.innerHTML = displayText || '';
          recordingLiveText.scrollTop = recordingLiveText.scrollHeight;
        }
      };

      audioState.recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          stopRecording(false);
          alert('Microphone access for speech recognition was denied.');
        }
      };

      audioState.recognition.onend = () => {
        // Restart gracefully if still recording
        if (audioState.isRecording) {
          setTimeout(() => {
            if (audioState.isRecording) {
              try { audioState.recognition.start(); } catch(e) {}
            }
          }, 300);
        }
      };

      // Set recording flag early so onend restart works correctly
      audioState.isRecording = true;
      audioState.recognition.start();
    } else {
      audioState.isRecording = true;
    }

    // Update UI
    btnMic.classList.add('recording');
    recordingOverlay.classList.add('active');
    if (recordingLiveText) recordingLiveText.innerHTML = '';
    
    startTimer();
    drawWaveform();

  } catch (err) {
    console.error('Error starting recording:', err);
    const errorMsg = {
      role: 'agent',
      content: `⚠️ **Microphone Access Denied**\n\nI couldn't access your microphone. Please:\n1. Click the lock/camera icon in your browser's address bar\n2. Allow microphone access for this site\n3. Try again\n\nError: ${err.message}`,
    };
    state.messages.push(errorMsg);
    renderMessage(errorMsg);
  }
}

// Stop recording and process
async function stopRecording(sendTranscription = true) {
  if (!audioState.isRecording) return;
  
  audioState.isRecording = false;

  // Stop speech recognition
  if (audioState.recognition) {
    audioState.recognition.stop();
    audioState.recognition = null;
  }

  // Stop audio stream
  if (audioState.stream) {
    audioState.stream.getTracks().forEach(track => track.stop());
    audioState.stream = null;
  }

  // Close audio context
  if (audioState.audioContext) {
    audioState.audioContext.close();
    audioState.audioContext = null;
    audioState.analyser = null;
  }

  // Stop timer and waveform
  stopTimer();
  stopWaveform();

  // Update UI
  btnMic.classList.remove('recording');
  recordingOverlay.classList.remove('active');
  recordingTimer.textContent = '00:00';
  if (recordingLiveText) recordingLiveText.innerHTML = '';

  // Process transcription
  if (sendTranscription) {
    const fullText = (audioState.transcribedText + audioState.interimText).trim();
    
    if (fullText) {
      // Send transcribed text as user input with a label
      const labeledText = `🎙️ [Audio Recording]\n\n${fullText}`;
      handleUserInput(labeledText);
    } else {
      // No transcription detected
      const noTextMsg = {
        role: 'agent',
        content: `🎙️ **Recording Complete** — but I couldn't detect any speech.\n\nThis could happen if:\n- The microphone volume was too low\n- There was too much background noise\n- Speech Recognition isn't supported in your browser\n\nTry again, or type/paste your content directly.`,
      };
      state.messages.push(noTextMsg);
      renderMessage(noTextMsg);
    }
  }
}

// Cancel recording
function cancelRecording() {
  stopRecording(false);
  
  const cancelMsg = {
    role: 'agent',
    content: `🎙️ Recording cancelled. No worries — click the mic button when you're ready to try again, or type/paste your content directly.`,
  };
  state.messages.push(cancelMsg);
  renderMessage(cancelMsg);
}

// Mic button click
btnMic.addEventListener('click', () => {
  if (audioState.isRecording) {
    stopRecording(true);
  } else {
    startRecording();
  }
});

// Recording overlay controls
btnStopRecording.addEventListener('click', () => stopRecording(true));
btnCancelRecording.addEventListener('click', () => cancelRecording());

// ─── WELCOME MESSAGE ────────────────────────────────────────────────
function showWelcome() {
  const welcomeHTML = `
    <div class="welcome-card">
      <h1>Build Your Brand Strategy</h1>
      <p>I'm your Brand Strategy Agent, powered by the Volcanic Marketing 8-section framework. Paste your meeting transcript, record audio, or describe your brand — and I'll extract your complete BrandScript.</p>
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
  chatMessages.innerHTML = welcomeHTML;

  // Add initial agent message
  setTimeout(() => {
    const initMsg = {
      role: 'agent',
      content: `Welcome! 👋 I'm your **Brand Strategy Agent**.\n\nI'll guide you through the **8 sections** of your brand strategy framework: Name, Character, Intent, Voice, Creation, Operation, Image, and Administration.\n\nYou can:\n- 🎙️ **Record audio** — click the mic button to record a meeting or dictate your thoughts\n- 📋 **Paste a meeting transcript** and I'll extract brand elements automatically\n- 💬 **Answer my questions** one section at a time\n- ✍️ **Type freely** about your brand and I'll map it to the right sections\n\nLet's start with the **Name** section. Tell me about the founder — what problem did they identify that they absolutely had to fix? What was the moment of conviction?`,
      quickActions: ['🎙️ Record audio', 'Start with a transcript', 'Interview me section by section'],
    };
    state.messages.push(initMsg);
    renderMessage(initMsg);
  }, 500);
}

// ─── INITIALIZE ─────────────────────────────────────────────────────
renderNav();
renderBrandscript();
updateProgress();
showWelcome();

