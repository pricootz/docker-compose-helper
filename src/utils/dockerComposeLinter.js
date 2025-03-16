import yaml from 'js-yaml';

/**
 * Analizza un file docker-compose.yml e restituisce errori e avvisi
 * @param {string} content - Contenuto del file docker-compose.yml
 * @returns {Object} Oggetto contenente errori e avvisi
 */
export function lintDockerCompose(content) {
  const result = {
    errors: [],
    warnings: [],
    isValid: true
  };

  try {
    // Prova a parsare il YAML
    const yamlContent = yaml.load(content);
    
    // Verifica se il file è un docker-compose valido
    if (!yamlContent) {
      result.errors.push('Il file è vuoto o non è un YAML valido');
      result.isValid = false;
      return result;
    }

    // Verifica se è presente la versione
    if (!yamlContent.version) {
      result.warnings.push('La versione di Docker Compose non è specificata');
    } else if (!['2', '2.0', '3', '3.0', '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8'].includes(yamlContent.version)) {
      result.warnings.push(`La versione ${yamlContent.version} potrebbe non essere supportata`);
    }

    // Verifica se sono presenti servizi
    if (!yamlContent.services) {
      result.errors.push('Nessun servizio definito nel file docker-compose');
      result.isValid = false;
      return result;
    }

    // Analizza ogni servizio
    Object.entries(yamlContent.services).forEach(([serviceName, service]) => {
      // Controlla se è specificata un'immagine o un build
      if (!service.image && !service.build) {
        result.errors.push(`Il servizio "${serviceName}" non ha né un'immagine né una configurazione di build`);
        result.isValid = false;
      }

      // Controlla configurazioni potenzialmente problematiche
      if (service.restart === 'always') {
        result.warnings.push(`Il servizio "${serviceName}" è configurato per riavviarsi sempre, potrebbe causare loop in caso di errori`);
      }

      // Analisi delle porte
      if (service.ports) {
        service.ports.forEach(port => {
          if (typeof port === 'string') {
            const ports = port.split(':');
            if (ports.length === 2) {
              const [hostPort, containerPort] = ports;
              // Controlla porte privilegiate
              if (parseInt(hostPort) < 1024 && parseInt(hostPort) !== 80 && parseInt(hostPort) !== 443) {
                result.warnings.push(`Il servizio "${serviceName}" utilizza la porta privilegiata ${hostPort}, potrebbe richiedere permessi speciali`);
              }
            }
          }
        });
      }

      // Controlla i volumi
      if (service.volumes) {
        service.volumes.forEach(volume => {
          if (typeof volume === 'string') {
            const parts = volume.split(':');
            if (parts.length >= 2) {
              const hostPath = parts[0];
              // Avvisa se il percorso è assoluto
              if (hostPath.startsWith('/')) {
                result.warnings.push(`Il servizio "${serviceName}" utilizza il percorso assoluto "${hostPath}", potrebbe causare problemi di portabilità`);
              }
            }
          }
        });
      }

      // Controlla le dipendenze
      if (service.depends_on) {
        const serviceDependencies = Array.isArray(service.depends_on) 
          ? service.depends_on 
          : Object.keys(service.depends_on);
        
        serviceDependencies.forEach(dependency => {
          if (!yamlContent.services[dependency]) {
            result.errors.push(`Il servizio "${serviceName}" dipende da "${dependency}" che non è definito`);
            result.isValid = false;
          }
        });
      }
    });

    // Verifica se ci sono servizi che non sono utilizzati da nessuno (isolati)
    const serviceNames = Object.keys(yamlContent.services);
    const referencedServices = new Set();
    
    // Raccogli tutti i servizi referenziati
    Object.values(yamlContent.services).forEach(service => {
      if (service.depends_on) {
        if (Array.isArray(service.depends_on)) {
          service.depends_on.forEach(dep => referencedServices.add(dep));
        } else {
          Object.keys(service.depends_on).forEach(dep => referencedServices.add(dep));
        }
      }
    });
    
    // Trova servizi isolati
    serviceNames.forEach(name => {
      if (!referencedServices.has(name) && serviceNames.length > 1) {
        result.warnings.push(`Il servizio "${name}" non è referenziato da nessun altro servizio, potrebbe essere isolato`);
      }
    });

  } catch (error) {
    result.errors.push(`Errore durante il parsing del YAML: ${error.message}`);
    result.isValid = false;
  }

  return result;
}

/**
 * Suggerisce miglioramenti per un file docker-compose.yml
 * @param {string} content - Contenuto del file docker-compose.yml
 * @returns {Array} Array di suggerimenti
 */
export function suggestImprovements(content) {
  const suggestions = [];

  try {
    const yamlContent = yaml.load(content);
    
    if (!yamlContent || !yamlContent.services) return suggestions;

    // Suggerisci l'uso di healthcheck
    Object.entries(yamlContent.services).forEach(([serviceName, service]) => {
      if (!service.healthcheck) {
        suggestions.push(`Considera di aggiungere un healthcheck al servizio "${serviceName}" per migliorare la resilienza`);
      }
      
      // Suggerisci limiti di risorse
      if (!service.deploy || (!service.deploy.resources && !service.deploy.limits)) {
        suggestions.push(`Considera di impostare limiti di risorse per il servizio "${serviceName}" per prevenire esaurimento delle risorse`);
      }
      
      // Suggerisci etichette
      if (!service.labels) {
        suggestions.push(`Considera di aggiungere etichette al servizio "${serviceName}" per una migliore documentazione`);
      }
    });

    // Suggerisci l'uso di networks personalizzate
    if (!yamlContent.networks) {
      suggestions.push('Considera di definire reti personalizzate per una migliore isolamento e sicurezza');
    }

    // Suggerisci l'uso di volumi nominati
    if (!yamlContent.volumes) {
      const hasBindMounts = Object.values(yamlContent.services).some(service => 
        service.volumes && service.volumes.some(vol => 
          typeof vol === 'string' && vol.includes(':')
        )
      );
      
      if (hasBindMounts) {
        suggestions.push('Considera di utilizzare volumi nominati invece di bind mounts per una migliore portabilità');
      }
    }

  } catch (error) {
    // Non fare nulla in caso di errore, il linter catturerà l'errore
  }

  return suggestions;
}