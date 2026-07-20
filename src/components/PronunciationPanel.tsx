import { useState, useMemo, FormEvent } from "react";
import { PronunciationRule } from "../types";
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  Check, 
  BookOpen, 
  HelpCircle, 
  ToggleLeft, 
  ToggleRight,
  Search,
  AlertCircle
} from "lucide-react";

interface PronunciationPanelProps {
  rules: PronunciationRule[];
  onRulesChange: (updatedRules: PronunciationRule[]) => void;
  isDictEnabled: boolean;
  onToggleDictEnabled: (enabled: boolean) => void;
  theme?: "dark" | "light";
}

export default function PronunciationPanel({
  rules,
  onRulesChange,
  isDictEnabled,
  onToggleDictEnabled,
  theme = "dark"
}: PronunciationPanelProps) {
  const [newOriginal, setNewOriginal] = useState("");
  const [newReplaced, setNewReplaced] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Sandbox tester state
  const [sandboxText, setSandboxText] = useState("No meu canal sobre Inteligência Artificial, falaremos sobre o Gemini e a nova API do YouTube.");

  // Predefined cool presets for video creators
  const presets: Omit<PronunciationRule, "id" | "isEnabled">[] = [
    { original: "Gemini", replaced: "Gêmine" },
    { original: "Wi-Fi", replaced: "Uai-Fai" },
    { original: "YouTube", replaced: "Iutúbi" },
    { original: "TTS", replaced: "Ti-Ti-Ésse" },
    { original: "ASMR", replaced: "A-Esse-Eme-Erre" },
    { original: "ChatGPT", replaced: "Tchéti-Gê-Pê-Tê" },
    { original: "Python", replaced: "Paiton" },
    { original: "CEO", replaced: "Ci-Ou" },
    { original: "CTA", replaced: "Cê-Tê-Á" },
    { original: "API", replaced: "A-Pê-Í" },
    { original: "SQL", replaced: "Ésse-Quê-Éle" },
    { original: "GitHub", replaced: "Guitchâbi" }
  ];

  const handleAddRule = (original: string, replaced: string) => {
    if (!original.trim() || !replaced.trim()) return;
    
    // Check if duplicate
    const exists = rules.some(
      (r) => r.original.toLowerCase().trim() === original.toLowerCase().trim()
    );
    if (exists) {
      alert(`O termo "${original}" já existe no seu dicionário de pronúncia.`);
      return;
    }

    const newRule: PronunciationRule = {
      id: Math.random().toString(36).slice(2, 9),
      original: original.trim(),
      replaced: replaced.trim(),
      isEnabled: true,
    };

    onRulesChange([newRule, ...rules]);
  };

  const handleCreateNew = (e: FormEvent) => {
    e.preventDefault();
    handleAddRule(newOriginal, newReplaced);
    setNewOriginal("");
    setNewReplaced("");
  };

  const handleDeleteRule = (id: string) => {
    onRulesChange(rules.filter((r) => r.id !== id));
  };

  const handleToggleRule = (id: string) => {
    onRulesChange(
      rules.map((r) => (r.id === id ? { ...r, isEnabled: !r.isEnabled } : r))
    );
  };

  const handleLoadPresets = () => {
    const existingOriginals = new Set(rules.map((r) => r.original.toLowerCase().trim()));
    const rulesToAdd: PronunciationRule[] = [];

    presets.forEach((p) => {
      if (!existingOriginals.has(p.original.toLowerCase().trim())) {
        rulesToAdd.push({
          id: Math.random().toString(36).slice(2, 9),
          original: p.original,
          replaced: p.replaced,
          isEnabled: true,
        });
      }
    });

    if (rulesToAdd.length === 0) {
      alert("Todos os termos predefinidos já estão no seu dicionário!");
      return;
    }

    onRulesChange([...rulesToAdd, ...rules]);
  };

  // Live tester substitution logic
  const testedText = useMemo(() => {
    if (!isDictEnabled) return sandboxText;
    let processed = sandboxText;
    
    rules.forEach((rule) => {
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
  }, [sandboxText, rules, isDictEnabled]);

  const filteredRules = rules.filter(
    (r) =>
      r.original.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.replaced.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Overview & Global Enable/Disable */}
      <div className={`border rounded-3xl p-5 md:p-6 shadow-xl transition-all ${
        theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200/80 shadow-md shadow-slate-100/50"
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              theme === "dark" ? "bg-indigo-600/10 border-indigo-500/20 text-indigo-400" : "bg-indigo-50 border-indigo-200 text-indigo-600"
            }`}>
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className={`text-base font-bold flex items-center gap-1.5 ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>
                Dicionário de Pronúncia
              </h2>
              <p className={`text-xs leading-relaxed mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                Cadastre siglas, marcas ou termos estrangeiros (ex: 'Gemini' → 'Gêmine') para ensaiar a fonética perfeita no Gemini 3.1 TTS. Útil para garantir que termos técnicos soem naturais.
              </p>
            </div>
          </div>

          <div className={`flex items-center gap-3 p-2 px-3.5 rounded-2xl border shrink-0 self-start md:self-center ${
            theme === "dark" ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
          }`}>
            <span className={`text-xs font-bold ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>Dicionário Ativo:</span>
            <button
              onClick={() => onToggleDictEnabled(!isDictEnabled)}
              className="flex items-center text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
              title={isDictEnabled ? "Desativar Substituições" : "Ativar Substituições"}
            >
              {isDictEnabled ? (
                <ToggleRight className="w-8 h-8 text-indigo-500" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Rule Creator and Listing */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Creator Form */}
          <div className={`border rounded-3xl p-5 shadow-xl transition-all ${
            theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200/80 shadow-md shadow-slate-100/50"
          }`}>
            <h3 className={`text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider mb-4 ${
              theme === "dark" ? "text-slate-400" : "text-slate-700"
            }`}>
              <Plus className="w-4 h-4 text-indigo-400" />
              Novo Termo Fonético
            </h3>

            <form onSubmit={handleCreateNew} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}>
                    Como se escreve (Original)
                  </label>
                  <input
                    type="text"
                    required
                    value={newOriginal}
                    onChange={(e) => setNewOriginal(e.target.value)}
                    placeholder="Ex: Gemini, SQL, Wi-Fi"
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono ${
                      theme === "dark"
                        ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600"
                        : "bg-slate-50 border-slate-200 text-slate-850 placeholder-slate-400"
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}>
                    Como deve soar (Pronúncia)
                  </label>
                  <input
                    type="text"
                    required
                    value={newReplaced}
                    onChange={(e) => setNewReplaced(e.target.value)}
                    placeholder="Ex: Gêmine, Ésse-Quê-Éle, Uai-Fai"
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono ${
                      theme === "dark"
                        ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600"
                        : "bg-slate-50 border-slate-200 text-slate-850 placeholder-slate-400"
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={handleLoadPresets}
                  className={`text-[10px] font-bold flex items-center gap-1 p-2 px-3 rounded-lg border transition-colors cursor-pointer ${
                    theme === "dark"
                      ? "text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/15 border-indigo-500/20"
                      : "text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-200 shadow-xs"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Importar Termos Comuns
                </button>

                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Salvar Termo
                </button>
              </div>
            </form>
          </div>

          {/* Rules List */}
          <div className={`border rounded-3xl p-5 shadow-xl transition-all ${
            theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200/80 shadow-md shadow-slate-100/50"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className={`text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider ${
                theme === "dark" ? "text-slate-400" : "text-slate-700"
              }`}>
                <BookOpen className="w-4 h-4 text-indigo-400" />
                Dicionário Registrado ({filteredRules.length})
              </h3>
              
              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar termo..."
                  className={`w-full border rounded-xl pl-9 pr-3 py-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                    theme === "dark"
                      ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600"
                      : "bg-slate-50 border-slate-200 text-slate-850 placeholder-slate-400"
                  }`}
                />
              </div>
            </div>

            {filteredRules.length === 0 ? (
              <div className={`text-center py-10 rounded-2xl border border-dashed ${
                theme === "dark" ? "bg-slate-950/20 border-slate-800" : "bg-slate-50 border-slate-200"
              }`}>
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-450 font-semibold">Nenhum termo cadastrado.</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto">
                  Crie uma regra fonética acima ou clique em "Importar Termos Comuns" para preencher seu dicionário.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {filteredRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-3 border rounded-xl flex items-center justify-between gap-4 transition-all group ${
                      theme === "dark"
                        ? "bg-slate-950/50 hover:bg-slate-950 border-slate-800/60"
                        : "bg-slate-50 hover:bg-slate-100/80 border-slate-200 shadow-xs"
                    } ${!rule.isEnabled ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Original vs Replaced */}
                      <div className="font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-sans text-[10px] ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>De:</span>
                          <span className={`font-bold transition-colors ${
                            theme === "dark" ? "text-slate-200 group-hover:text-indigo-400" : "text-slate-850 group-hover:text-indigo-650"
                          }`}>
                            {rule.original}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`font-sans text-[10px] ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>Para:</span>
                          <span className="text-emerald-500 font-semibold">{rule.replaced}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleRule(rule.id)}
                        className={`text-[10px] font-bold px-2 py-1 rounded transition-colors cursor-pointer border ${
                          rule.isEnabled
                            ? (theme === "dark"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-emerald-50 text-emerald-700 border-emerald-250")
                            : (theme === "dark"
                                ? "bg-slate-800 text-slate-500 border-slate-800"
                                : "bg-slate-200 text-slate-500 border-slate-300")
                        }`}
                        title={rule.isEnabled ? "Desativar regra" : "Ativar regra"}
                      >
                        {rule.isEnabled ? "Ativo" : "Inativo"}
                      </button>

                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          theme === "dark" ? "text-slate-500 hover:text-rose-400 hover:bg-rose-500/10" : "text-slate-500 hover:text-rose-600 hover:bg-rose-100"
                        }`}
                        title="Excluir regra"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Interactive Sandbox Sandbox / Live Tester */}
        <div className="lg:col-span-5 space-y-6">
          <div className={`border rounded-3xl p-5 shadow-xl transition-all h-full flex flex-col justify-between ${
            theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200/80 shadow-md shadow-slate-100/50"
          }`}>
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className={`text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider ${
                  theme === "dark" ? "text-slate-400" : "text-slate-700"
                }`}>
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Testador Fonético (Sandbox)
                </h3>
                <span className={`text-[9px] border px-2 py-0.5 rounded-full font-bold ${
                  theme === "dark" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-indigo-50 text-indigo-600 border-indigo-200"
                }`}>
                  Tempo Real
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">
                Digite um texto de ensaio abaixo para simular as regras de substituição fonética instantaneamente.
              </p>

              <div className="space-y-4">
                {/* Text area input */}
                <div>
                  <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Texto de Entrada
                  </span>
                  <textarea
                    value={sandboxText}
                    onChange={(e) => setSandboxText(e.target.value)}
                    className={`w-full h-24 border rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all resize-none font-sans ${
                      theme === "dark"
                        ? "bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-600"
                        : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400"
                    }`}
                    placeholder="Digite qualquer coisa contendo os termos do dicionário..."
                  />
                </div>

                {/* Comparative Output */}
                <div>
                  <span className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ${
                    theme === "dark" ? "text-emerald-450" : "text-emerald-700"
                  }`}>
                    Como o Gemini vai ouvir (Phonetic Output)
                  </span>
                  <div className={`w-full min-h-24 max-h-40 overflow-y-auto border font-mono text-[11px] rounded-xl p-3 leading-relaxed whitespace-pre-wrap select-all ${
                    theme === "dark"
                      ? "bg-slate-950 border-emerald-950/50 text-emerald-300"
                      : "bg-emerald-50 border-emerald-200 text-emerald-850"
                  }`}>
                    {testedText}
                  </div>
                </div>
              </div>
            </div>

            <div className={`mt-5 pt-4 border-t text-[10px] text-slate-500 flex items-start gap-2 leading-relaxed ${
              theme === "dark" ? "border-slate-800/60" : "border-slate-100"
            }`}>
              <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                <strong>Atenção:</strong> Ao gerar a narração, o app substituirá os termos automaticamente antes de enviar o roteiro à API. Seus roteiros originais permanecem limpos e inalterados.
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
