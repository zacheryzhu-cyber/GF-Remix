/**
 * J.A.R.V.I.S. High-Fidelity Neural Speech Engine & Stark HUD Audio Synthesizer
 * 
 * Powered by Google Gemini's native neural speech model (gemini-3.8-flash-lite-tts)
 * with studio 24kHz audio, authentic British AI cadence, and procedural Stark HUD chimes.
 * Automatically falls back to client Web Speech synthesis if offline.
 */

let audioCtx: AudioContext | null = null;
let currentSourceNode: AudioBufferSourceNode | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;
const stateListeners: Set<(isSpeaking: boolean) => void> = new Set();

export type JarvisVoiceId =
  // ElevenLabs Ultra-Realistic Voices
  | 'el-rachel'
  | 'el-adam'
  | 'el-bella'
  | 'el-antoni'
  | 'el-george'
  | 'el-domi'
  | 'el-josh'
  // Google Gemini Neural Voices
  | 'Aoede'
  | 'Kore'
  | 'Zephyr'
  | 'Fenrir'
  | 'Charon'
  | 'Puck';

export interface VoiceOption {
  id: JarvisVoiceId;
  name: string;
  provider: 'elevenlabs' | 'gemini';
  elevenLabsVoiceId?: string;
  gender: 'female' | 'male';
  badge: string;
  description: string;
  sampleText: string;
}

export const JARVIS_VOICE_OPTIONS: VoiceOption[] = [
  // --- ElevenLabs Premade Voices ---
  {
    id: 'el-rachel',
    name: 'Rachel (ElevenLabs)',
    provider: 'elevenlabs',
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
    gender: 'female',
    badge: 'ElevenLabs • Calm & Pro',
    description: 'Calm, highly articulate, and professional executive female persona.',
    sampleText: 'Good day, Operator. Cleanroom semiconductor telemetry and causal graph networks are functioning within optimal limits.',
  },
  {
    id: 'el-adam',
    name: 'Adam (ElevenLabs)',
    provider: 'elevenlabs',
    elevenLabsVoiceId: 'pNInz6obpgDQGcFmaJgB',
    gender: 'male',
    badge: 'ElevenLabs • Deep Narrative',
    description: 'Deep, smooth, cinematic baritone narration.',
    sampleText: 'Telemetry stream established. Ready to execute single-point-of-failure audits across all utility headers.',
  },
  {
    id: 'el-bella',
    name: 'Bella (ElevenLabs)',
    provider: 'elevenlabs',
    elevenLabsVoiceId: 'EXAVITQu4vr4xnSDxMaL',
    gender: 'female',
    badge: 'ElevenLabs • Warm & Expressive',
    description: 'Warm, expressive, and engaging female conversational persona.',
    sampleText: 'All primary UPW polishing and Chilled Water loops are currently balanced and operating normally.',
  },
  {
    id: 'el-george',
    name: 'George (ElevenLabs)',
    provider: 'elevenlabs',
    elevenLabsVoiceId: 'JBFqnCBsd6RMkjVDRZzb',
    gender: 'male',
    badge: 'ElevenLabs • British Baritone',
    description: 'Refined, raspy British voice with sophisticated delivery.',
    sampleText: 'Facility diagnostics initialized, Operator. Awaiting your operational directives.',
  },
  {
    id: 'el-antoni',
    name: 'Antoni (ElevenLabs)',
    provider: 'elevenlabs',
    elevenLabsVoiceId: 'ErXwobaYiN019PkySvjV',
    gender: 'male',
    badge: 'ElevenLabs • Executive',
    description: 'Polished, clear, and steady male executive voice.',
    sampleText: 'Thermal regulation in Cleanroom Bay 4 verified within one-tenth degree Celsius.',
  },
  {
    id: 'el-domi',
    name: 'Domi (ElevenLabs)',
    provider: 'elevenlabs',
    elevenLabsVoiceId: 'AZnzlk1XvdvUeBnXmlld',
    gender: 'female',
    badge: 'ElevenLabs • Crisp & Dynamic',
    description: 'Strong, energetic, and assertive female technical voice.',
    sampleText: 'Process tools online. High-purity nitrogen and ultrapure water lines confirmed clear.',
  },

  // --- Google Gemini Native Voices ---
  {
    id: 'Aoede',
    name: 'Aoede (Gemini)',
    provider: 'gemini',
    gender: 'female',
    badge: 'Gemini • Deep & Sultry',
    description: 'Deep, cinematic, sultry, and highly articulate female voice.',
    sampleText: 'Good day, Operator. All cleanroom systems, telemetry feeds, and semantic graphs are functioning within optimal parameters.',
  },
  {
    id: 'Kore',
    name: 'Kore (Gemini)',
    provider: 'gemini',
    gender: 'female',
    badge: 'Gemini • Warm & Poised',
    description: 'Velvety, alluring, poised female persona with warm delivery.',
    sampleText: 'Synthesizing facility telemetry and causal graph models now.',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr (Gemini)',
    provider: 'gemini',
    gender: 'female',
    badge: 'Gemini • Crisp & Modern',
    description: 'Bright, fast, and energetic modern female voice.',
    sampleText: 'Ready to process your commands and execute automated diagnostics.',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir (Gemini)',
    provider: 'gemini',
    gender: 'male',
    badge: 'Gemini • Classic British AI',
    description: 'Deep, resonant British AI voice in the style of Paul Bettany.',
    sampleText: 'At your service, Operator. I have established a direct link to the cleanroom neural graph.',
  },
  {
    id: 'Charon',
    name: 'Charon (Gemini)',
    provider: 'gemini',
    gender: 'male',
    badge: 'Gemini • Command Baritone',
    description: 'Deep, authoritative baritone for critical mission command.',
    sampleText: 'Facility alarm matrix verified. Awaiting your operational directive.',
  },
  {
    id: 'Puck',
    name: 'Puck (Gemini)',
    provider: 'gemini',
    gender: 'male',
    badge: 'Gemini • Conversational',
    description: 'Conversational, natural, and approachable male voice.',
    sampleText: 'Hey there! Graph query complete and ready for review.',
  },
];

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function onJarvisStateChange(listener: (isSpeaking: boolean) => void): () => void {
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
}

