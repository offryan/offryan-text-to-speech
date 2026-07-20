import { Play, Star, Sparkles, Smartphone, ArrowRight, Activity } from "lucide-react";
import { AudioConversion, FavoriteItem } from "../types";

interface WidgetsPanelProps {
  conversions: AudioConversion[];
  favorites: FavoriteItem[];
  onPlayAudio: (audioUrl: string, text: string) => void;
  onQuickConvert: (text: string) => void;
  isOnline: boolean;
  theme?: "dark" | "light";
}

export default function WidgetsPanel({
  conversions,
  favorites,
  onPlayAudio,
  onQuickConvert,
  isOnline,
  theme = "dark"
}: WidgetsPanelProps) {
  const lastConversion = conversions[0];
  const featuredFavorite = favorites[0];

  const quickPhrases = [
    { text: "Bem-vindo ao aplicativo de áudio do Gemini!", label: "Bem-vindo" },
    { text: "Lembrete: Mantenha-se focado e produtivo hoje.", label: "Lembrete Diário" },
    { text: "Seu áudio criptografado está pronto para reprodução offline.", label: "Status Cripto" },
  ];

  return (
    <div className={`border rounded-3xl p-6 shadow-2xl transition-all ${
      theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200/80 shadow-md shadow-slate-100/50 text-slate-800"
    }`}>
      <div className={`flex items-center gap-2 mb-4 border-b pb-4 ${
        theme === "dark" ? "border-slate-800" : "border-slate-100"
      }`}>
        <Smartphone className="w-5 h-5 text-indigo-400" />
        <div>
          <h2 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-slate-850"}`}>Simulador de Widgets</h2>
          <p className={`text-[11px] ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
            Acesso ultra rápido às funcionalidades da sua tela de início do smartphone.
          </p>
        </div>
      </div>

      <div className={`p-4 rounded-2xl border relative overflow-hidden ${
        theme === "dark" ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
      }`}>
        {/* Phone screen background layout */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Sua Tela Inicial
          </span>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-rose-500"}`}></span>
            <span className="text-[10px] text-slate-450 font-mono font-medium">
              {isOnline ? "Widget Link Ativo" : "Modo Offline"}
            </span>
          </div>
        </div>

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Widget 1: Last Speech Mini Player */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${
            theme === "dark" 
              ? "bg-slate-900 border-slate-800 hover:border-slate-700" 
              : "bg-white border-slate-200 shadow-xs hover:border-slate-300"
          }`}>
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                Última Narração
              </span>
              <Play className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {lastConversion ? (
              <div>
                <p className={`text-xs font-medium line-clamp-2 mb-3 ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                  "{lastConversion.text}"
                </p>
                <button
                  onClick={() => onPlayAudio(lastConversion.audioUrl, lastConversion.text)}
                  className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-[11px] font-medium text-white rounded-lg transition-all cursor-pointer shadow-sm"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Reproduzir Agora
                </button>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-xs text-slate-500">Nenhum áudio gerado ainda</p>
              </div>
            )}
          </div>

          {/* Widget 2: Action Trigger / Quick templates */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${
            theme === "dark" 
              ? "bg-slate-900 border-slate-800 hover:border-slate-700" 
              : "bg-white border-slate-200 shadow-xs hover:border-slate-300"
          }`}>
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-bold text-emerald-650 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Atalhos Rápidos
              </span>
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            </div>

            <div className="space-y-1.5">
              {quickPhrases.map((phrase, idx) => (
                <button
                  key={idx}
                  onClick={() => onQuickConvert(phrase.text)}
                  className={`w-full text-left flex items-center justify-between p-2 rounded-lg transition-colors group cursor-pointer ${
                    theme === "dark" 
                      ? "bg-slate-950 hover:bg-slate-850 text-slate-300" 
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/50"
                  }`}
                >
                  <span className="truncate">{phrase.label}</span>
                  <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-emerald-500 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Widget 3: Quick Favorite Loop */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${
            theme === "dark" 
              ? "bg-slate-900 border-slate-800 hover:border-slate-700" 
              : "bg-white border-slate-200 shadow-xs hover:border-slate-300"
          }`}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Favorito Rápido
              </span>
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            </div>

            {featuredFavorite ? (
              <div>
                <p className={`text-xs font-semibold truncate mb-1 ${theme === "dark" ? "text-white" : "text-slate-850"}`}>
                  {featuredFavorite.title}
                </p>
                <div className="flex gap-1 mb-3">
                  {featuredFavorite.tags.map((tag) => (
                    <span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded ${
                      theme === "dark" ? "bg-slate-950 text-slate-400" : "bg-slate-100 text-slate-550 border border-slate-200/50"
                    }`}>
                      #{tag}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => onPlayAudio(featuredFavorite.encryptedAudio, featuredFavorite.title)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-[11px] font-medium text-slate-950 rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Ouvir Favorito
                </button>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-xs text-slate-500">Adicione aos favoritos para acesso rápido</p>
              </div>
            )}
          </div>

          {/* Widget 4: Quick Telemetry status */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${
            theme === "dark" 
              ? "bg-slate-900 border-slate-800 hover:border-slate-700" 
              : "bg-white border-slate-200 shadow-xs hover:border-slate-300"
          }`}>
            <div className="flex justify-between items-start mb-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                theme === "dark" ? "bg-slate-950 border-slate-800 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-500"
              }`}>
                Métricas Globais
              </span>
              <Activity className="w-3.5 h-3.5 text-slate-400" />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className={`p-2 rounded-lg text-center ${theme === "dark" ? "bg-slate-950" : "bg-slate-50 border border-slate-100"}`}>
                <div className="text-[9px] text-slate-400 font-semibold">Áudios</div>
                <div className={`text-sm font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>{conversions.length}</div>
              </div>
              <div className={`p-2 rounded-lg text-center ${theme === "dark" ? "bg-slate-950" : "bg-slate-50 border border-slate-100"}`}>
                <div className="text-[9px] text-slate-400 font-semibold">Favoritos</div>
                <div className={`text-sm font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>{favorites.length}</div>
              </div>
            </div>

            <p className="text-[9px] text-center text-slate-450 mt-2 font-medium">
              Criptografia E2E Ativada de Ponta a Ponta
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
