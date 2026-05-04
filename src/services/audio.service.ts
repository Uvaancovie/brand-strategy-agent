// ─── AUDIO SERVICE ──────────────────────────────────────────────────
// Handles microphone recording, waveform visualization, file upload,
// and live/final transcription via Groq Whisper

import { groq, transcribeAudio } from './groq.service';
import type { ChatMessage } from '../config/framework';

// ─── TYPES ──────────────────────────────────────────────────────────

interface AudioState {
  isRecording: boolean;
  mediaRecorder: MediaRecorder | null;
  audioChunks: Blob[];
  stream: MediaStream | null;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  animationFrame: number | null;
  timerInterval: ReturnType<typeof setInterval> | null;
  startTime: number | null;
  liveTranscriptionInterval: ReturnType<typeof setInterval> | null;
  liveTranscript: string;
  mimeType: string;
  fileExtension: string;
}

export const audioState: AudioState = {
  isRecording: false,
  mediaRecorder: null,
  audioChunks: [],
  stream: null,
  audioContext: null,
  analyser: null,
  animationFrame: null,
  timerInterval: null,
  startTime: null,
  liveTranscriptionInterval: null,
  liveTranscript: '',
  mimeType: '',
  fileExtension: 'webm',
};

// ─── TIMER ──────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export function startTimer(timerEl: HTMLElement): void {
  audioState.startTime = Date.now();
  audioState.timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - (audioState.startTime || 0)) / 1000);
    timerEl.textContent = formatTime(elapsed);
  }, 1000);
}

export function stopTimer(): void {
  if (audioState.timerInterval) clearInterval(audioState.timerInterval);
  audioState.timerInterval = null;
}

// ─── WAVEFORM ───────────────────────────────────────────────────────

export function drawWaveform(canvas: HTMLCanvasElement): void {
  if (!audioState.analyser) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);
  const width = canvas.offsetWidth;
  const height = canvas.offsetHeight;
  const bufferLength = audioState.analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    audioState.animationFrame = requestAnimationFrame(draw);
    audioState.analyser!.getByteTimeDomainData(dataArray);
    ctx!.clearRect(0, 0, width, height);
    const barCount = 60;
    const barWidth = width / barCount;
    const samplesPerBar = Math.floor(bufferLength / barCount);

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < samplesPerBar; j++) sum += Math.abs(dataArray[i * samplesPerBar + j] - 128);
      const avg = sum / samplesPerBar;
      const barHeight = Math.max(2, (avg / 128) * height * 1.5);
      const x = i * barWidth;
      const y = (height - barHeight) / 2;
      const progress = i / barCount;
      ctx!.fillStyle = `rgba(${255 - progress * 8}, ${107 + progress * 94}, ${53 + progress * 19}, ${0.5 + avg / 200})`;
      ctx!.beginPath();
      ctx!.roundRect(x + 1, y, barWidth - 2, barHeight, 2);
      ctx!.fill();
    }
  }
  draw();
}

export function stopWaveform(): void {
  if (audioState.animationFrame) {
    cancelAnimationFrame(audioState.animationFrame);
    audioState.animationFrame = null;
  }
}

// ─── RECORDING ──────────────────────────────────────────────────────

export async function startRecording(
  elements: {
    btnMic: HTMLElement;
    overlay: HTMLElement;
    liveText: HTMLElement;
    timer: HTMLElement;
    canvas: HTMLCanvasElement;
  },
  onError: (msg: ChatMessage) => void
): Promise<void> {
  try {
    audioState.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioState.audioChunks = [];
    audioState.liveTranscript = '';

    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' :
                     MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
    audioState.mimeType = mimeType;
    audioState.fileExtension = mimeType.includes('mp4') ? 'mp4' : 'webm';

    const options = mimeType ? { mimeType } : {};
    audioState.mediaRecorder = new MediaRecorder(audioState.stream, options);
    audioState.mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) audioState.audioChunks.push(event.data);
    };
    audioState.mediaRecorder.start(2000);

    audioState.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioState.audioContext.createMediaStreamSource(audioState.stream);
    audioState.analyser = audioState.audioContext.createAnalyser();
    audioState.analyser.fftSize = 2048;
    audioState.analyser.smoothingTimeConstant = 0.85;
    source.connect(audioState.analyser);

    audioState.isRecording = true;
    elements.btnMic.classList.add('recording');
    elements.overlay.classList.add('active');
    elements.liveText.innerHTML = '<span style="color: var(--text-muted)">Listening for speech...</span>';

    startTimer(elements.timer);
    drawWaveform(elements.canvas);

    // Live transcription
    let isTranscribing = false;
    audioState.liveTranscriptionInterval = setInterval(async () => {
      if (!isTranscribing && audioState.audioChunks.length > 0) {
        isTranscribing = true;
        try {
          const mimeStr = audioState.mimeType || 'audio/webm';
          const extStr = audioState.fileExtension || 'webm';
          // Use a rolling window of the last 12 seconds (~6 chunks) for lightning fast live Spanish->English translation
          const recentChunks = audioState.audioChunks.slice(-6);
          const audioBlob = new Blob(recentChunks, { type: mimeStr });
          const file = new File([audioBlob], `live.${extStr}`, { type: mimeStr });
          // Use translations endpoint which auto-detects any language (e.g. Spanish) and returns English live out of the box.
          const transcription = await groq.audio.translations.create({
            file, model: 'whisper-large-v3', temperature: 0, response_format: 'json',
          });
          if (transcription.text && transcription.text.trim().length > 3) {
             audioState.liveTranscript = transcription.text.trim();
          }
          if (elements.liveText && audioState.isRecording) {
            const words = audioState.liveTranscript.split(' ');
            let displayHtml = audioState.liveTranscript;
            if (words.length > 6) {
              displayHtml = `${words.slice(0, -6).join(' ')} <span style="color: #fff; text-shadow: 0 0 12px rgba(255,255,255,0.6);">${words.slice(-6).join(' ')}</span>`;
            } else if (words.length > 0 && words[0] !== '') {
              displayHtml = `<span style="color: #fff; text-shadow: 0 0 12px rgba(255,255,255,0.6);">${displayHtml}</span>`;
            }
            elements.liveText.innerHTML = displayHtml + '<span class="live-cursor"></span>';
            elements.liveText.scrollTop = elements.liveText.scrollHeight;
          }
        } catch (e) {
          console.warn('Live transcription error:', e);
        } finally {
          isTranscribing = false;
        }
      }
    }, 2500);

  } catch (err) {
    console.error('Error starting recording:', err);
    onError({ role: 'agent', content: `⚠️ **Microphone Access Denied**\n\n${(err as Error).message}` });
  }
}