function notifyState(isSpeaking: boolean) {
  stateListeners.forEach((fn) => {
    try {
      fn(isSpeaking);
    } catch {}
  });
}

/**
 * Procedural Stark HUD holographic chime (D5 -> A5 harmonic double-ping)
 */
export function playJarvisChime(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return resolve();

      const now = ctx.currentTime;

      // Tone 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.09, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.18);

      // Tone 2: 880 Hz (A5 - Harmonic fifth)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.08);
      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.setValueAtTime(0.11, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.32);

      setTimeout(resolve, 220);
    } catch {
      resolve();
    }
  });
}

/**
 * Procedural Stark HUD Mic activation tone (Ascending high frequency chime)
 */
export function playJarvisMicStart(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return resolve();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.15); // C6

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
      setTimeout(resolve, 150);
    } catch {
      resolve();
    }
  });
}

/**
 * Procedural Stark HUD Mic deactivation tone (Soft descending tone)
 */
export function playJarvisMicStop(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return resolve();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880.0, now); // A5
      osc.frequency.exponentialRampToValueAtTime(440.0, now + 0.14); // A4

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
      setTimeout(resolve, 140);
    } catch {
      resolve();
    }
  });
}

/**
 * Sanitizes markdown, code blocks, Cypher syntax, and technical characters for spoken delivery
 */
export function sanitizeForJarvis(rawText: string): string {
  if (!rawText) return '';

  let cleaned = rawText
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, ' [Data block verified.] ')
    // Remove inline backticks
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove URLs
    .replace(/https?:\/\/\S+/g, '')
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold and italic markers
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    // Remove markdown tables
    .replace(/\|[^\n]+\|/g, ' ')
    // Remove bullets and numbered lists markers
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Clean up arrows
    .replace(/->|-->|<-|<--/g, ' to ')
    // Clean up emojis
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Keep spoken response focused to first ~450 characters or 3 sentences for punchy delivery
  if (cleaned.length > 550) {
    const sentences = cleaned.match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length > 0) {
      cleaned = sentences.slice(0, 3).join(' ');
    } else {
      cleaned = cleaned.slice(0, 400) + '...';
    }
  }

  return cleaned;
}

/**
 * Stops any active audio source or speech utterance immediately
 */
export function stopJarvis(): void {
  if (currentSourceNode) {
    try {
      currentSourceNode.stop();
      currentSourceNode.disconnect();
    } catch {}
    currentSourceNode = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  activeUtterance = null;
  notifyState(false);
}

/**
 * Checks if J.A.R.V.I.S. is currently speaking
 */
export function isJarvisSpeaking(): boolean {
  if (currentSourceNode !== null) return true;
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    return window.speechSynthesis.speaking;
  }
  return false;
}

/**
 * Decodes and plays audio returned by ElevenLabs (MP3) or Gemini (PCM/WAV)
 */
function playAudioData(base64Audio: string, mimeType = 'audio/pcm', sampleRate = 24000): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return reject(new Error('AudioContext unavailable'));

      const binary = atob(base64Audio);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // If it's MP3, WAV, or containerized audio
      if (
        mimeType.includes('mpeg') ||
        mimeType.includes('mp3') ||
        mimeType.includes('wav') ||
        (bytes.length > 3 && (
          (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) || // MP3 frame sync
          (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) || // ID3 tag
          String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' // WAV
        ))
      ) {
        ctx.decodeAudioData(
          bytes.buffer.slice(0),
          (decodedBuffer) => {
            const source = ctx.createBufferSource();
            source.buffer = decodedBuffer;
            source.connect(ctx.destination);
            currentSourceNode = source;
            notifyState(true);
            source.onended = () => {
              if (currentSourceNode === source) {
                currentSourceNode = null;
                notifyState(false);
              }
              resolve();
            };
            source.start(0);
          },
          (err) => {
            console.warn('[VOICE] decodeAudioData failed, attempting PCM fallback:', err);
            playRawPcm(ctx, bytes, sampleRate, resolve, reject);
          }
        );
        return;
      }

      // Otherwise decode as raw 16-bit PCM little-endian
      playRawPcm(ctx, bytes, sampleRate, resolve, reject);
    } catch (err) {
      reject(err);
    }
  });
}

