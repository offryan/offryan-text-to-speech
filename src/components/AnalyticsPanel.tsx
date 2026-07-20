import { useMemo, useState, useEffect } from "react";
import { AudioConversion } from "../types";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  Cell
} from "recharts";
import { 
  BarChart3, 
  FileSpreadsheet, 
  FileDown, 
  Clock, 
  Sparkles, 
  Globe, 
  Activity,
  TrendingUp,
  AlertCircle,
  RotateCcw,
  Zap,
  ShieldCheck
} from "lucide-react";

interface AnalyticsPanelProps {
  conversions: AudioConversion[];
  successfulRequests?: number[];
  onResetQuota?: () => void;
  theme?: "dark" | "light";
}

export default function AnalyticsPanel({ 
  conversions, 
  successfulRequests = [], 
  onResetQuota, 
  theme = "dark" 
}: AnalyticsPanelProps) {
  // Resolve actual request history in last 24h
  const resolvedRequests = useMemo(() => {
    if (successfulRequests && successfulRequests.length > 0) {
      return [...successfulRequests].sort((a, b) => a - b);
    }
    // Fallback: derive from conversions
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return conversions
      .map((c) => new Date(c.createdAt).getTime())
      .filter((t) => t > oneDayAgo)
      .sort((a, b) => a - b);
  }, [successfulRequests, conversions]);

  const totalLimit = 10;
  const usedCount = resolvedRequests.length;
  const remainingCount = Math.max(0, totalLimit - usedCount);
  const percentageUsed = Math.min(100, (usedCount / totalLimit) * 100);

  const oldestTimestamp = resolvedRequests.length > 0 ? resolvedRequests[0] : null;
  const [countdownText, setCountdownText] = useState("");

  useEffect(() => {
    if (!oldestTimestamp) {
      setCountdownText("");
      return;
    }

    const updateCountdown = () => {
      const nextAvailableTime = oldestTimestamp + 24 * 60 * 60 * 1000;
      const msLeft = nextAvailableTime - Date.now();
      
      if (msLeft <= 0) {
        setCountdownText("Disponível agora");
      } else {
        const hours = Math.floor(msLeft / (1000 * 60 * 60));
        const minutes = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((msLeft % (1000 * 60)) / 1000);
        
        const parts = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
        parts.push(`${seconds}s`);
        
        setCountdownText(parts.join(" "));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [oldestTimestamp, resolvedRequests]);

  // 1. Calculate general stats
  const stats = useMemo(() => {
    const totalConversions = conversions.length;
    const totalChars = conversions.reduce((sum, item) => sum + item.charCount, 0);
    const avgChars = totalConversions > 0 ? Math.round(totalChars / totalConversions) : 0;
    
    // Estimate audio duration (1 char ≈ 0.08 seconds of speech at standard speed)
    const estimatedDurationSecs = totalChars * 0.075;
    const minutes = Math.floor(estimatedDurationSecs / 60);
    const seconds = Math.round(estimatedDurationSecs % 60);
    
    return {
      totalConversions,
      totalChars,
      avgChars,
      estimatedDuration: `${minutes}m ${seconds}s`,
      rawDurationSecs: estimatedDurationSecs
    };
  }, [conversions]);

  // 2. Group by Language for Bar Chart
  const languageData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    conversions.forEach((item) => {
      counts[item.language] = (counts[item.language] || 0) + item.charCount;
    });

    const langNames: { [key: string]: string } = {
      "pt-BR": "Português (BR)",
      "en-US": "Inglês (US)",
      "es-ES": "Espanhol (ES)",
      "fr-FR": "Francês (FR)",
      "it-IT": "Italiano (IT)",
      "de-DE": "Alemão (DE)",
    };

    return Object.keys(counts).map((key) => ({
      name: langNames[key] || key,
      characters: counts[key],
    }));
  }, [conversions]);

  // 3. Generate last 10 days of metrics for Area Chart
  const historyData = useMemo(() => {
    const metricsMap: { [key: string]: number } = {};
    
    // Seed last 10 days
    for (let i = 9; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split("T")[0];
      metricsMap[dateString] = 0;
    }

    // Populate actuals
    conversions.forEach((item) => {
      const datePart = item.createdAt.split("T")[0];
      if (metricsMap[datePart] !== undefined) {
        metricsMap[datePart] += item.charCount;
      }
    });

    return Object.keys(metricsMap).map((date) => {
      const [_, month, day] = date.split("-");
      return {
        date: `${day}/${month}`,
        "Caracteres": metricsMap[date],
      };
    });
  }, [conversions]);

  // 4. Color Palette for charts
  const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#3b82f6"];

  // 5. CSV Export function
  const handleExportCSV = () => {
    if (conversions.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Data,Idioma,Sotaque,Voz,Caracteres,Estilo,Texto\n";
    
    conversions.forEach((c) => {
      const row = [
        c.id,
        c.createdAt.split("T")[0],
        c.language,
        c.accent || "Nenhum",
        c.voice,
        c.charCount,
        c.tags.join(";"),
        `"${c.text.replace(/"/g, '""').slice(0, 100)}..."`
      ].join(",");
      csvContent += row + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_tts_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 6. Print friendly view of report
  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div id="analytics-panel" className={`border rounded-3xl p-6 shadow-2xl transition-all ${
      theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200/80 shadow-md shadow-slate-100/50 text-slate-800"
    }`}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b pb-5 ${
        theme === "dark" ? "border-slate-800" : "border-slate-100"
      }`}>
        <div>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-slate-850"}`}>
            <Activity className="w-5 h-5 text-indigo-400" />
            Painel Analítico de Uso
          </h2>
          <p className={`text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
            Métricas de conversão de texto em fala e relatório mensal de dados offline.
          </p>
        </div>
        
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleExportCSV}
            disabled={conversions.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium rounded-lg transition-colors border cursor-pointer ${
              theme === "dark"
                ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200 shadow-xs"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            Exportar CSV
          </button>
          
          <button
            onClick={handleExportPDF}
            disabled={conversions.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              theme === "dark"
                ? "bg-indigo-950/40 hover:bg-indigo-900/40 border-indigo-500/20 text-indigo-300"
                : "bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-600 shadow-xs"
            }`}
          >
            <FileDown className="w-4 h-4 text-indigo-450" />
            Imprimir PDF
          </button>
        </div>
      </div>

      {/* Monitor de Cota do Gemini TTS */}
      <div className={`p-5 md:p-6 rounded-3xl border mb-6 transition-all ${
        theme === "dark" 
          ? "bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/25 border-slate-800" 
          : "bg-gradient-to-br from-slate-50 via-white to-indigo-50/20 border-slate-200 shadow-xs"
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <span className={`text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 ${
              theme === "dark" ? "text-indigo-400" : "text-indigo-600"
            }`}>
              <Zap className="w-3.5 h-3.5 animate-pulse" />
              Monitoramento de Cota Diária (Gemini TTS)
            </span>
            <h3 className={`text-lg font-bold mt-1 leading-tight ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
              Cota Diária Gratuita do Modelo
            </h3>
            <p className="text-xs text-slate-450 dark:text-slate-500 mt-1 leading-relaxed max-w-xl">
              O motor de voz hiper-realista da API Gemini limita solicitações do modelo <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-[11px] font-mono border border-slate-200/50 dark:border-white/5">gemini-3.1-flash-tts-preview</code> a um limite gratuito de <strong>10 requisições a cada 24 horas</strong>.
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0 self-start md:self-auto">
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-extrabold font-mono tracking-tight ${
                remainingCount === 0 
                  ? "text-rose-500" 
                  : remainingCount <= 3 
                    ? "text-amber-500" 
                    : theme === "dark" ? "text-indigo-300" : "text-indigo-650"
              }`}>
                {usedCount}
              </span>
              <span className="text-slate-500 dark:text-slate-500 text-sm font-medium">/ 10</span>
              <span className="text-xs text-slate-405 dark:text-slate-450 ml-2 font-semibold">requisições feitas</span>
            </div>

            {onResetQuota && (
              <button
                onClick={onResetQuota}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer border ${
                  theme === "dark" 
                    ? "bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200" 
                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700 shadow-2xs"
                }`}
                title="Redefinir contador de cota local para testes"
              >
                <RotateCcw className="w-3 h-3" />
                Redefinir Cota Local
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="space-y-2.5">
          <div className="relative w-full h-4 bg-slate-200 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-300/20 dark:border-black/50">
            <div 
              style={{ width: `${percentageUsed}%` }}
              className={`h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r ${
                percentageUsed >= 100 
                  ? "from-rose-600 to-rose-500 shadow-inner" 
                  : percentageUsed >= 70 
                    ? "from-amber-500 to-rose-500" 
                    : "from-indigo-600 via-indigo-500 to-violet-500"
              }`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs">
            <div className="flex items-center gap-1.5">
              {remainingCount === 0 ? (
                <span className="flex items-center gap-1 text-rose-500 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Limite diário alcançado!
                </span>
              ) : (
                <span className={`font-semibold flex items-center gap-1 ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  {remainingCount} requisições ainda disponíveis
                </span>
              )}
            </div>

            {/* Countdown / Expiration feedback */}
            {usedCount > 0 && (
              <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[11px] bg-slate-100 dark:bg-slate-950/60 px-3 py-1 rounded-xl border border-slate-200/50 dark:border-white/5">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {percentageUsed >= 100 
                    ? "Bloqueado temporariamente. Próxima liberação em: " 
                    : "Tempo para recuperar slot mais antigo: "}
                  <strong className="font-mono text-indigo-500 dark:text-indigo-400 font-bold">{countdownText || "Calculando..."}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cards - Stats overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-2xl border transition-all ${
          theme === "dark" ? "bg-slate-950/50 border-slate-800" : "bg-slate-50 border-slate-200/60 shadow-xs"
        }`}>
          <div className="flex justify-between items-center mb-2">
            <span className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Conversões</span>
            <Sparkles className="w-4 h-4 text-blue-400" />
          </div>
          <div className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-slate-850"}`}>{stats.totalConversions}</div>
          <div className={`text-[10px] mt-1 ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>Total de áudios gerados</div>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          theme === "dark" ? "bg-slate-950/50 border-slate-800" : "bg-slate-50 border-slate-200/60 shadow-xs"
        }`}>
          <div className="flex justify-between items-center mb-2">
            <span className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Total Caracteres</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-slate-850"}`}>
            {stats.totalChars.toLocaleString()}
          </div>
          <div className={`text-[10px] mt-1 ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>Processados pelo Gemini TTS</div>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          theme === "dark" ? "bg-slate-950/50 border-slate-800" : "bg-slate-50 border-slate-200/60 shadow-xs"
        }`}>
          <div className="flex justify-between items-center mb-2">
            <span className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Tamanho Médio</span>
            <Globe className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-slate-850"}`}>{stats.avgChars}</div>
          <div className={`text-[10px] mt-1 ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>Caracteres por fala</div>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          theme === "dark" ? "bg-slate-950/50 border-slate-800" : "bg-slate-50 border-slate-200/60 shadow-xs"
        }`}>
          <div className="flex justify-between items-center mb-2">
            <span className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Tempo de Narração</span>
            <Clock className="w-4 h-4 text-amber-450" />
          </div>
          <div className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-slate-850"}`}>{stats.estimatedDuration}</div>
          <div className={`text-[10px] mt-1 ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>Tempo estimado de reprodução</div>
        </div>
      </div>

      {conversions.length === 0 ? (
        <div className={`text-center py-12 rounded-2xl border border-dashed ${
          theme === "dark" ? "bg-slate-950/30 border-slate-800" : "bg-slate-50 border-slate-200"
        }`}>
          <BarChart3 className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">Nenhum dado analítico disponível ainda.</p>
          <p className="text-xs text-slate-400 mt-1">Gere sua primeira conversão para ver os gráficos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* History Chart */}
          <div className={`p-4 rounded-2xl border transition-all lg:col-span-7 ${
            theme === "dark" ? "bg-slate-950/30 border-slate-800/80" : "bg-slate-50/50 border-slate-200 shadow-xs"
          }`}>
            <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
              Volume de Conversão Recente (Caracteres)
            </h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorChars" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    stroke={theme === "dark" ? "#475569" : "#94a3b8"} 
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke={theme === "dark" ? "#475569" : "#94a3b8"} 
                    fontSize={10}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff",
                      borderColor: theme === "dark" ? "#1e293b" : "#e2e8f0",
                      borderRadius: "12px",
                      color: theme === "dark" ? "#fff" : "#1e293b",
                      fontSize: "11px"
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Caracteres" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorChars)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Language Breakdown */}
          <div className={`p-4 rounded-2xl border transition-all lg:col-span-5 ${
            theme === "dark" ? "bg-slate-950/30 border-slate-800/80" : "bg-slate-50/50 border-slate-200 shadow-xs"
          }`}>
            <h3 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
              Uso por Idioma (Caracteres)
            </h3>
            {languageData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-xs text-slate-400">
                Aguardando dados...
              </div>
            ) : (
              <div className="h-60 w-full flex flex-col justify-between">
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={languageData} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
                      <XAxis type="number" stroke={theme === "dark" ? "#475569" : "#94a3b8"} fontSize={10} hide />
                      <YAxis dataKey="name" type="category" stroke={theme === "dark" ? "#94a3b8" : "#475569"} fontSize={11} tickLine={false} width={100} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff",
                          borderColor: theme === "dark" ? "#1e293b" : "#e2e8f0",
                          borderRadius: "12px",
                          color: theme === "dark" ? "#fff" : "#1e293b",
                          fontSize: "11px"
                        }}
                      />
                      <Bar dataKey="characters" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                        {languageData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className={`border-t pt-3 text-[11px] ${
                  theme === "dark" ? "border-slate-800/60 text-slate-400" : "border-slate-200 text-slate-500"
                }`}>
                  <div className="flex justify-between">
                    <span>Custo Estimado na API:</span>
                    <span className="font-mono text-emerald-500 font-semibold">Grátis (Preview)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