export async function stopRecording(
  sendTranscription: boolean,
  elements: {
    btnMic: HTMLElement;
    overlay: HTMLElement;
    liveText: HTMLElement;
    timer: HTMLElement;
  },
  onTranscript: (text: string) => void,
  onError: (msg: ChatMessage) => void
): Promise<void> {
  if (!audioState.isRecording) return;
  audioState.isRecording = false;

  if (audioState.liveTranscriptionInterval) {
    clearInterval(audioState.liveTranscriptionInterval);
    audioState.liveTranscriptionInterval = null;
  }

  const processAudio = sendTranscription;

  if (audioState.mediaRecorder) {
    audioState.mediaRecorder.onstop = async () => {
      if (audioState.stream) {
        audioState.stream.getTracks().forEach(track => track.stop());
        audioState.stream = null;
      }
      if (processAudio) {
        elements.liveText.innerHTML = '<span style="color: var(--text-muted)">Transcribing with Whisper (Groq)...</span>';
        try {
          const mimeStr = audioState.mimeType || 'audio/webm';
          const extStr = audioState.fileExtension || 'webm';
          const audioBlob = new Blob(audioState.audioChunks, { type: mimeStr });
          const file = new File([audioBlob], `audio.${extStr}`, { type: mimeStr });
          const fullText = await transcribeAudio(file);
          if (fullText) {
            onTranscript(`🎙️ [Audio Recording]\n\n${fullText}`);
          } else {
            onError({ role: 'agent', content: `🎙️ **Recording Complete** — no speech detected. Try again.` });
          }
        } catch (e) {
          console.error('Transcription error:', e);
          onError({ role: 'agent', content: `🎙️ **Transcription Failed** — ${(e as Error).message}` });
        }
      }
      elements.btnMic.classList.remove('recording');
      elements.overlay.classList.remove('active');
      elements.timer.textContent = '00:00';
      elements.liveText.innerHTML = '';
    };
    audioState.mediaRecorder.stop();
  } else {
    elements.btnMic.classList.remove('recording');
    elements.overlay.classList.remove('active');
  }

  if (audioState.audioContext) {
    audioState.audioContext.close();
    audioState.audioContext = null;
    audioState.analyser = null;
  }
  stopTimer();
  stopWaveform();
}

// ─── ACCEPTED AUDIO FORMATS ─────────────────────────────────────────

export const ACCEPTED_AUDIO_EXTENSIONS = ['.mp3', '.flac', '.aac', '.aif', '.aiff', '.wav', '.m4a', '.webm', '.ogg', '.mp4'];
export const ACCEPTED_AUDIO_MIMES = [
  'audio/mpeg', 'audio/flac', 'audio/aac', 'audio/x-aiff', 'audio/aiff',
  'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/webm', 'audio/ogg',
  'audio/x-m4a', 'audio/m4a',
];

export function isAcceptedAudioFile(file: File): boolean {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return ACCEPTED_AUDIO_EXTENSIONS.includes(ext) || file.type.startsWith('audio/');
}

// Formats the browser CANNOT reliably decode via Web Audio API for chunking
const NON_DECODABLE_EXTENSIONS = ['.flac', '.aac', '.aif', '.aiff'];
function isNonDecodable(file: File): boolean {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return NON_DECODABLE_EXTENSIONS.includes(ext);
}

