export interface AudioConversion {
  id: string;
  text: string;
  language: string;
  accent: string | null;
  voice: string;
  tags: string[];
  audioUrl: string; // base64 formatted audio/wav
  createdAt: string;
  charCount: number;
}

export interface FavoriteItem {
  id: string;
  title: string;
  encryptedText: string; // Encrypted text content
  encryptedAudio: string; // Encrypted base64 audio
  language: string;
  accent: string | null;
  voice: string;
  tags: string[];
  createdAt: string;
}

export interface UsageMetric {
  date: string; // YYYY-MM-DD
  charCount: number;
  durationSeconds: number;
  conversionsCount: number;
}

export interface NotificationSetting {
  id: string;
  title: string;
  enabled: boolean;
  time: string;
}

export interface VoiceOption {
  name: string;
  gender: "Masculino" | "Feminino";
  style: string;
  description: string;
}

export interface LanguageOption {
  code: string;
  name: string;
  flag: string;
  accents?: string[];
}

export interface PronunciationRule {
  id: string;
  original: string;
  replaced: string;
  isEnabled: boolean;
}

