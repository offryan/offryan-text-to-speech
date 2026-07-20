import { useState, ChangeEvent } from "react";
import { FavoriteItem } from "../types";
import { encryptData, decryptData, generatePassphraseCheck, validatePassphrase } from "../utils/crypto";
import { 
  Lock, 
  Unlock, 
  Key, 
  Star, 
  Trash2, 
  Play, 
  Download, 
  CloudUpload, 
  CloudDownload, 
  Copy, 
  Check,
  FolderLock
} from "lucide-react";

interface FavoritesPanelProps {
  favorites: FavoriteItem[];
  onPlayFavorite: (audioBase64: string, title: string) => void;
  onDeleteFavorite: (id: string) => void;
  onImportFavorites: (items: FavoriteItem[], passphraseCheck: string) => void;
  passphraseCheck: string; // From parent state to validate passwords
  onSetPassphraseCheck: (check: string) => void;
  theme?: "dark" | "light";
}

export default function FavoritesPanel({
  favorites,
  onPlayFavorite,
  onDeleteFavorite,
  onImportFavorites,
  passphraseCheck,
  onSetPassphraseCheck,
  theme = "dark"
}: FavoritesPanelProps) {
  const [passphrase, setPassphrase] = useState("");
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [copiedBackup, setCopiedBackup] = useState(false);

  // Unlock existing vault or set initial passphrase
  const handleToggleVault = () => {
    if (vaultUnlocked) {
      // Lock
      setVaultUnlocked(false);
      setPassphrase("");
      setErrorMessage("");
      setSuccessMessage("Cofre criptografado fechado.");
    } else {
      // Attempt to unlock
      if (!passphrase || passphrase.length < 4) {
        setErrorMessage("A senha deve ter pelo menos 4 caracteres.");
        return;
      }

      // If no check code exists, create a new one (First time setting password)
      if (!passphraseCheck) {
        const checkCode = generatePassphraseCheck(passphrase);
        onSetPassphraseCheck(checkCode);
        setVaultUnlocked(true);
        setErrorMessage("");
        setSuccessMessage("Senha mestra definida com sucesso! Cofre criptografado ativado.");
      } else {
        // Validate
        const isValid = validatePassphrase(passphrase, passphraseCheck);
        if (isValid) {
          setVaultUnlocked(true);
          setErrorMessage("");
          setSuccessMessage("Cofre desbloqueado. Todos os dados descriptografados localmente.");
        } else {
          setErrorMessage("Senha incorreta. Não foi possível descriptografar os dados.");
        }
      }
    }
  };

  // Export encrypted backup
  const handleExportBackup = () => {
    if (!vaultUnlocked) return;
    
    // Encapsulate payload
    const backupPayload = {
      favorites,
      passphraseCheck,
      exportedAt: new Date().toISOString(),
      version: "1.0"
    };

    const payloadString = JSON.stringify(backupPayload);
    const blob = new Blob([payloadString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `backup_criptografado_tts_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSuccessMessage("Backup criptografado exportado com sucesso!");
  };

  // Copy backup code (for cross-device synchronization)
  const handleCopySyncCode = () => {
    if (!vaultUnlocked) return;
    const backupPayload = {
      favorites,
      passphraseCheck,
    };
    navigator.clipboard.writeText(JSON.stringify(backupPayload));
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 3000);
  };

  // Import encrypted backup
  const handleImportBackupFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.favorites && parsed.passphraseCheck) {
          onImportFavorites(parsed.favorites, parsed.passphraseCheck);
          setSuccessMessage("Dados de backup importados. Insira a senha correspondente para abrir.");
          setVaultUnlocked(false);
          setPassphrase("");
        } else {
          setErrorMessage("Formato de backup inválido.");
        }
      } catch (err) {
        setErrorMessage("Erro ao analisar arquivo de backup.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={`border rounded-3xl p-6 shadow-2xl transition-all ${
      theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200/80 shadow-md shadow-slate-100/50 text-slate-800"
    }`}>
      <div className={`flex items-center justify-between border-b pb-4 mb-5 ${
        theme === "dark" ? "border-slate-800" : "border-slate-100"
      }`}>
        <div className="flex items-center gap-2">
          <FolderLock className="w-5 h-5 text-amber-500" />
          <div>
            <h2 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-slate-850"}`}>Favoritos Criptografados</h2>
            <p className={`text-[11px] ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Total privacidade de ponta a ponta (E2EE)</p>
          </div>
        </div>
        
        <div className="flex items-center">
          {vaultUnlocked ? (
            <span className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border ${
              theme === "dark"
                ? "bg-emerald-950/50 text-emerald-400 border-emerald-500/20"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}>
              <Unlock className="w-3 h-3" />
              Cofre Aberto
            </span>
          ) : (
            <span className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border ${
              theme === "dark"
                ? "bg-rose-950/50 text-rose-400 border-rose-500/20"
                : "bg-rose-50 text-rose-700 border-rose-200"
            }`}>
              <Lock className="w-3 h-3" />
              Cofre Fechado
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className={`mb-4 text-xs p-3 rounded-xl border ${
          theme === "dark"
            ? "bg-rose-950/40 text-rose-300 border-rose-500/10"
            : "bg-rose-50 text-rose-700 border-rose-200"
        }`}>
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className={`mb-4 text-xs p-3 rounded-xl border ${
          theme === "dark"
            ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/10"
            : "bg-emerald-50 text-emerald-700 border-emerald-200"
        }`}>
          {successMessage}
        </div>
      )}

      {/* Passphrase Entry */}
      <div className={`p-4 rounded-2xl border mb-6 ${
        theme === "dark" ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
      }`}>
        <div className={`text-xs font-medium mb-2 flex items-center gap-1.5 ${
          theme === "dark" ? "text-slate-300" : "text-slate-600"
        }`}>
          <Key className="w-3.5 h-3.5 text-indigo-400" />
          {passphraseCheck 
            ? "Desbloqueie seu Cofre para ler e reproduzir seus favoritos:" 
            : "Crie uma Senha Mestra para ativar a Criptografia E2E nos favoritos:"
          }
        </div>
        
        <div className="flex gap-2">
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            disabled={vaultUnlocked}
            placeholder="Senha Mestra (mínimo 4 caracteres)"
            className={`flex-1 border text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60 transition-all ${
              theme === "dark"
                ? "bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500"
                : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
            }`}
          />
          <button
            onClick={handleToggleVault}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
              vaultUnlocked 
                ? (theme === "dark" ? "bg-slate-800 text-slate-200 hover:bg-slate-700" : "bg-slate-200 text-slate-700 hover:bg-slate-300") 
                : "bg-indigo-600 text-white hover:bg-indigo-500"
            }`}
          >
            {vaultUnlocked ? "Fechar" : passphraseCheck ? "Desbloquear" : "Ativar Cripto"}
          </button>
        </div>
      </div>

      {/* Locked / Unlocked States */}
      {!vaultUnlocked ? (
        <div className={`text-center py-12 rounded-2xl border border-dashed flex flex-col items-center justify-center ${
          theme === "dark" ? "bg-slate-950/30 border-slate-800" : "bg-slate-50 border-slate-200"
        }`}>
          <Lock className="w-10 h-10 text-slate-600 mb-3 animate-pulse" />
          <p className={`text-sm font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-700"}`}>Dados Totalmente Criptografados</p>
          <p className={`text-xs mt-1 max-w-sm px-6 ${theme === "dark" ? "text-slate-500" : "text-slate-500"}`}>
            Seus favoritos são mantidos sob criptografia de ponta a ponta localmente. Insira a senha mestra acima para descriptografá-los e reproduzir.
          </p>
          
          <div className={`mt-5 border-t pt-4 w-full px-6 ${theme === "dark" ? "border-slate-800/60" : "border-slate-200"}`}>
            <label className={`cursor-pointer text-[11px] hover:text-indigo-500 transition-colors flex items-center justify-center gap-1 ${
              theme === "dark" ? "text-slate-400" : "text-slate-600 font-medium"
            }`}>
              <CloudUpload className="w-3.5 h-3.5" />
              Restaurar Backup do Dispositivo (.json)
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImportBackupFile} 
                className="hidden" 
              />
            </label>
          </div>
        </div>
      ) : (
        <div>
          {/* Synchronisation and Cloud Backups row */}
          <div className={`flex flex-wrap items-center justify-between gap-3 mb-5 border-b pb-4 ${
            theme === "dark" ? "border-slate-800" : "border-slate-100"
          }`}>
            <span className={`text-[10px] uppercase font-bold tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              Segurança & Sincronização
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySyncCode}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded-lg transition-colors border cursor-pointer ${
                  theme === "dark" 
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700" 
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200 shadow-xs"
                }`}
                title="Copiar código de sincronização cifrado"
              >
                {copiedBackup ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-indigo-450" />
                    Copiar Sincronização
                  </>
                )}
              </button>

              <button
                onClick={handleExportBackup}
                className={`flex items-center gap-1 px-2.5 py-1.5 border text-[10px] rounded-lg transition-colors cursor-pointer ${
                  theme === "dark" 
                    ? "bg-indigo-950/40 hover:bg-indigo-900/40 border-indigo-500/20 text-indigo-300" 
                    : "bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-600 shadow-xs"
                }`}
                title="Baixar backup criptografado em nuvem"
              >
                <CloudDownload className="w-3.5 h-3.5" />
                Backup Nuvem
              </button>
            </div>
          </div>

          {favorites.length === 0 ? (
            <div className={`text-center py-10 rounded-2xl border ${
              theme === "dark" ? "bg-slate-950/20 border-slate-800/40" : "bg-slate-50 border-slate-200"
            }`}>
              <Star className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Nenhum favorito salvo.</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Use o ícone de estrela nas conversões criadas.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {favorites.map((item) => {
                // Decrypt text content for the user interface
                const decryptedTitle = decryptData(item.title, passphrase);
                
                return (
                  <div 
                    key={item.id} 
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                      theme === "dark" 
                        ? "bg-slate-950/40 hover:bg-slate-950 border-slate-800/60" 
                        : "bg-slate-50 hover:bg-slate-100/80 border-slate-200 shadow-sm"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          theme === "dark" ? "text-slate-400 bg-slate-900 border-slate-800" : "text-slate-600 bg-slate-200 border-slate-300"
                        }`}>
                          {item.language}
                        </span>
                        {item.accent && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            theme === "dark" ? "text-indigo-400 bg-indigo-950/40 border-indigo-500/10" : "text-indigo-600 bg-indigo-50 border-indigo-200"
                          }`}>
                            {item.accent}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">
                          {item.voice}
                        </span>
                      </div>
                      
                      <p className={`text-xs font-medium truncate ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                        {decryptedTitle}
                      </p>

                      <div className="flex gap-1 mt-1.5">
                        {item.tags.map((tag) => (
                          <span key={tag} className="text-[9px] text-slate-500">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          const decryptedAudio = decryptData(item.encryptedAudio, passphrase);
                          onPlayFavorite(decryptedAudio, decryptedTitle);
                        }}
                        className="p-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="Ouvir áudio"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>

                      <button
                        onClick={() => {
                          // Decrypt and trigger immediate WAV download
                          const decryptedAudio = decryptData(item.encryptedAudio, passphrase);
                          const link = document.createElement("a");
                          link.href = `data:audio/wav;base64,${decryptedAudio}`;
                          link.download = `favorito_${decryptedTitle.toLowerCase().replace(/\s+/g, "_")}.wav`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          theme === "dark" 
                            ? "bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200" 
                            : "bg-slate-200 hover:bg-slate-355 text-slate-600 hover:text-slate-800"
                        }`}
                        title="Baixar áudio (.wav)"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDeleteFavorite(item.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          theme === "dark" 
                            ? "bg-slate-800 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400" 
                            : "bg-slate-200 hover:bg-rose-100 hover:text-rose-600 text-slate-500"
                        }`}
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