// ─── FILE UPLOAD ────────────────────────────────────────────────────

export async function processAudioFile(
  file: File,
  overlayEl: HTMLElement,
  titleEl: HTMLElement,
  subtitleEl: HTMLElement,
  progressBar: HTMLElement,
  onTranscript: (text: string) => void,
  onError: (msg: ChatMessage) => void
): Promise<void> {
  overlayEl.classList.add('active');
  titleEl.textContent = 'Processing Audio';
  subtitleEl.textContent = `Transcribing "${file.name}" with Whisper AI...`;
  progressBar.style.width = '10%';

  const MAX_DIRECT_SIZE = 24 * 1024 * 1024; // 24MB safe limit for direct Groq

  try {
    let fullText = '';

    if (file.size <= MAX_DIRECT_SIZE) {
      // Direct send — works for all formats under 25MB (mp3, flac, aac, aiff, wav, etc.)
      progressBar.style.width = '50%';
      fullText = await transcribeAudio(file);
      progressBar.style.width = '90%';
    } else if (isNonDecodable(file)) {
      // File is too large AND format can't be decoded by browser for chunking
      overlayEl.classList.remove('active');
      progressBar.style.width = '0%';
      onError({
        role: 'agent',
        content: `⚠️ **File too large for this format**\n\n"${file.name}" is ${(file.size/1024/1024).toFixed(1)}MB but FLAC/AAC/AIFF files over 25MB cannot be chunked in the browser. Please convert to MP3 or WAV first, or trim the file to under 25MB.`,
      });
      return;
    } else {
      // Large file with decodable format (mp3/wav/m4a) → decode and chunk via WAV
      subtitleEl.textContent = `File is large (${(file.size/1024/1024).toFixed(1)}MB). Slicing audio...`;
      progressBar.style.width = '15%';

      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

       const sampleRate = audioBuffer.sampleRate;
       const numChannelsOrig = audioBuffer.numberOfChannels;
       const duration = audioBuffer.duration;

       // WAV is uncompressed. 25MB Groq limit.
       // Force Mono (1 channel) + 2.5 minute chunks (150s) to guarantee size < 15MB even at 48kHz
       const CHUNK_DURATION = 150;
       const totalChunks = Math.ceil(duration / CHUNK_DURATION);

      subtitleEl.textContent = `Transcribing ${Math.round(duration / 60)} min of audio in ${totalChunks} parts...`;

      for (let i = 0; i < totalChunks; i++) {
        const startSec = i * CHUNK_DURATION;
        const endSec = Math.min((i + 1) * CHUNK_DURATION, duration);
         const chunkLength = Math.floor((endSec - startSec) * sampleRate);
         const offset = Math.floor(startSec * sampleRate);

         // Create 1-channel buffer to save bandwidth
         const chunkBuffer = audioCtx.createBuffer(1, chunkLength, sampleRate);
         const monoData = chunkBuffer.getChannelData(0);

         for (let j = 0; j < chunkLength; j++) {
            let sum = 0;
            for (let c = 0; c < numChannelsOrig; c++) {
               sum += audioBuffer.getChannelData(c)[offset + j];
            }
            monoData[j] = sum / numChannelsOrig;
         }
        }

        const wavBlob = audioBufferToWavBlob(chunkBuffer);
        const chunkFile = new File([wavBlob], `chunk_${i}.wav`, { type: 'audio/wav' });

        subtitleEl.textContent = `Transcribing part ${i + 1} of ${totalChunks}...`;
        const text = await transcribeAudio(chunkFile);
        fullText += text + ' ';

        progressBar.style.width = `${15 + Math.floor(((i + 1) / totalChunks) * 75)}%`;
      }
    }

    progressBar.style.width = '100%';
    setTimeout(() => {
      overlayEl.classList.remove('active');
      progressBar.style.width = '0%';
    }, 500);

    if (fullText.trim()) {
      onTranscript(`📁 [Audio File: ${file.name}]\n\n${fullText.trim()}`);
    } else {
      onError({ role: 'agent', content: `📁 **Audio Processed** — No speech detected in "${file.name}".` });
    }
  } catch (e) {
    overlayEl.classList.remove('active');
    progressBar.style.width = '0%';
    console.error('Transcription error:', e);
    onError({ role: 'agent', content: `📁 **Transcription Failed** — ${(e as Error).message}` });
  }
}

// Helper: Convert AudioBuffer to WAV byte array
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length * numChannels * 2; 
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);
  const channels = [];
  const sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) { view.setUint16(pos, data, true); pos += 2; }
  function setUint32(data: number) { view.setUint32(pos, data, true); pos += 4; }

  setUint32(0x46464952); // "RIFF"
  setUint32(36 + length);
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt "
  setUint32(16); // length of fmt data
  setUint16(1); // format: PCM
  setUint16(numChannels);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numChannels); // byte rate
  setUint16(numChannels * 2); // block align
  setUint16(16); // bits per sample
  setUint32(0x61746164); // "data"
  setUint32(length);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numChannels; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}
