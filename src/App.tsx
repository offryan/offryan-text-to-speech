import React, { useState, useEffect, useRef } from "react";
import { 
  Volume2, 
  Play, 
  Pause, 
  Download, 
  Languages, 
  Tag, 
  Sliders, 
  Calendar, 
  Bell, 
  Wifi, 
  WifiOff, 
  Star, 
  History, 
  BarChart3, 
  Smartphone, 
  Sun, 
  Moon, 
  RefreshCw, 
  Sparkles,
  FileText,
  VolumeX,
  Plus,
  Lock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Music,
  Globe,
  BookOpen,
  AlertCircle
} from "lucide-react";
import { encryptData, decryptData } from "./utils/crypto";
import { AudioConversion, FavoriteItem, LanguageOption, VoiceOption, PronunciationRule } from "./types";
import AnalyticsPanel from "./components/AnalyticsPanel";
import WidgetsPanel from "./components/WidgetsPanel";
import FavoritesPanel from "./components/FavoritesPanel";
import PronunciationPanel from "./components/PronunciationPanel";

export default function App() {
  // --- Core States ---
  const [text, setText] = useState(() => {
    return localStorage.getItem("tts-autosave-text") || "";
  });
  const [language, setLanguage] = useState("pt-BR");
  const [accent, setAccent] = useState<string | null>(null);
  const [voice, setVoice] = useState("Kore");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Audio state
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [currentAudioText, setCurrentAudioText] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Conversion Progress State
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [conversionError, setConversionError] = useState<string | null>(null);

  // Lists & Local DB
  const [conversions, setConversions] = useState<AudioConversion[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  
  // Daily API Quota / Requests tracking
  const [successfulRequests, setSuccessfulRequests] = useState<number[]>(() => {
    const saved = localStorage.getItem("tts-successful-request-timestamps");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as number[];
        // Filter those in the last 24 hours
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        return parsed.filter(t => t > oneDayAgo);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  
  // Security
  const [passphraseCheck, setPassphraseCheck] = useState("");

  // UI Modes
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [activeTab, setActiveTab] = useState<"home" | "analytics" | "widgets" | "favorites" | "pronunciation">("home");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Pronunciation Dictionary States
  const [pronunciationRules, setPronunciationRules] = useState<PronunciationRule[]>(() => {
    const saved = localStorage.getItem("tts-pronunciation-rules");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { id: "1", original: "Gemini", replaced: "Gêmine", isEnabled: true },
      { id: "2", original: "TTS", replaced: "Ti-Ti-Ésse", isEnabled: true },
      { id: "3", original: "ASMR", replaced: "A-Esse-Eme-Erre", isEnabled: true },
      { id: "4", original: "YouTube", replaced: "Iutúbi", isEnabled: true },
      { id: "5", original: "CTA", replaced: "Cê-Tê-Á", isEnabled: true },
      { id: "6", original: "API", replaced: "A-Pê-Í", isEnabled: true }
    ];
  });
  const [isPronunciationDictEnabled, setIsPronunciationDictEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("tts-pronunciation-dict-enabled");
    return saved !== "false";
  });

  useEffect(() => {
    localStorage.setItem("tts-pronunciation-rules", JSON.stringify(pronunciationRules));
  }, [pronunciationRules]);

  useEffect(() => {
    localStorage.setItem("tts-pronunciation-dict-enabled", String(isPronunciationDictEnabled));
  }, [isPronunciationDictEnabled]);

  useEffect(() => {
    localStorage.setItem("tts-autosave-text", text);
  }, [text]);
  
  // Simulated Notification drawer state
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; desc: string; time: string }>>([
    { id: "1", title: "Criptografia E2E Ativada", desc: "Favoritos e logs locais agora usam proteção criptográfica baseada em senha.", time: "10 min atrás" },
    { id: "2", title: "Offline Pronto", desc: "O aplicativo está totalmente pronto para funcionar sem conexão de internet.", time: "1h atrás" }
  ]);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);

  // HTML Audio Ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Equalization States & Web Audio API Refs
  const [eqPreset, setEqPreset] = useState<"normal" | "clear" | "bass" | "podcast">("normal");
  const [isEqExpanded, setIsEqExpanded] = useState(false);
  const [isFadeInEnabled, setIsFadeInEnabled] = useState(true);
  const [toneMode, setToneMode] = useState<"global" | "inline">("global");

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const lowFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const highFilterRef = useRef<BiquadFilterNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Textarea selection & Segment tagging
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleApplySegmentTag = (tagId: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = text;

    const before = currentText.substring(0, start);
    const selected = currentText.substring(start, end);
    const after = currentText.substring(end);

    let newText = "";
    if (selected.length > 0) {
      newText = `${before}<${tagId}>${selected}</${tagId}>${after}`;
    } else {
      newText = `${before}<${tagId}>Trecho em tom ${tagId}</${tagId}>${after}`;
    }
    setText(newText);

    // Refocus and select
    setTimeout(() => {
      textarea.focus();
      const offset = tagId.length + 2;
      if (selected.length > 0) {
        textarea.setSelectionRange(start + offset, start + offset + selected.length);
      } else {
        textarea.setSelectionRange(start + offset, start + offset + `Trecho em tom ${tagId}`.length);
      }
    }, 50);
  };

  const handleClearInlineTags = () => {
    const cleaned = text.replace(/<\/?[a-zA-Záéíóúâêîôûãõç_-]+>/g, "");
    setText(cleaned);
  };

  // --- Constants ---
  const languages: LanguageOption[] = [
    { code: "pt-BR", name: "Português (Brasil)", flag: "🇧🇷", accents: ["carioca", "paranaense", "paulistano", "nordestino", "baiano", "pernambucano", "cearense", "gaúcho"] },
    { code: "en-US", name: "Inglês (Estados Unidos)", flag: "🇺🇸" },
    { code: "es-ES", name: "Espanhol (Espanha)", flag: "🇪🇸" },
    { code: "fr-FR", name: "Francês (França)", flag: "🇫🇷" },
    { code: "it-IT", name: "Italiano (Itália)", flag: "🇮🇹" },
    { code: "de-DE", name: "Alemão (Alemanha)", flag: "🇩🇪" }
  ];

  const voices: VoiceOption[] = [
    { name: "Kore", gender: "Feminino", style: "Calorosa e Expressiva", description: "Voz acolhedora, ótima para audiolivros e meditações." },
    { name: "Zephyr", gender: "Masculino", style: "Profissional e Confiante", description: "Voz clara e firme, sintonizada através do diretor de voz Charon." },
    { name: "Puck", gender: "Masculino", style: "Amigável e Casual", description: "Tom jovial, excelente para podcasts e conversas cotidianas." },
    { name: "Charon", gender: "Masculino", style: "Profundo e Narrativo", description: "Voz profunda e ressonante, ideal para documentários e drama." },
    { name: "Fenrir", gender: "Feminino", style: "Focada e Precisa", description: "Tom neutro e articulado, excelente para notícias e instruções de voz." },
    { name: "Aoede", gender: "Feminino", style: "Clara e Acolhedora", description: "Voz equilibrada e límpida, excelente para narração dramática e diálogos." }
  ];

  const availableTags = [
    // Classic / Emocional
    { id: "alegre", label: "Alegre", emoji: "😊", category: "classic", description: "Voz feliz, amigável e calorosa" },
    { id: "calma", label: "Calma", emoji: "😌", category: "classic", description: "Tons relaxados, lentos e pacíficos" },
    { id: "confiante", label: "Confiante", emoji: "😎", category: "classic", description: "Postura assertiva, firme e segura" },
    { id: "séria", label: "Séria", emoji: "😐", category: "classic", description: "Tom formal, profissional e direto" },
    { id: "curiosa", label: "Curiosa", emoji: "🤔", category: "classic", description: "Entonação inquisitiva e expressiva" },
    { id: "pausada", label: "Pausada", emoji: "⏱️", category: "classic", description: "Ritmo compassado, ideal para reflexões" },
    { id: "brava", label: "Brava", emoji: "😠", category: "classic", description: "Tons ríspidos, assertivos ou tensos" },
    { id: "animada", label: "Animada", emoji: "🎉", category: "classic", description: "Voz entusiasmada e vibrante" },

    // YouTube / Criação de Vídeos
    { id: "narrativa", label: "Narrativa / Documentário", emoji: "📖", category: "youtube", description: "Tom excelente para contar histórias, biografias e canais informativos" },
    { id: "entusiasmada", label: "Super Entusiasmada (Hooks)", emoji: "⚡", category: "youtube", description: "Alta energia ideal para introduções de vídeos, Shorts, Reels e TikToks" },
    { id: "didática", label: "Didática / Tutorial", emoji: "🎓", category: "youtube", description: "Perfeito para tutoriais explicativos, videoaulas e canais educativos" },
    { id: "suspense", label: "Suspense / Mistério", emoji: "🕵️", category: "youtube", description: "Atmosfera pesada e misteriosa para creepypastas ou mistérios reais" },
    { id: "promocional", label: "Promocional / Patrocínios", emoji: "🎯", category: "youtube", description: "Segmentos de patrocinadores, chamadas de ação (CTA) e reviews de produtos" },
    { id: "vlog", label: "Vlog / Casual", emoji: "📱", category: "youtube", description: "Tom autêntico, amigável e conversacional próximo do ouvinte" },
    { id: "sussurrada", label: "Sussurrada / ASMR", emoji: "🤫", category: "youtube", description: "Sussurros suaves para narrações íntimas ou canais de ASMR" },
    { id: "enérgica", label: "Enérgica / Esportes", emoji: "🔥", category: "youtube", description: "Grande intensidade, ideal para reviews rápidos de tecnologia ou canais esportivos" },
    { id: "intrigante", label: "Intrigante / Curiosidades", emoji: "💡", category: "youtube", description: "Instiga a curiosidade do público, perfeito para listas ou fatos interessantes" },
    { id: "cinematográfica", label: "Cinematográfica / Épica", emoji: "🎬", category: "youtube", description: "Voz profunda com alta dramaticidade dramática" }
  ];

  // --- Initializers & Side Effects ---
  useEffect(() => {
    // 1. Theme matching
    const savedTheme = localStorage.getItem("tts-theme") as "dark" | "light";
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    }

    // 2. Load cached database from localStorage
    const savedConversions = localStorage.getItem("tts-conversions");
    if (savedConversions) setConversions(JSON.parse(savedConversions));

    const savedFavorites = localStorage.getItem("tts-favorites");
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));

    const savedPassphraseCheck = localStorage.getItem("tts-passphrase-check");
    if (savedPassphraseCheck) setPassphraseCheck(savedPassphraseCheck);

    // 3. Online/offline listener
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Update localStorage when database states change
  useEffect(() => {
    localStorage.setItem("tts-conversions", JSON.stringify(conversions));
  }, [conversions]);

  useEffect(() => {
    localStorage.setItem("tts-favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem("tts-successful-request-timestamps", JSON.stringify(successfulRequests));
  }, [successfulRequests]);

  // Periodically clean up timestamps older than 24h
  useEffect(() => {
    const interval = setInterval(() => {
      setSuccessfulRequests((prev) => {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const filtered = prev.filter((t) => t > oneDayAgo);
        if (filtered.length !== prev.length) {
          return filtered;
        }
        return prev;
      });
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (passphraseCheck) {
      localStorage.setItem("tts-passphrase-check", passphraseCheck);
    }
  }, [passphraseCheck]);

  // Apply playback speed directly on audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, currentAudioUrl]);

  // Apply volume directly on audio element or gainNode
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(volume, audioCtxRef.current.currentTime);
    }
  }, [volume, currentAudioUrl]);

  // --- Equalizer Functions ---
  const applyEqPreset = (
    preset: "normal" | "clear" | "bass" | "podcast",
    low = lowFilterRef.current,
    mid = midFilterRef.current,
    high = highFilterRef.current
  ) => {
    if (!low || !mid || !high) return;

    switch (preset) {
      case "normal":
        low.gain.setValueAtTime(0, audioCtxRef.current?.currentTime || 0);
        mid.gain.setValueAtTime(0, audioCtxRef.current?.currentTime || 0);
        high.gain.setValueAtTime(0, audioCtxRef.current?.currentTime || 0);
        break;
      case "clear":
        low.gain.setValueAtTime(-4, audioCtxRef.current?.currentTime || 0);
        mid.gain.setValueAtTime(4, audioCtxRef.current?.currentTime || 0);
        high.gain.setValueAtTime(6, audioCtxRef.current?.currentTime || 0);
        break;
      case "bass":
        low.gain.setValueAtTime(8, audioCtxRef.current?.currentTime || 0);
        mid.gain.setValueAtTime(-1, audioCtxRef.current?.currentTime || 0);
        high.gain.setValueAtTime(-3, audioCtxRef.current?.currentTime || 0);
        break;
      case "podcast":
        low.gain.setValueAtTime(-2, audioCtxRef.current?.currentTime || 0);
        mid.gain.setValueAtTime(6, audioCtxRef.current?.currentTime || 0);
        high.gain.setValueAtTime(2, audioCtxRef.current?.currentTime || 0);
        break;
    }
  };

  const triggerFadeIn = () => {
    if (isFadeInEnabled) {
      if (gainNodeRef.current && audioCtxRef.current) {
        const ctx = audioCtxRef.current;
        const now = ctx.currentTime;
        gainNodeRef.current.gain.cancelScheduledValues(now);
        gainNodeRef.current.gain.setValueAtTime(0, now);
        gainNodeRef.current.gain.linearRampToValueAtTime(volume, now + 0.5);
      } else if (audioRef.current) {
        // Fallback smooth fade-in using interval if AudioContext isn't available/ready yet
        const originalVolume = volume;
        audioRef.current.volume = 0;
        let currentVol = 0;
        const interval = setInterval(() => {
          if (!audioRef.current || !isPlaying) {
            clearInterval(interval);
            return;
          }
          currentVol += 0.05;
          if (currentVol >= originalVolume) {
            audioRef.current.volume = originalVolume;
            clearInterval(interval);
          } else {
            audioRef.current.volume = currentVol;
          }
        }, 50); // 10 steps of 50ms = 0.5s
      }
    } else {
      // Set to normal volume instantly
      if (gainNodeRef.current && audioCtxRef.current) {
        gainNodeRef.current.gain.setValueAtTime(volume, audioCtxRef.current.currentTime);
      } else if (audioRef.current) {
        audioRef.current.volume = volume;
      }
    }
  };

  const initAudioContext = () => {
    if (!audioRef.current) return;
    if (audioCtxRef.current) return; // Already initialized

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      // Create filters
      const lowFilter = ctx.createBiquadFilter();
      lowFilter.type = "lowshelf";
      lowFilter.frequency.value = 150; // Low frequency boundary

      const midFilter = ctx.createBiquadFilter();
      midFilter.type = "peaking";
      midFilter.Q.value = 1.0;
      midFilter.frequency.value = 2000; // Presence range

      const highFilter = ctx.createBiquadFilter();
      highFilter.type = "highshelf";
      highFilter.frequency.value = 6000; // Brilliance range

      // Create GainNode for volume control and fade-in
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);

      // Save refs
      lowFilterRef.current = lowFilter;
      midFilterRef.current = midFilter;
      highFilterRef.current = highFilter;
      gainNodeRef.current = gainNode;

      // Source connection
      // Note: we can only create the media source once!
      const source = ctx.createMediaElementSource(audioRef.current);
      sourceNodeRef.current = source;

      // Connect in series: Source -> Low -> Mid -> High -> GainNode -> Destination
      source.connect(lowFilter);
      lowFilter.connect(midFilter);
      midFilter.connect(highFilter);
      highFilter.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Apply initial gains for the current preset
      applyEqPreset(eqPreset, lowFilter, midFilter, highFilter);
    } catch (e) {
      console.error("Erro ao inicializar Web Audio Context:", e);
    }
  };

  // Apply equalizer preset when state changes
  useEffect(() => {
    applyEqPreset(eqPreset);
  }, [eqPreset]);

  // Auto Reset accent if language is not pt-BR
  useEffect(() => {
    if (language !== "pt-BR") {
      setAccent(null);
    }
  }, [language]);

  // --- Handlers & Helpers ---

  // Play general audio blob url
  const handlePlayAudio = (url: string, textContext: string) => {
    initAudioContext();
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch((e) => console.log("Failed to resume context:", e));
    }
    if (audioRef.current) {
      if (currentAudioUrl === url) {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          audioRef.current.play()
            .then(() => {
              setIsPlaying(true);
              triggerFadeIn();
            })
            .catch((err) => {
              console.log("Play interrupted or prevented:", err);
            });
        }
      } else {
        // Stop current play safely before changing source
        try {
          audioRef.current.pause();
        } catch (e) {}
        setIsPlaying(false);
        
        setCurrentAudioUrl(url);
        setCurrentAudioText(textContext);
        
        // Wait for load, then play
        setTimeout(() => {
          if (audioRef.current) {
            initAudioContext();
            if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
              audioCtxRef.current.resume().catch((e) => console.log("Failed to resume context:", e));
            }
            audioRef.current.playbackRate = playbackSpeed;
            audioRef.current.play()
              .then(() => {
                setIsPlaying(true);
                triggerFadeIn();
              })
              .catch((err) => {
                console.log("Play interrupted on source change:", err);
              });
          }
        }, 150);
      }
    }
  };

  // Apply pronunciation rules from the dictionary to the text
  const applyPronunciationRules = (sourceText: string) => {
    if (!isPronunciationDictEnabled) return sourceText;
    let processed = sourceText;
    
    pronunciationRules.forEach((rule) => {
      if (!rule.isEnabled || !rule.original.trim()) return;
      try {
        const escapedOriginal = rule.original.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const isAlphanumeric = /^[a-zA-Z0-9_À-ÿ]+$/.test(rule.original);
        const regexStr = isAlphanumeric ? `\\b${escapedOriginal}\\b` : escapedOriginal;
        const regex = new RegExp(regexStr, 'gi');
        processed = processed.replace(regex, rule.replaced);
      } catch (e) {
        processed = processed.split(rule.original).join(rule.replaced);
      }
    });
    return processed;
  };

  // Convert Text to Speech calling server route
  const handleConvertText = async (customText?: string) => {
    const textToConvert = customText || text;
    if (!textToConvert || textToConvert.trim().length === 0) {
      addNotification("Campo Vazio", "Por favor, digite algum texto para sintetizar.", "Aviso");
      return;
    }

    if (!isOnline) {
      addNotification("Offline", "Modo offline ativo. Para novas conversões usando a inteligência do Gemini, conecte-se à internet.", "Erro");
      return;
    }

    setIsConverting(true);
    setConversionProgress(5);
    setConversionError(null);

    // Apply pronunciation rules phonetically
    const ttsText = applyPronunciationRules(textToConvert);

    // Simulate progressive conversion stages for awesome visual progress bar feedback
    const interval = setInterval(() => {
      setConversionProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 150);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: ttsText,
          language,
          accent,
          voice,
          tags: selectedTags,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro de servidor ao gerar a fala.");
      }

      const data = await response.json();
      clearInterval(interval);
      setConversionProgress(100);

      // Track successful request for quota visualization
      setSuccessfulRequests((prev) => {
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        return [...prev.filter(t => t > oneDayAgo), now];
      });

      // Create local play URL from base64 WAV
      const playUrl = `data:audio/wav;base64,${data.audio}`;

      const newConversion: AudioConversion = {
        id: Math.random().toString(36).slice(2, 9),
        text: textToConvert,
        language,
        accent,
        voice,
        tags: [...selectedTags],
        audioUrl: playUrl,
        createdAt: new Date().toISOString(),
        charCount: data.charCount || textToConvert.length,
      };

      setConversions((prev) => [newConversion, ...prev]);
      
      // Auto-load and play the created audio safely (stop prior audio first)
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch (e) {}
      }
      setIsPlaying(false);
      setCurrentAudioUrl(playUrl);
      setCurrentAudioText(textToConvert);
      
      setTimeout(() => {
        if (audioRef.current) {
          initAudioContext();
          if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
            audioCtxRef.current.resume().catch((e) => console.log("Failed to resume context:", e));
          }
          audioRef.current.playbackRate = playbackSpeed;
          audioRef.current.play()
            .then(() => {
              setIsPlaying(true);
              triggerFadeIn();
            })
            .catch((err) => {
              console.log("Auto-play interrupted or prevented:", err);
            });
        }
      }, 250);

      addNotification(
        "Sucesso",
        `Fala gerada com sucesso! (${data.charCount} caracteres) usando Gemini 3.1 TTS.`,
        "Sucesso"
      );
    } catch (err: any) {
      clearInterval(interval);
      setConversionError(err.message || "Erro desconhecido.");
      addNotification("Falha na Síntese", err.message || "Erro desconhecido.", "Erro");
    } finally {
      setTimeout(() => {
        setIsConverting(false);
        setConversionProgress(0);
      }, 500);
    }
  };

  // Safe client-side favorite toggler (encrypts text before storing)
  const handleToggleFavorite = (item: AudioConversion) => {
    // If vault password is not set yet, prompt user
    if (!passphraseCheck) {
      setActiveTab("favorites");
      addNotification("Ação Requerida", "Crie sua Senha Mestra no painel de Favoritos primeiro para ativar a criptografia.", "Aviso");
      return;
    }

    // Ask user to unlock vault if it's locked
    const alreadySaved = favorites.some((f) => f.id === item.id);
    if (alreadySaved) {
      setFavorites((prev) => prev.filter((f) => f.id !== item.id));
      addNotification("Removido", "Áudio removido dos favoritos offline.", "Informativo");
      return;
    }

    // Prompt for password check. In a real-world app, we use the active decrypted key.
    // If the favorites panel is locked, we warn that we need it unlocked to safely encrypt.
    const savedPin = prompt("Insira sua Senha Mestra para criptografar e salvar este favorito:");
    if (!savedPin) return;

    const isValid = decryptData(passphraseCheck, savedPin) === "VALID_PASSPHRASE_TEST";
    if (!isValid) {
      alert("Senha mestra incorreta. O favorito não pôde ser criptografado.");
      return;
    }

    // Encrypt the sensitive strings
    const encryptedText = encryptData(item.text, savedPin);
    const encryptedAudio = encryptData(item.audioUrl.replace("data:audio/wav;base64,", ""), savedPin);
    
    const newFavorite: FavoriteItem = {
      id: item.id,
      title: encryptData(item.text.slice(0, 40) + (item.text.length > 40 ? "..." : ""), savedPin),
      encryptedText,
      encryptedAudio,
      language: item.language,
      accent: item.accent,
      voice: item.voice,
      tags: item.tags,
      createdAt: new Date().toISOString()
    };

    setFavorites((prev) => [newFavorite, ...prev]);
    addNotification("Salvo em Segurança", "Fala criptografada offline com sucesso nos seus Favoritos.", "Sucesso");
  };

  // Remove Favorite directly
  const handleDeleteFavorite = (id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    addNotification("Removido", "Favorito removido da carteira de forma irreversível.", "Informativo");
  };

  // Fast phrase from Widget
  const handleQuickConvert = (phrase: string) => {
    setText(phrase);
    setActiveTab("home");
    handleConvertText(phrase);
  };

  // Dynamic system/in-app notification logger
  const addNotification = (title: string, desc: string, type: string) => {
    const newNotif = {
      id: Math.random().toString(36).substring(2, 9),
      title: `[${type}] ${title}`,
      desc,
      time: "Agora mismo",
    };
    setNotifications((prev) => [newNotif, ...prev].slice(0, 10)); // Keep last 10
  };

  // ICS Calendar Scheduler download
  const handleScheduleCalendar = () => {
    if (!text || text.trim().length === 0) {
      addNotification("Agendamento Vazio", "Por favor, insira o texto da narração que deseja agendar.", "Aviso");
      return;
    }

    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
    const dateFormatted = futureDate.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const titleExcerpt = text.slice(0, 30) + "...";
    
    const icsData = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${dateFormatted}`,
      `DTEND:${dateFormatted}`,
      `SUMMARY:Escutar Narração de Texto: ${titleExcerpt}`,
      `DESCRIPTION:Abra seu aplicativo Conversor de Texto em Fala para ouvir: "${text}"`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\n");

    const blob = new Blob([icsData], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agenda_narracao_${Date.now()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addNotification("Sincronizado", "Evento de escuta de voz adicionado à fila. Baixando arquivo .ics para seu calendário.", "Sucesso");
  };

  // Toggle visual tags
  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Toggle Theme
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("tts-theme", newTheme);
  };

  // Render Brazilian accent choices
  const currentLangDetails = languages.find((l) => l.code === language);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
    }`}>
      {/* Hidden Audio element */}
      <audio
        ref={audioRef}
        src={currentAudioUrl || undefined}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

      {/* Primary Container */}
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        
        {/* Navigation / Header */}
        <header className="flex items-center justify-between gap-3 border-b border-slate-800/20 dark:border-slate-800 pb-5 mb-8">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#9146FF] flex items-center justify-center text-white shadow-lg shadow-[#9146FF]/30 shrink-0">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5.5 h-5.5 text-white">
                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight truncate">Twitch.tv/uauryan</h1>
              <p className={`text-xs ${theme === "dark" ? "text-slate-500" : "text-slate-500"} font-medium truncate`}>Github.com/offryan</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Connection state */}
            {/* No celular o selo só aparece offline, para sobrar espaço para o título */}
            <div className={`${isOnline ? "hidden sm:flex" : "flex"} items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isOnline 
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            }`}>
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isOnline ? "Online" : "Modo Offline"}</span>
            </div>

            {/* Simulated Notifications button */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationCenter(!showNotificationCenter)}
                className={`p-2 rounded-xl border transition-colors relative ${
                  theme === "dark" 
                    ? "bg-slate-900 border-slate-800 text-slate-400 hover:text-white" 
                    : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm"
                }`}
              >
                <Bell className="w-4 h-4" />
                <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 ${
                  theme === "dark" ? "border-slate-950" : "border-white"
                }`}></span>
              </button>

              {/* Notification Center Popover */}
              {showNotificationCenter && (
                <div className={`absolute right-0 mt-3 w-80 border rounded-2xl shadow-2xl p-4 z-50 ${
                  theme === "dark" 
                    ? "bg-slate-900 border-slate-800" 
                    : "bg-white border-slate-200 text-slate-800"
                }`}>
                  <div className={`flex justify-between items-center border-b pb-2 mb-3 ${
                    theme === "dark" ? "border-slate-800" : "border-slate-100"
                  }`}>
                    <span className={`text-xs font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>Central de Alertas</span>
                    <button 
                      onClick={() => setNotifications([])}
                      className="text-[10px] text-indigo-500 hover:underline"
                    >
                      Limpar Tudo
                    </button>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">Nenhuma notificação recente.</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`text-xs p-2.5 rounded-xl border ${
                          theme === "dark" ? "bg-slate-950 border-slate-800/60" : "bg-slate-50 border-slate-100"
                        }`}>
                          <div className={`font-semibold flex justify-between ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                            <span>{n.title}</span>
                            <span className="text-[9px] text-slate-400 font-mono">{n.time}</span>
                          </div>
                          <p className={`text-[10px] mt-1 leading-normal ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>{n.desc}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-colors ${
                theme === "dark" 
                  ? "bg-slate-900 border-slate-800 text-slate-400 hover:text-white" 
                  : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm"
              }`}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Tab Selection */}
        <div className={`flex items-center gap-1 sm:gap-1.5 p-1 border rounded-2xl mb-8 max-w-xl ${
          theme === "dark" 
            ? "bg-slate-900 border-slate-800/80" 
            : "bg-slate-200/50 border-slate-200"
        }`}>
          <button
            onClick={() => setActiveTab("home")}
            className={`flex-1 min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-2 px-1 sm:px-3 text-[10px] sm:text-xs font-semibold rounded-xl transition-all ${
              activeTab === "home" 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                : (theme === "dark" ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900")
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            Narração
          </button>
          
          <button
            onClick={() => setActiveTab("favorites")}
            className={`flex-1 min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-2 px-1 sm:px-3 text-[10px] sm:text-xs font-semibold rounded-xl transition-all ${
              activeTab === "favorites" 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                : (theme === "dark" ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900")
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            Favoritos
          </button>

          <button
            onClick={() => setActiveTab("pronunciation")}
            className={`flex-1 min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-2 px-1 sm:px-3 text-[10px] sm:text-xs font-semibold rounded-xl transition-all ${
              activeTab === "pronunciation" 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                : (theme === "dark" ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900")
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Dicionário
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex-1 min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-2 px-1 sm:px-3 text-[10px] sm:text-xs font-semibold rounded-xl transition-all ${
              activeTab === "analytics" 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                : (theme === "dark" ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900")
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Uso
          </button>

          <button
            onClick={() => setActiveTab("widgets")}
            className={`flex-1 min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-2 px-1 sm:px-3 text-[10px] sm:text-xs font-semibold rounded-xl transition-all ${
              activeTab === "widgets" 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                : (theme === "dark" ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900")
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Widgets
          </button>
        </div>

        {/* Primary Workspace Grid */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main TTS Input and controls workspace (when "home" is active) */}
          {activeTab === "home" && (
            <>
              {/* Left Panel: Configuration and Input */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Text Area Card */}
                <div className={`border rounded-3xl p-5 md:p-6 shadow-xl relative ${
                  theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200/80 shadow-md shadow-slate-100/50"
                }`}>
                  <div className="flex justify-between items-center mb-3">
                    <span className={`text-xs font-bold flex items-center gap-1 ${
                      theme === "dark" ? "text-slate-400" : "text-slate-700"
                    }`}>
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      Texto de Entrada
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {text.length} caracteres
                    </span>
                  </div>

                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      if (conversionError) setConversionError(null);
                    }}
                    placeholder="Cole ou digite seu texto aqui para ser narrado instantaneamente pelo motor de voz avançado Gemini 3.1..."
                    rows={6}
                    className={`w-full border rounded-2xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all resize-none ${
                      theme === "dark" 
                        ? "bg-slate-950 border-slate-800/80 text-slate-100 placeholder-slate-500" 
                        : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400"
                    }`}
                  />

                  {conversionError && (
                    <div className={`mt-3.5 p-4 rounded-2xl border text-xs flex flex-col gap-2 ${
                      theme === "dark" 
                        ? "bg-rose-950/20 border-rose-900/45 text-rose-300" 
                        : "bg-rose-50 border-rose-200/80 text-rose-800"
                    }`}>
                      <div className="flex items-center gap-2 font-bold">
                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>Falha na Conversão de Voz</span>
                      </div>
                      <p className="leading-relaxed opacity-90">{conversionError}</p>
                      {(conversionError.includes("cota") || conversionError.includes("quota") || conversionError.includes("429")) && (
                        <div className="text-[11px] mt-1 text-slate-400 dark:text-slate-400/85 leading-relaxed bg-black/10 dark:bg-black/20 p-2.5 rounded-xl border border-black/5 dark:border-white/5">
                          💡 <strong>Nota sobre Cota Gratuita:</strong> O modelo <code>gemini-3.1-flash-tts-preview</code> é extremamente recente e oferece voz hiper-realista gratuitamente, mas possui um limite de <strong>10 conversões por dia por projeto</strong>. Como seu limite foi alcançado hoje, você pode ouvir fatias de áudios já criadas anteriormente no histórico ao lado ou salvar suas narrações preferidas nos Favoritos Criptografados!
                        </div>
                      )}
                    </div>
                  )}

                  {/* Progressive conversion status / feedback */}
                  {isConverting && (
                    <div className="absolute inset-0 bg-slate-950/80 rounded-3xl flex flex-col items-center justify-center p-6 backdrop-blur-sm z-30">
                      <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                      <div className="w-48 bg-slate-800 h-2.5 rounded-full overflow-hidden mb-2">
                        <div 
                          className="bg-indigo-500 h-full rounded-full transition-all duration-300" 
                          style={{ width: `${conversionProgress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-slate-300">
                        Convertendo para Áudio... {conversionProgress}%
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1">
                        Utilizando tecnologia do modelo gemini-3.1-flash-tts-preview
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleScheduleCalendar}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl transition-colors border ${
                          theme === "dark"
                            ? "bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-slate-800"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 shadow-sm"
                        }`}
                        title="Agendar Narração no Calendário"
                      >
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        Agendar Voz (.ics)
                      </button>
                    </div>

                    <button
                      onClick={() => handleConvertText()}
                      disabled={isConverting || text.trim().length === 0}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Sintetizar com Gemini TTS
                    </button>
                  </div>
                </div>

                {/* Configuration controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Speech Customisation & Accents */}
                  <div className={`border rounded-3xl p-5 shadow-xl ${
                    theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200/80 shadow-md shadow-slate-100/50"
                  }`}>
                    <h2 className={`text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider mb-4 ${
                      theme === "dark" ? "text-slate-400" : "text-slate-700"
                    }`}>
                      <Languages className="w-4 h-4 text-indigo-400" />
                      Idioma e Sotaque Regional
                    </h2>

                    <div className="space-y-4">
                      {/* Language Select */}
                      <div>
                        <label className={`block text-[11px] font-semibold mb-1.5 ${
                          theme === "dark" ? "text-slate-500" : "text-slate-600"
                        }`}>
                          Idioma de Origem
                        </label>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className={`w-full text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                            theme === "dark" 
                              ? "bg-slate-950 border-slate-800 text-slate-200" 
                              : "bg-slate-100 border-slate-200 text-slate-800"
                          }`}
                        >
                          {languages.map((l) => (
                            <option key={l.code} value={l.code}>
                              {l.flag} {l.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Brazilian Accents Menu */}
                      {language === "pt-BR" && currentLangDetails?.accents && (
                        <div>
                          <label className={`block text-[11px] font-semibold mb-1.5 ${
                            theme === "dark" ? "text-slate-500" : "text-slate-600"
                          }`}>
                            Sotaque Regional do Brasil
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {currentLangDetails.accents.map((acc) => (
                              <button
                                key={acc}
                                onClick={() => setAccent(accent === acc ? null : acc)}
                                className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg text-left truncate transition-all border ${
                                  accent === acc
                                    ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/40 font-semibold"
                                    : (theme === "dark"
                                        ? "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                                        : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300")
                                }`}
                              >
                                <span className="hidden sm:inline">Sotaque </span>{acc.charAt(0).toUpperCase() + acc.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tone Styles Tags Selector */}
                  <div className={`border rounded-3xl p-5 shadow-xl ${
                    theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200/80 shadow-md shadow-slate-100/50"
                  }`}>
                    <h2 className={`text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider mb-3 ${
                      theme === "dark" ? "text-slate-400" : "text-slate-700"
                    }`}>
                      <Tag className="w-4 h-4 text-indigo-400" />
                      Estúdio de Tons e Modulação
                    </h2>

                    {/* Application Mode Switcher */}
                    <div className={`grid grid-cols-2 gap-1 p-1 rounded-2xl border mb-3.5 ${
                      theme === "dark" ? "bg-slate-950 border-slate-800/80" : "bg-slate-100 border-slate-200"
                    }`}>
                      <button
                        onClick={() => setToneMode("global")}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                          toneMode === "global"
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                            : (theme === "dark" ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900")
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Tom Geral
                      </button>
                      <button
                        onClick={() => setToneMode("inline")}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                          toneMode === "inline"
                            ? "bg-rose-500 text-white shadow-lg shadow-rose-500/10"
                            : (theme === "dark" ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900")
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Tom no Texto
                      </button>
                    </div>

                    {toneMode === "global" ? (
                      <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">
                        🌐 <strong>Modo Geral:</strong> Clique nas tags para selecioná-las como estilos de tom para <strong>todo o áudio</strong> gerado pelo Gemini.
                      </p>
                    ) : (
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          ✍️ <strong>Modo no Texto:</strong> Selecione qualquer palavra ou frase no editor de texto acima e clique nas tags abaixo para modular <strong>apenas aquele trecho</strong>.
                        </p>
                        <button
                          onClick={handleClearInlineTags}
                          className="text-[9px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1.5 rounded-lg border border-rose-500/20 transition-all shrink-0 cursor-pointer"
                          title="Limpa todas as tags de tom inseridas no texto"
                        >
                          Limpar Tags
                        </button>
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* YouTube Category */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            Especial para YouTube & Vídeos
                          </span>
                          <span className="text-[9px] text-slate-500 italic">Vlogs, Shorts e Narrações</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {availableTags.filter(t => t.category === "youtube").map((tag) => {
                            const isSelected = selectedTags.includes(tag.id);
                            return (
                              <button
                                key={tag.id}
                                onClick={() => toneMode === "global" ? handleToggleTag(tag.id) : handleApplySegmentTag(tag.id)}
                                className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-xl transition-all border text-left flex items-center gap-1.5 cursor-pointer ${
                                  toneMode === "global"
                                    ? isSelected
                                      ? "bg-rose-500/10 text-rose-300 border-rose-500 shadow-md shadow-rose-500/5 font-bold"
                                      : (theme === "dark"
                                          ? "bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700"
                                          : "bg-slate-50 text-slate-600 hover:text-rose-600 border-slate-200 hover:border-slate-300 shadow-xs")
                                    : (theme === "dark"
                                        ? "bg-slate-950 text-slate-400 hover:text-rose-300 border-slate-800 hover:border-rose-500/40 hover:bg-rose-500/5"
                                        : "bg-slate-50 text-slate-600 hover:text-rose-600 border-slate-200 hover:border-rose-300 shadow-xs")
                                }`}
                                title={tag.description}
                              >
                                <span>{tag.emoji}</span>
                                <span>{tag.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Classic Category */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            Tons Emocionais Clássicos
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {availableTags.filter(t => t.category === "classic").map((tag) => {
                            const isSelected = selectedTags.includes(tag.id);
                            return (
                              <button
                                key={tag.id}
                                onClick={() => toneMode === "global" ? handleToggleTag(tag.id) : handleApplySegmentTag(tag.id)}
                                className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-xl transition-all border text-left flex items-center gap-1.5 cursor-pointer ${
                                  toneMode === "global"
                                    ? isSelected
                                      ? "bg-indigo-500/15 text-indigo-300 border-indigo-500 shadow-md shadow-indigo-500/5 font-bold"
                                      : (theme === "dark"
                                          ? "bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700"
                                          : "bg-slate-50 text-slate-600 hover:text-indigo-600 border-slate-200 hover:border-slate-300 shadow-xs")
                                    : (theme === "dark"
                                        ? "bg-slate-950 text-slate-400 hover:text-indigo-300 border-slate-800 hover:border-indigo-500/40 hover:bg-indigo-500/5"
                                        : "bg-slate-50 text-slate-600 hover:text-indigo-600 border-slate-200 hover:border-indigo-300 shadow-xs")
                                }`}
                                title={tag.description}
                              >
                                <span>{tag.emoji}</span>
                                <span>{tag.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* Right Panel: Player and Recent History */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Compact Player Card */}
                <div className={`border rounded-3xl p-5 shadow-xl ${
                  theme === "dark" 
                    ? "bg-gradient-to-br from-slate-900 to-indigo-950/40 border-slate-800" 
                    : "bg-gradient-to-br from-white to-indigo-50/25 border-slate-200 shadow-md shadow-indigo-100/30"
                }`}>
                  <h2 className={`text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider mb-4 ${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}>
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    Reprodutor Inteligente
                  </h2>

                  {currentAudioUrl ? (
                    <div className="space-y-4">
                      <p className={`text-xs font-medium line-clamp-2 italic ${
                        theme === "dark" ? "text-slate-300" : "text-slate-700"
                      }`}>
                        "{currentAudioText}"
                      </p>

                      {/* Main play control button */}
                      <div className="flex justify-center items-center gap-4 py-2">
                        <button
                          onClick={() => handlePlayAudio(currentAudioUrl, currentAudioText)}
                          className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 cursor-pointer"
                        >
                          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-0.5" />}
                        </button>

                        <a
                          href={currentAudioUrl}
                          download={`fala_gemini_${Date.now()}.wav`}
                          className={`p-2.5 rounded-xl border transition-all ${
                            theme === "dark" 
                              ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700" 
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 shadow-sm"
                          }`}
                          title="Baixar áudio"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>

                      {/* Progress slider bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>{Math.floor(currentTime / 60)}:{( "0" + Math.floor(currentTime % 60) ).slice(-2)}</span>
                          <span>{duration ? `${Math.floor(duration / 60)}:${( "0" + Math.floor(duration % 60) ).slice(-2)}` : "--:--"}</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={duration || 100}
                          value={currentTime}
                          onChange={(e) => {
                            if (audioRef.current) {
                              audioRef.current.currentTime = parseFloat(e.target.value);
                            }
                          }}
                          className={`w-full accent-indigo-500 h-1 rounded-lg appearance-none cursor-pointer ${
                            theme === "dark" ? "bg-slate-800" : "bg-slate-200"
                          }`}
                        />
                      </div>

                      {/* Volume Controls */}
                      <div className={`pt-2 border-t space-y-2 ${
                        theme === "dark" ? "border-slate-800/60" : "border-slate-200"
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => setVolume((prev) => (prev > 0 ? 0 : 1.0))}
                              className={`p-1.5 rounded-lg border transition-all ${
                                theme === "dark" 
                                  ? "bg-slate-950 hover:bg-slate-800 border-slate-800/60 text-indigo-400 hover:text-indigo-300" 
                                  : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-indigo-600 hover:text-indigo-500 shadow-sm"
                              }`}
                              title={volume === 0 ? "Ativar Áudio" : "Mutar Áudio"}
                            >
                              {volume === 0 ? (
                                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                              ) : (
                                <Volume2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <span className={`text-[10px] font-mono w-8 ${
                              theme === "dark" ? "text-slate-400" : "text-slate-600"
                            }`}>
                              {Math.round(volume * 100)}%
                            </span>
                          </div>
                          <div className="flex-1">
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.01}
                              value={volume}
                              onChange={(e) => setVolume(parseFloat(e.target.value))}
                              className={`w-full accent-indigo-500 h-1 rounded-lg appearance-none cursor-pointer ${
                                theme === "dark" ? "bg-slate-800" : "bg-slate-200"
                              }`}
                            />
                          </div>
                        </div>

                        {/* Fade-In Switch Option */}
                        <div className={`flex items-center justify-between p-1.5 px-2 rounded-xl border ${
                          theme === "dark" 
                            ? "bg-slate-950/40 border-slate-800/50 text-slate-400" 
                            : "bg-slate-50 border-slate-200 text-slate-600"
                        }`}>
                          <span className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Transição Suave (Fade-In 0.5s)
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isFadeInEnabled}
                              onChange={(e) => setIsFadeInEnabled(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className={`w-7 h-4 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white ${
                              theme === "dark" ? "bg-slate-800" : "bg-slate-200"
                            }`}></div>
                          </label>
                        </div>
                      </div>

                      {/* Speed multiplier selector */}
                      <div className={`pt-2 border-t ${theme === "dark" ? "border-slate-800/60" : "border-slate-200"}`}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Velocidade</span>
                          <span className="text-xs font-mono font-bold text-indigo-500">{playbackSpeed.toFixed(2)}x</span>
                        </div>
                        <div className="grid grid-cols-6 gap-1">
                          {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((spd) => (
                            <button
                              key={spd}
                              onClick={() => setPlaybackSpeed(spd)}
                              className={`py-1 text-[10px] font-bold rounded cursor-pointer ${
                                playbackSpeed === spd 
                                  ? "bg-indigo-600 text-white" 
                                  : (theme === "dark" ? "bg-slate-950 text-slate-400 hover:bg-slate-800" : "bg-slate-100 text-slate-600 hover:bg-slate-200")
                              }`}
                            >
                               {spd}x
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Equalizer Presets Panel */}
                      <div className={`pt-2 border-t ${theme === "dark" ? "border-slate-800/60" : "border-slate-200"}`}>
                        <button
                          onClick={() => setIsEqExpanded(!isEqExpanded)}
                          className={`w-full flex justify-between items-center text-[10px] font-bold uppercase tracking-wider transition-colors py-1 cursor-pointer ${
                            theme === "dark" ? "text-slate-500 hover:text-slate-300" : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Equalização</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-mono normal-case font-semibold text-indigo-400">
                              {eqPreset === "normal" && "Padrão"}
                              {eqPreset === "clear" && "Voz Clara"}
                              {eqPreset === "bass" && "Graves Profundos"}
                              {eqPreset === "podcast" && "Foco em Podcast"}
                            </span>
                            {isEqExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </div>
                        </button>

                        {isEqExpanded && (
                          <div className={`mt-2.5 p-2 rounded-xl border space-y-2 animate-fadeIn ${
                            theme === "dark" ? "bg-slate-950/80 border-slate-800/60" : "bg-slate-50 border-slate-200"
                          }`}>
                            <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                              Ajuste o perfil de áudio do reprodutor usando filtros Web Audio em tempo real:
                            </p>
                            <div className="grid grid-cols-1 gap-1.5">
                              <button
                                onClick={() => setEqPreset("normal")}
                                className={`w-full p-2 rounded-lg text-left transition-all border flex items-center justify-between cursor-pointer ${
                                  eqPreset === "normal"
                                    ? "bg-indigo-600/10 border-indigo-500/50 text-indigo-500 font-bold"
                                    : (theme === "dark"
                                        ? "bg-slate-900/40 border-slate-800/40 text-slate-400 hover:bg-slate-900 hover:text-slate-300"
                                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-xs")
                                }`}
                              >
                                <div>
                                  <div className="text-[10px] font-bold flex items-center gap-1">
                                    <Volume2 className="w-3 h-3" />
                                    Som Padrão
                                  </div>
                                  <div className="text-[9px] text-slate-500 mt-0.5">Sem filtros ou coloração adicional</div>
                                </div>
                                {eqPreset === "normal" && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                              </button>

                              <button
                                onClick={() => setEqPreset("clear")}
                                className={`w-full p-2 rounded-lg text-left transition-all border flex items-center justify-between cursor-pointer ${
                                  eqPreset === "clear"
                                    ? "bg-indigo-600/10 border-indigo-500/50 text-indigo-500 font-bold"
                                    : (theme === "dark"
                                        ? "bg-slate-900/40 border-slate-800/40 text-slate-400 hover:bg-slate-900 hover:text-slate-300"
                                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-xs")
                                }`}
                              >
                                <div>
                                  <div className="text-[10px] font-bold flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-amber-500" />
                                    Voz Clara
                                  </div>
                                  <div className="text-[9px] text-slate-500 mt-0.5">Realça agudos/presença e reduz graves barrentos</div>
                                </div>
                                {eqPreset === "clear" && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                              </button>

                              <button
                                onClick={() => setEqPreset("bass")}
                                className={`w-full p-2 rounded-lg text-left transition-all border flex items-center justify-between cursor-pointer ${
                                  eqPreset === "bass"
                                    ? "bg-indigo-600/10 border-indigo-500/50 text-indigo-500 font-bold"
                                    : (theme === "dark"
                                        ? "bg-slate-900/40 border-slate-800/40 text-slate-400 hover:bg-slate-900 hover:text-slate-300"
                                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-xs")
                                }`}
                              >
                                <div>
                                  <div className="text-[10px] font-bold flex items-center gap-1">
                                    <Music className="w-3 h-3 text-indigo-400" />
                                    Graves Profundos
                                  </div>
                                  <div className="text-[9px] text-slate-500 mt-0.5">Aumenta o corpo e adiciona calor nos tons graves</div>
                                </div>
                                {eqPreset === "bass" && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                              </button>

                              <button
                                onClick={() => setEqPreset("podcast")}
                                className={`w-full p-2 rounded-lg text-left transition-all border flex items-center justify-between cursor-pointer ${
                                  eqPreset === "podcast"
                                    ? "bg-indigo-600/10 border-indigo-500/50 text-indigo-500 font-bold"
                                    : (theme === "dark"
                                        ? "bg-slate-900/40 border-slate-800/40 text-slate-400 hover:bg-slate-900 hover:text-slate-300"
                                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-xs")
                                }`}
                              >
                                <div>
                                  <div className="text-[10px] font-bold flex items-center gap-1">
                                    <Sliders className="w-3 h-3 text-teal-500" />
                                    Foco em Podcast
                                  </div>
                                  <div className="text-[9px] text-slate-500 mt-0.5">Médios vocais otimizados com filtro de ruído sutil</div>
                                </div>
                                {eqPreset === "podcast" && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  ) : (
                    <div className={`py-8 text-center rounded-2xl border border-dashed ${
                      theme === "dark" ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}>
                      <VolumeX className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">Aguardando geração de fala...</p>
                    </div>
                  )}
                </div>

                {/* Recent Synthesis History list */}
                <div className={`border rounded-3xl p-5 shadow-xl ${
                  theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200/80 shadow-md shadow-slate-100/50"
                }`}>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className={`text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider ${
                      theme === "dark" ? "text-slate-400" : "text-slate-700"
                    }`}>
                      <History className="w-4 h-4 text-indigo-400" />
                      Recentes Offline
                    </h2>
                    {conversions.length > 0 && (
                      <button
                        onClick={() => {
                          setConversions([]);
                          addNotification("Histórico Limpo", "Logs de conversão foram limpos localmente.", "Informativo");
                        }}
                        className="text-[10px] text-rose-500 hover:underline cursor-pointer font-semibold"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  {conversions.length > 0 && (
                    <div className="mb-4">
                      <input
                        type="text"
                        value={historySearchQuery}
                        onChange={(e) => setHistorySearchQuery(e.target.value)}
                        placeholder="🔍 Buscar no histórico..."
                        className={`w-full border text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                          theme === "dark"
                            ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500"
                            : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400"
                        }`}
                      />
                    </div>
                  )}

                  {conversions.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500">
                      Nenhuma conversão recente salva localmente.
                    </div>
                  ) : conversions.filter((item) => item.text.toLowerCase().includes(historySearchQuery.toLowerCase())).length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500">
                      Nenhum resultado encontrado para "{historySearchQuery}".
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {conversions
                        .filter((item) => item.text.toLowerCase().includes(historySearchQuery.toLowerCase()))
                        .map((item) => (
                          <div
                            key={item.id}
                            className={`p-2.5 rounded-xl flex items-center justify-between gap-3 transition-all group border ${
                              theme === "dark" 
                                ? "bg-slate-950/50 hover:bg-slate-950 border-slate-800/60" 
                                : "bg-slate-50 hover:bg-slate-100/80 border-slate-200 shadow-sm"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-medium truncate ${
                                theme === "dark" ? "text-slate-300 group-hover:text-white" : "text-slate-700 group-hover:text-black"
                              }`}>
                                {item.text}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-500">
                                <span>{item.language}</span>
                                {item.accent && <span>({item.accent})</span>}
                                <span>•</span>
                                <span>{item.charCount} chars</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handlePlayAudio(item.audioUrl, item.text)}
                                className={`p-1 rounded transition-colors cursor-pointer ${
                                  theme === "dark" 
                                    ? "bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white" 
                                    : "bg-slate-200 hover:bg-indigo-600 text-slate-600 hover:text-white"
                                }`}
                                title="Tocar"
                              >
                                <Play className="w-3 h-3 fill-current" />
                              </button>

                              <button
                                onClick={() => handleToggleFavorite(item)}
                                className={`p-1 rounded transition-colors cursor-pointer ${
                                  favorites.some((f) => f.id === item.id)
                                    ? "bg-amber-500/20 text-amber-500"
                                    : (theme === "dark" 
                                        ? "bg-slate-800 hover:bg-amber-500/20 text-slate-500 hover:text-amber-400" 
                                        : "bg-slate-200 hover:bg-amber-500/20 text-slate-500 hover:text-amber-600")
                                }`}
                                title="Salvar Favorito Criptografado"
                              >
                                <Star className="w-3 h-3 fill-current" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Voice Selection Directory */}
                <div className={`border rounded-3xl p-5 shadow-xl ${
                  theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200/80 shadow-md shadow-slate-100/50"
                }`}>
                  <h2 className={`text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider mb-4 ${
                    theme === "dark" ? "text-slate-400" : "text-slate-700"
                  }`}>
                    <Volume2 className="w-4 h-4 text-indigo-400" />
                    Escolha o Diretor de Voz
                  </h2>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {voices.map((v) => (
                      <button
                        key={v.name}
                        onClick={() => {
                          setVoice(v.name);
                          addNotification("Voz Selecionada", `Diretor de voz alterado para: ${v.name}.`, "Informativo");
                        }}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                          voice === v.name
                            ? "bg-indigo-600/10 border-indigo-500/40 text-indigo-500 font-bold"
                            : (theme === "dark"
                                ? "bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-950 hover:border-slate-300 shadow-xs")
                        }`}
                      >
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-xs font-bold">{v.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                            theme === "dark" ? "bg-slate-900 text-slate-500" : "bg-slate-200 text-slate-600"
                          }`}>
                            {v.gender}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{v.style}</p>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </>
          )}

          {/* Sub Panels */}
          {activeTab === "favorites" && (
            <div className="lg:col-span-12">
              <FavoritesPanel 
                favorites={favorites}
                onPlayFavorite={handlePlayAudio}
                onDeleteFavorite={handleDeleteFavorite}
                passphraseCheck={passphraseCheck}
                onSetPassphraseCheck={setPassphraseCheck}
                onImportFavorites={(items, check) => {
                  setFavorites(items);
                  setPassphraseCheck(check);
                }}
                theme={theme}
              />
            </div>
          )}

          {activeTab === "pronunciation" && (
            <div className="lg:col-span-12">
              <PronunciationPanel 
                rules={pronunciationRules}
                onRulesChange={setPronunciationRules}
                isDictEnabled={isPronunciationDictEnabled}
                onToggleDictEnabled={setIsPronunciationDictEnabled}
                theme={theme}
              />
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="lg:col-span-12">
              <AnalyticsPanel 
                conversions={conversions} 
                successfulRequests={successfulRequests}
                onResetQuota={() => {
                  setSuccessfulRequests([]);
                  addNotification("Cota Redefinida", "Histórico de solicitações do dia foi reiniciado.", "Informativo");
                }}
                theme={theme} 
              />
            </div>
          )}

          {activeTab === "widgets" && (
            <div className="lg:col-span-12">
              <WidgetsPanel 
                conversions={conversions}
                favorites={favorites}
                onPlayAudio={handlePlayAudio}
                onQuickConvert={handleQuickConvert}
                isOnline={isOnline}
                theme={theme}
              />
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
