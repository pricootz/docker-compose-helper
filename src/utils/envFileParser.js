/**
 * Analizza un file .env e lo converte in un oggetto
 * @param {string} content - Contenuto del file .env
 * @returns {Object} Oggetto con le variabili d'ambiente
 */
export function parseEnvFile(content) {
    if (!content || typeof content !== 'string') {
      return {};
    }
  
    const result = {};
    
    // Dividi il contenuto in righe
    const lines = content.split('\n');
    
    // Elabora ogni riga
    lines.forEach(line => {
      // Salta commenti e righe vuote
      if (!line || line.trim().startsWith('#') || !line.includes('=')) {
        return;
      }
      
      // Estrai chiave e valore
      const firstEqualSign = line.indexOf('=');
      const key = line.substring(0, firstEqualSign).trim();
      let value = line.substring(firstEqualSign + 1).trim();
      
      // Gestione delle virgolette
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      
      result[key] = value;
    });
    
    return result;
  }