function playRawPcm(
  ctx: AudioContext,
  bytes: Uint8Array,
  sampleRate: number,
  resolve: () => void,
  reject: (err: any) => void
) {
  try {
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    const audioBuffer = ctx.createBuffer(1, float32Array.length, sampleRate);
    audioBuffer.copyToChannel(float32Array, 0);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(10500, ctx.currentTime);

    source.connect(filter);
    filter.connect(ctx.destination);

    currentSourceNode = source;
    notifyState(true);

    source.onended = () => {
      if (currentSourceNode === source) {
        currentSourceNode = null;
        notifyState(false);
      }
      resolve();
    };

    source.start(0);
  } catch (err) {
    reject(err);
  }
}

/**
 * Fallback to browser's SpeechSynthesis if server TTS is unreachable
 * Configured with a poised, sultry, elegant female voice persona
 */
function speakBrowserFallback(
  text: string,
  options?: { onStart?: () => void; onEnd?: () => void }
): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const utterance = new SpeechSynthesisUtterance(text);
  activeUtterance = utterance;

  const voices = window.speechSynthesis.getVoices() || [];
  // Prioritize elegant female voices: Samantha, Victoria, Google UK English Female, Karen, Moira, Fiona
  const preferred = voices.find(
    (v) =>
      (v.name.toLowerCase().includes('female') ||
        v.name.includes('Samantha') ||
        v.name.includes('Victoria') ||
        v.name.includes('Karen') ||
        v.name.includes('Moira') ||
        v.name.includes('Fiona') ||
        v.name.includes('Zira') ||
        (v.lang.includes('en') && v.name.toLowerCase().includes('google'))) &&
      !v.name.toLowerCase().includes('male')
  ) || voices.find((v) => v.lang.startsWith('en'));

  if (preferred) {
    utterance.voice = preferred;
    utterance.lang = preferred.lang;
  } else {
    utterance.lang = 'en-US';
  }

  utterance.pitch = 0.96;
  utterance.rate = 0.94;

  utterance.onstart = () => {
    notifyState(true);
    options?.onStart?.();
  };

  utterance.onend = () => {
    activeUtterance = null;
    notifyState(false);
    options?.onEnd?.();
  };

  utterance.onerror = () => {
    activeUtterance = null;
    notifyState(false);
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Main AI Voice trigger
 * Supports both ElevenLabs Ultra-Realistic Voices and Google Gemini Neural TTS
 */
export async function speakJarvis(
  text: string,
  options?: {
    playChimeFirst?: boolean;
    voiceName?: JarvisVoiceId;
    onStart?: () => void;
    onEnd?: () => void;
  }
): Promise<void> {
  const sanitized = sanitizeForJarvis(text);
  if (!sanitized) return;

  // Stop any active audio
  stopJarvis();

  // Play futuristic Stark HUD ping
  if (options?.playChimeFirst !== false) {
    await playJarvisChime();
  }

  const voiceId = options?.voiceName || 'el-rachel';
  const voiceConfig = JARVIS_VOICE_OPTIONS.find((v) => v.id === voiceId);

  try {
    options?.onStart?.();
    notifyState(true);

    if (voiceConfig?.provider === 'elevenlabs') {
      const response = await fetch('/api/elevenlabs/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sanitized,
          voiceId: voiceConfig.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM',
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs TTS server returned status ${response.status}`);
      }

      const data = await response.json();
      if (data.audio) {
        await playAudioData(data.audio, data.mimeType || 'audio/mpeg', 44100);
        options?.onEnd?.();
        return;
      }
    } else {
      // Gemini Voice
      const response = await fetch('/api/agent-forge/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sanitized,
          voiceName: voiceId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini TTS server returned status ${response.status}`);
      }

      const data = await response.json();
      if (data.audio) {
        await playAudioData(data.audio, data.mimeType || 'audio/pcm', data.sampleRate || 24000);
        options?.onEnd?.();
        return;
      }
    }

    throw new Error('No audio in response');
  } catch (err) {
    console.warn('[JARVIS VOICE] Neural TTS failed, using browser speech fallback:', err);
    speakBrowserFallback(sanitized, options);
  }
}

/**
 * Transcribes recorded audio blob via Gemini Multimodal STT backend endpoint
 */
export async function transcribeAudioBlob(audioBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        const response = await fetch('/api/agent-forge/stt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio: base64Data,
            mimeType: audioBlob.type || 'audio/webm',
          }),
        });

        if (!response.ok) {
          throw new Error(`STT server returned status ${response.status}`);
        }

        const data = await response.json();
        resolve(data.transcript || '');
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read audio blob'));
    reader.readAsDataURL(audioBlob);
  });
}
