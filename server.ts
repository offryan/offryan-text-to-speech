import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy loaded Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please configure it in your Secrets / Environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Utility to write a 44-byte WAV header for 24000 Hz, 16-bit, Mono PCM data
function addWavHeader(pcmBuffer: Buffer, sampleRate: number = 24000): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmBuffer.length;

  const header = Buffer.alloc(44);

  // RIFF identifier
  header.write("RIFF", 0);
  // File length (36 + data size)
  header.writeUInt32LE(36 + dataSize, 4);
  // RIFF type
  header.write("WAVE", 8);
  // Format chunk identifier
  header.write("fmt ", 12);
  // Format chunk length (16)
  header.writeUInt32LE(16, 16);
  // Sample format (raw PCM = 1)
  header.writeUInt16LE(1, 20);
  // Channel count
  header.writeUInt16LE(numChannels, 22);
  // Sample rate
  header.writeUInt32LE(sampleRate, 24);
  // Byte rate
  header.writeUInt32LE(byteRate, 28);
  // Block align
  header.writeUInt16LE(blockAlign, 32);
  // Bits per sample (16)
  header.writeUInt16LE(bitsPerSample, 34);
  // Data chunk identifier
  header.write("data", 36);
  // Data chunk length
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// API: TTS endpoint
app.post("/api/tts", async (req, res) => {
  try {
    const { text, language, accent, voice, tags } = req.body;

    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "O campo 'text' é obrigatório e deve ser uma string." });
      return;
    }

    const ai = getGeminiClient();

    // Construct precise prompt instruction
    let promptInstruction = "";
    if (language === "pt-BR") {
      promptInstruction += "Diga o texto a seguir em português do Brasil";
      if (accent) {
        promptInstruction += ` com o sotaque regional ${accent}`;
      }
    } else if (language === "en-US") {
      promptInstruction += "Say the following text in standard American English";
    } else if (language === "es-ES") {
      promptInstruction += "Diga el siguiente texto en español de España";
    } else if (language === "fr-FR") {
      promptInstruction += "Dites le texte suivant en français";
    } else if (language === "it-IT") {
      promptInstruction += "Dici il seguente testo in italiano";
    } else if (language === "de-DE") {
      promptInstruction += "Sprechen Sie den folgenden Text auf Deutsch";
    } else {
      promptInstruction += `Speak the following text in ${language || "the requested language"}`;
    }

    if (tags && Array.isArray(tags) && tags.length > 0) {
      promptInstruction += ` com as características e estilos de tom geral: ${tags.join(", ")}`;
    }

    promptInstruction += `. ATENÇÃO: O texto a seguir pode conter tags XML contendo trechos com instruções de entonação específicas, como por exemplo \`<suspense>texto</suspense>\`, \`<narrativa>texto</narrativa>\`, \`<entusiasmada>texto</entusiasmada>\`, \`<didatica>texto</didatica>\`, \`<sussurrada>texto</sussurrada>\`, \`<calma>texto</calma>\`, etc. Você deve ler os trechos envoltos nessas tags adotando rigorosamente a entonação indicada pelo nome da tag, variando dinamicamente o tom de voz para simular um narrador de vídeos do YouTube altamente profissional, e NUNCA pronunciar as tags em si. Remova as tags antes de falar. Texto: "${text}"`;

    // Validate voice name to avoid API errors (Gemini TTS officially supports: Kore, Puck, Charon, Fenrir, Zephyr)
    const supportedVoices = ["Kore", "Puck", "Charon", "Fenrir", "Zephyr"];
    let finalVoice = voice || "Kore";
    
    // Map custom/unsupported voices from frontend to official Gemini voices
    if (finalVoice === "Aoede") {
      finalVoice = "Kore"; // Fallback to "Kore" (female)
    } else if (!supportedVoices.includes(finalVoice)) {
      finalVoice = "Kore"; // Fallback to safe default
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: promptInstruction }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: finalVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      res.status(500).json({ error: "A API do Gemini não retornou dados de áudio válidos." });
      return;
    }

    // Convert raw PCM Base64 to a Buffer, inject WAV header, and return back
    const pcmBuffer = Buffer.from(base64Audio, "base64");
    const wavBuffer = addWavHeader(pcmBuffer, 24000); // Gemini TTS sample rate is 24kHz
    const base64Wav = wavBuffer.toString("base64");

    res.json({
      audio: base64Wav,
      format: "audio/wav",
      sampleRate: 24000,
      charCount: text.length,
    });
  } catch (error: any) {
    console.error("Erro no TTS:", error);
    
    let userFriendlyError = error.message || "Erro desconhecido na geração do áudio.";
    
    try {
      // If error message is a stringified Google API error containing JSON, parse it
      const errStr = error.message ? String(error.message).trim() : "";
      if (errStr.startsWith("{") || errStr.includes('"error"')) {
        // Extract json substring if there's any prefix
        const jsonStart = errStr.indexOf("{");
        const jsonEnd = errStr.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const jsonStr = errStr.substring(jsonStart, jsonEnd + 1);
          const parsed = JSON.parse(jsonStr);
          const innerError = parsed.error || parsed;
          
          if (innerError) {
            if (innerError.code === 429 || String(innerError.message).includes("quota")) {
              userFriendlyError = "Limite diário de cota do Gemini TTS excedido (máximo de 10 conversões gratuitas por dia por projeto). Por favor, tente novamente mais tarde.";
            } else if (innerError.message) {
              userFriendlyError = `Erro da API Gemini: ${innerError.message}`;
            }
          }
        }
      } else if (String(error.message).toLowerCase().includes("quota") || String(error.message).includes("429")) {
        userFriendlyError = "Limite diário de cota do Gemini TTS excedido (máximo de 10 conversões gratuitas por dia por projeto). Por favor, tente novamente mais tarde.";
      }
    } catch (e) {
      // Fallback to original message if parsing fails
    }
    
    res.status(500).json({
      error: userFriendlyError,
    });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[TTS Server] rodando em http://localhost:${PORT}`);
  });
}

startServer();
