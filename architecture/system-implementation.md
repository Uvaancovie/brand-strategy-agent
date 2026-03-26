# VMV8 — Brand Strategy Agent: System Implementation

## Architecture Overview

VMV8 (Voice Matrix V8) is an AI-powered reasoning agent that automatically extracts, analyzes, and generates comprehensive brand strategies from raw meeting conversations. The agent — nicknamed **Brandy** — is the first of three planned autonomous agents for the Volcanic Marketing platform.

### Agent Roadmap
1. **Agent 1: Brandy** (Branding Agent) — *Current build*
2. **Agent 2: Mark** (Market Research Agent) — *Planned*
3. **Agent 3: CC** (Campaign & Content Agent) — *Planned*

---

## System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    VMV8 Frontend (Vite)                    │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ Sidebar   │  │  Chat Area   │  │  B.I.G Doc Panel  │  │
│  │ - Nav     │  │  - Messages  │  │  - 8 Sections     │  │
│  │ - Progress│  │  - Input     │  │  - Live Preview   │  │
│  │ - Checks  │  │  - Upload    │  │  - Filled Status  │  │
│  └──────────┘  └──────────────┘  └────────────────────┘  │
│                        │                                   │
│          ┌─────────────┼─────────────┐                    │
│          │             │             │                     │
│    ┌─────▼─────┐ ┌────▼────┐ ┌─────▼─────┐              │
│    │   Groq    │ │ Whisper │ │  Session   │              │
│    │  LLaMA    │ │  STT    │ │ Storage    │              │
│    │  3.3-70B  │ │ V3-Turbo│ │(localStorage)│            │
│    └───────────┘ └─────────┘ └───────────┘              │
└──────────────────────────────────────────────────────────┘
```

## Core Components

### 1. AI Reasoning Engine (Groq LLaMA 3.3-70B)
- **System Prompt**: Comprehensive VMV8 framework instructions with chain-of-thought reasoning
- **Context Injection**: Current B.I.G Doc status injected on every call
- **Extraction Tags**: `[EXTRACT: section.field]` pattern for auto-populating the document
- **Conversation Memory**: Last 20 messages retained for context continuity
- **Retry Logic**: Automatic retry on rate limits with exponential backoff

### 2. Speech-to-Text (Groq Whisper Large V3 Turbo)
- **Live Recording**: Browser MediaRecorder API with real-time waveform visualization
- **Live Transcription**: Incremental transcription every 2.5 seconds during recording
- **File Upload**: Drag-and-drop or file picker for pre-recorded audio
- **Supported Formats**: MP3, WAV, M4A, WEBM, OGG, FLAC (max 25MB)

### 3. VMV8 Framework (8 Sections, 25 Fields)

| Section | Fields | Color |
|---------|--------|-------|
| **Name** | Purpose, Origin Story (Character/Problem/Guide), Tagline, Slogan | #FF6B35 |
| **Character** | Values, Conviction & Cause, Charity | #E86FBF |
| **Intent** | Vision, Mission, Message | #7C6BFF |
| **Voice** | Archetype, Tone (Plutchik), Topics of Authority | #4ECDC4 |
| **Creation** | Product, Service, Superpower | #F7C948 |
| **Operation** | Tools, Processes, Systems, Logistics | #45B7D1 |
| **Image** | Logo, Fonts, Colour Palette | #FF8C61 |
| **Administration** | Policies, Procedures, Legal, Finance | #98D4A6 |

### 4. Session Persistence
- Auto-saves to `localStorage` after every interaction
- Restores brandscript, conversation history, and progress on reload
- Session indicator in header shows save status

### 5. B.I.G Doc Export
- Exports as formatted Markdown (.md)
- Includes all 8 sections with field descriptions
- Contains generated metadata (date, framework version)

## Tech Stack
- **Build Tool**: Vite 8
- **AI**: Groq SDK (Browser) — LLaMA 3.3-70B + Whisper Large V3 Turbo
- **Language**: Vanilla JavaScript (ES Modules)
- **Styling**: Custom CSS with CSS Variables, Glassmorphism, Ambient Animations
- **Typography**: Inter + Outfit (Google Fonts)
- **Storage**: localStorage for session persistence

## Data Flow

1. **Input** → User pastes transcript / records audio / uploads file / types answer
2. **Transcription** → Audio inputs are transcribed via Groq Whisper
3. **AI Analysis** → Groq LLaMA analyzes input with VMV8 framework context
4. **Extraction** → `[EXTRACT: section.field]` tags parsed from AI response
5. **State Update** → Brandscript state updated, UI re-rendered
6. **Persistence** → Session auto-saved to localStorage
7. **Export** → User downloads formatted B.I.G Doc when ready
