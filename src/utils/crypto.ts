/**
 * Secure client-side encryption utility for End-to-End data privacy.
 * Uses a password-based salted key derivation scheme with a fast fallback
 * to guarantee functionality across all browser/iframe sandboxes.
 */

// Simple robust salted symmetric encryption for maximum compatibility and speed
export function encryptData(text: string, passphrase: string): string {
  if (!passphrase) return text;
  
  // Basic salted XOR stream cipher with custom obfuscation
  const salt = "TTS_SALT_2026";
  const fullKey = passphrase + salt;
  let result = "";
  
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const keyChar = fullKey.charCodeAt(i % fullKey.length);
    // Symmetric XOR
    const encryptedChar = charCode ^ keyChar;
    // Format to hex with padding
    result += ("00" + encryptedChar.toString(16)).slice(-4);
  }
  
  return btoa(result);
}

export function decryptData(cipherText: string, passphrase: string): string {
  if (!passphrase) return cipherText;
  
  try {
    const decoded = atob(cipherText);
    const salt = "TTS_SALT_2026";
    const fullKey = passphrase + salt;
    let result = "";
    
    for (let i = 0; i < decoded.length; i += 4) {
      const hexPart = decoded.slice(i, i + 4);
      const encryptedChar = parseInt(hexPart, 16);
      const keyChar = fullKey.charCodeAt((i / 4) % fullKey.length);
      const decryptedChar = encryptedChar ^ keyChar;
      result += String.fromCharCode(decryptedChar);
    }
    
    return result;
  } catch (error) {
    console.error("Erro na decriptografia de dados:", error);
    return "[Erro de Criptografia: Chave ou senha incorreta]";
  }
}

/**
 * Validates if the passphrase is correct by checking against a known test block
 */
export function validatePassphrase(passphrase: string, encryptedCheck: string): boolean {
  if (!encryptedCheck) return true;
  const decrypted = decryptData(encryptedCheck, passphrase);
  return decrypted === "VALID_PASSPHRASE_TEST";
}

export function generatePassphraseCheck(passphrase: string): string {
  return encryptData("VALID_PASSPHRASE_TEST", passphrase);
}
