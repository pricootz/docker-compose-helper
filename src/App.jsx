import { lintDockerCompose, suggestImprovements } from './utils/dockerComposeLinter';
import { useState, useEffect } from 'react';
import { Upload, FileCode, Download, AlertCircle, Key, Database, HardDrive, Server, Info, Globe, Github, Code, FileText, Plus } from 'lucide-react';
import { dockerComposeTemplates } from './utils/dockerComposeTemplates';
import yaml from 'js-yaml';
import AceEditor from 'react-ace';
import { useTranslation } from 'react-i18next';
import { parseEnvFile } from './utils/envFileParser';

// Importazioni necessarie per Ace Editor
import 'ace-builds/src-noconflict/mode-yaml';
import 'ace-builds/src-noconflict/theme-tomorrow';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-language_tools';

// Funzioni di validazione
const validators = {
  port: (value) => {
    if (!value) return null;
    const port = parseInt(value);
    return (port > 0 && port < 65536) ? null : 'Porta non valida (1-65535)';
  },
  required: (value) => {
    return value.trim() ? null : 'Campo obbligatorio';
  },
  password: (value) => {
    if (!value) return null;
    return value.length >= 8 ? null : 'Password troppo corta (min 8 caratteri)';
  },
  path: (value) => {
    if (!value) return null;
    // Semplice controllo per percorsi validi
    return (value.startsWith('/') || value.startsWith('./') || value.startsWith('../')) ? null : 'Percorso non valido';
  }
};

// Categorie predefinite, suggerimenti e descrizioni
const categories = {
  database: {
    label: 'Database',
    icon: <Database className="h-4 w-4" />,
    suggestions: {
      DB_HOST: ['localhost', 'db', 'database'],
      DB_PORT: ['3306', '5432', '27017'],
      DB_USER: ['root', 'postgres', 'admin'],
      DB_PASSWORD: ['Genera una password sicura'],
      DB_NAME: ['myapp_db', 'production_db', 'development_db']
    },
    descriptions: {
      DB_HOST: 'Hostname o indirizzo IP del database',
      DB_PORT: 'Porta su cui il database accetta le connessioni',
      DB_USER: 'Nome utente per accedere al database',
      DB_PASSWORD: 'Password per accedere al database (dovrebbe essere complessa)',
      DB_NAME: 'Nome del database da utilizzare',
      DATABASE_URL: 'URL di connessione completo al database',
      POSTGRES_USER: 'Nome utente per PostgreSQL',
      POSTGRES_PASSWORD: 'Password per PostgreSQL',
      POSTGRES_DB: 'Nome del database PostgreSQL',
      MYSQL_ROOT_PASSWORD: 'Password per l\'utente root di MySQL',
      MYSQL_DATABASE: 'Nome del database MySQL',
      MYSQL_USER: 'Nome utente per MySQL',
      MYSQL_PASSWORD: 'Password per MySQL'
    },
    validators: {
      DB_PORT: 'port',
      DB_PASSWORD: 'password',
      POSTGRES_PASSWORD: 'password',
      MYSQL_ROOT_PASSWORD: 'password',
      MYSQL_PASSWORD: 'password'
    }
  },
  paths: {
    label: 'Percorsi',
    icon: <HardDrive className="h-4 w-4" />,
    suggestions: {
      UPLOAD_PATH: ['/data/uploads', '/var/www/uploads', './uploads'],
      CONFIG_PATH: ['/etc/myapp', './config', '/opt/myapp/config']
    },
    descriptions: {
      UPLOAD_PATH: 'Percorso dove salvare i file caricati',
      CONFIG_PATH: 'Percorso dei file di configurazione',
      DATA_PATH: 'Percorso dei dati persistenti',
      LOG_PATH: 'Percorso dei file di log'
    },
    validators: {
      UPLOAD_PATH: 'path',
      CONFIG_PATH: 'path',
      DATA_PATH: 'path',
      LOG_PATH: 'path'
    }
  },
  ports: {
    label: 'Porte',
    icon: <Server className="h-4 w-4" />,
    suggestions: {
      PORT: ['3000', '8080', '80'],
      EXTERNAL_PORT: ['80', '443', '8080']
    },
    descriptions: {
      PORT: 'Porta interna su cui l\'applicazione è in ascolto',
      EXTERNAL_PORT: 'Porta esterna mappata sulla porta interna',
      HTTP_PORT: 'Porta per il traffico HTTP',
      HTTPS_PORT: 'Porta per il traffico HTTPS'
    },
    validators: {
      PORT: 'port',
      EXTERNAL_PORT: 'port',
      HTTP_PORT: 'port',
      HTTPS_PORT: 'port'
    }
  },
  security: {
    label: 'Sicurezza',
    icon: <Key className="h-4 w-4" />,
    suggestions: {
      JWT_SECRET: ['Genera un secret sicuro'],
      API_KEY: ['Genera una API key']
    },
    descriptions: {
      JWT_SECRET: 'Chiave segreta per firmare i token JWT',
      API_KEY: 'Chiave API per autenticare le richieste',
      SECRET_KEY: 'Chiave segreta generale dell\'applicazione',
      TOKEN: 'Token di autenticazione'
    },
    validators: {
      JWT_SECRET: 'password',
      API_KEY: 'password',
      SECRET_KEY: 'password'
    }
  },
  other: {
    label: 'Altre',
    icon: <Info className="h-4 w-4" />,
    suggestions: {},
    descriptions: {},
    validators: {}
  }
};

// Funzione helper per categorizzare automaticamente le variabili
const categorizeVariable = (name) => {
  if (name.includes('DB_') || name.includes('DATABASE_') || name.includes('POSTGRES_') || name.includes('MYSQL_') || name.includes('MONGO_')) return 'database';
  if (name.includes('PATH') || name.includes('DIR') || name.includes('FOLDER') || name.includes('VOLUME')) return 'paths';
  if (name.includes('PORT')) return 'ports';
  if (name.includes('SECRET') || name.includes('KEY') || name.includes('TOKEN') || name.includes('PASS')) return 'security';
  return 'other';
};

function App() {
  const [dockerComposeContent, setDockerComposeContent] = useState('');
  const [variables, setVariables] = useState([]);
  const [error, setError] = useState('');
  const [lintResults, setLintResults] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [darkMode, setDarkMode] = useState(false);
  const [savedConfigurations, setSavedConfigurations] = useState([]);
  const [configurationName, setConfigurationName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [originalVariables, setOriginalVariables] = useState({});
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  // Funzione per cambiare lingua
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setCurrentLanguage(lng);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setDockerComposeContent(e.target.result);
        setError('');
      };
      reader.readAsText(file);
    }
  };

  const validateVariable = (name, value) => {
    // Trova la categoria della variabile
    const category = categorizeVariable(name);
    // Prendi il validatore appropriato, se esiste
    const validatorKey = categories[category].validators[name];
    if (!validatorKey) return null;

    // Esegui la validazione
    return validators[validatorKey](value);
  };

  const validateAndAnalyzeDockerCompose = () => {
    try {
      const yamlContent = yaml.load(dockerComposeContent);
      setError('');

      // Esegui il linting
      const lintResult = lintDockerCompose(dockerComposeContent);
      setLintResults(lintResult);

      // Ottieni i suggerimenti
      const improvementSuggestions = suggestImprovements(dockerComposeContent);
      setSuggestions(improvementSuggestions);

      const foundVariables = new Map();
      const lines = dockerComposeContent.split('\n');

      // Prima controlliamo le variabili nella sezione environment dei servizi
      if (yamlContent && yamlContent.services) {
        Object.values(yamlContent.services).forEach(service => {
          if (service.environment) {
            if (Array.isArray(service.environment)) {
              service.environment.forEach(env => {
                const [key, value] = env.split('=');
                if (!foundVariables.has(key)) {
                  foundVariables.set(key, value || '');
                }
              });
            } else if (typeof service.environment === 'object') {
              Object.entries(service.environment).forEach(([key, value]) => {
                if (!foundVariables.has(key)) {
                  foundVariables.set(key, value || '');
                }
              });
            }
          }
        });
      }

      // Poi cerchiamo altre variabili nel testo
      lines.forEach(line => {
        // Check for ${VARIABLE:default} format
        const matchesWithDefault = line.match(/\${([^}]+)}/g);
        if (matchesWithDefault) {
          matchesWithDefault.forEach(match => {
            const content = match.slice(2, -1);
            const [variableName, defaultValue] = content.split(':');
            if (!foundVariables.has(variableName)) {
              foundVariables.set(variableName, defaultValue || '');
            }
          });
        }

        // Check for $VARIABLE format
        const simpleMatches = line.match(/\$([A-Z_][A-Z0-9_]*)/g);
        if (simpleMatches) {
          simpleMatches.forEach(match => {
            const variableName = match.slice(1);
            if (!foundVariables.has(variableName)) {
              foundVariables.set(variableName, '');
            }
          });
        }
      });

      const newVariables = Array.from(foundVariables).map(([name, defaultValue]) => ({
        name,
        value: defaultValue || '',
        category: categorizeVariable(name),
        description: '',
        modified: false
      }));

      // Salva i valori originali
      const originals = {};
      newVariables.forEach(v => {
        originals[v.name] = v.value;
      });
      setOriginalVariables(originals);

      // Validiamo le variabili all'inizio
      const errors = {};
      newVariables.forEach(variable => {
        const errorMsg = validateVariable(variable.name, variable.value);
        if (errorMsg) {
          errors[variable.name] = errorMsg;
        }
      });

      setValidationErrors(errors);
      setVariables(newVariables);
    } catch (e) {
      setError(t('editor.error', { message: e.message }));
    }
  };

  const generateEnvFile = () => {
    const envContent = variables
      .map(variable => `${variable.name}=${variable.value}`)
      .join('\n');

    const blob = new Blob([envContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.env';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
    let password = '';

    // Almeno un carattere maiuscolo, minuscolo, numero e simbolo
    password += chars.charAt(Math.floor(Math.random() * 26));
    password += chars.charAt(Math.floor(Math.random() * 26) + 26);
    password += chars.charAt(Math.floor(Math.random() * 10) + 52);
    password += chars.charAt(Math.floor(Math.random() * 13) + 62);

    // Aggiungi altri caratteri fino a raggiungere 12 caratteri totali
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Mescola la password
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  };

  const generateModifiedDockerCompose = () => {
    try {
      // Crea una copia del contenuto originale
      let modifiedContent = dockerComposeContent;

      // Sostituisci tutte le variabili con i loro valori
      variables.forEach(variable => {
        if (variable.value) {
          // Sostituisci ${VARIABLE} con il valore
          const pattern1 = new RegExp(`\\$\\{${variable.name}(:.*?)?\\}`, 'g');
          modifiedContent = modifiedContent.replace(pattern1, variable.value);

          // Sostituisci $VARIABLE con il valore
          const pattern2 = new RegExp(`\\$${variable.name}(?![A-Z0-9_])`, 'g');
          modifiedContent = modifiedContent.replace(pattern2, variable.value);
        }
      });

      // Crea il blob e scarica il file
      const blob = new Blob([modifiedContent], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'docker-compose.modified.yml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Errore nella generazione del file: ' + e.message);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Ripristina il valore originale di una variabile
  const resetVariable = (name) => {
    const newVariables = [...variables];
    const index = newVariables.findIndex(v => v.name === name);
    if (index !== -1) {
      newVariables[index].value = originalVariables[name];
      newVariables[index].modified = false;
      setVariables(newVariables);

      // Aggiorna la validazione
      const error = validateVariable(name, originalVariables[name]);
      setValidationErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  };

  // Ripristina tutti i valori originali
  const resetAllVariables = () => {
    const newVariables = variables.map(v => ({
      ...v,
      value: originalVariables[v.name],
      modified: false
    }));
    setVariables(newVariables);

    // Aggiorna le validazioni
    const errors = {};
    newVariables.forEach(variable => {
      const errorMsg = validateVariable(variable.name, variable.value);
      if (errorMsg) {
        errors[variable.name] = errorMsg;
      }
    });
    setValidationErrors(errors);
  };

  // Carica le configurazioni salvate dal localStorage all'avvio
  const loadSavedConfigurations = () => {
    const saved = localStorage.getItem('dockerComposeHelperConfigs');
    if (saved) {
      setSavedConfigurations(JSON.parse(saved));
    }
  };

  // Salva una nuova configurazione
  const saveCurrentConfiguration = () => {
    if (!configurationName.trim()) return;

    const newConfig = {
      id: Date.now(),
      name: configurationName,
      variables: variables,
      dockerCompose: dockerComposeContent
    };

    const updatedConfigs = [...savedConfigurations, newConfig];
    setSavedConfigurations(updatedConfigs);
    localStorage.setItem('dockerComposeHelperConfigs', JSON.stringify(updatedConfigs));
    setConfigurationName('');
    setShowSaveDialog(false);
  };

  // Carica una configurazione salvata
  const loadConfiguration = (config) => {
    setDockerComposeContent(config.dockerCompose);
    setVariables(config.variables);

    // Valida le variabili caricate
    const errors = {};
    config.variables.forEach(variable => {
      const errorMsg = validateVariable(variable.name, variable.value);
      if (errorMsg) {
        errors[variable.name] = errorMsg;
      }
    });
    setValidationErrors(errors);
  };

  // Elimina una configurazione salvata
  const deleteConfiguration = (id) => {
    const updatedConfigs = savedConfigurations.filter(config => config.id !== id);
    setSavedConfigurations(updatedConfigs);
    localStorage.setItem('dockerComposeHelperConfigs', JSON.stringify(updatedConfigs));
  };

  // Carica le configurazioni salvate quando il componente si monta
  useEffect(() => {
    loadSavedConfigurations();
  }, []);

  useEffect(() => {
    if (showPreview && variables.length > 0) {
      generatePreviewContent();
    }
  }, [variables, showPreview]);

  // Componente Tooltip personalizzato
  const Tooltip = ({ text, children }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
      <div className="relative inline-block">
        <div
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
        >
          {children}
        </div>
        {isVisible && (
          <div className={`absolute z-10 w-64 p-2 text-xs rounded shadow-lg ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-800'} -mt-1 left-6`}>
            {text}
          </div>
        )}
      </div>
    );
  };

  const handleEnvFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const envContent = e.target.result;
          const envVariables = parseEnvFile(envContent);

          // Aggiorna le variabili esistenti con i valori dal file .env
          const updatedVariables = variables.map(variable => {
            if (envVariables.hasOwnProperty(variable.name)) {
              return {
                ...variable,
                value: envVariables[variable.name],
                modified: envVariables[variable.name] !== originalVariables[variable.name]
              };
            }
            return variable;
          });

          setVariables(updatedVariables);

          // Aggiorna la validazione
          const errors = {};
          updatedVariables.forEach(variable => {
            const errorMsg = validateVariable(variable.name, variable.value);
            if (errorMsg) {
              errors[variable.name] = errorMsg;
            }
          });
          setValidationErrors(errors);
        } catch (error) {
          setError(t('envImport.error', { message: error.message }));
        }
      };
      reader.readAsText(file);
    }
  };

  const generatePreviewContent = () => {
    try {
      // Crea una copia del contenuto originale
      let content = dockerComposeContent;

      // Sostituisci tutte le variabili con i loro valori
      variables.forEach(variable => {
        if (variable.value) {
          // Sostituisci ${VARIABLE} con il valore
          const pattern1 = new RegExp(`\\$\\{${variable.name}(:.*?)?\\}`, 'g');
          content = content.replace(pattern1, variable.value);

          // Sostituisci $VARIABLE con il valore
          const pattern2 = new RegExp(`\\$${variable.name}(?![A-Z0-9_])`, 'g');
          content = content.replace(pattern2, variable.value);
        }
      });

      // Aggiorna lo stato del contenuto dell'anteprima
      setPreviewContent(content);
      return content;
    } catch (e) {
      console.error('Errore nella generazione del preview:', e);
      return dockerComposeContent;
    }
  };

  const loadTemplate = (templateId) => {
    const template = dockerComposeTemplates[templateId];
    if (template) {
      // Chiedi conferma se c'è già del contenuto
      if (dockerComposeContent.trim() && !window.confirm(t('templates.confirmOverwrite'))) {
        return;
      }

      setDockerComposeContent(template.template);
      setError('');
    }
  };
  return (
    <div className={`min-h-screen w-screen flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Header */}
      <nav
        className={`w-full shadow-sm py-4 px-6 flex items-center justify-between border-b ${darkMode
          ? 'bg-gray-800 text-white border-gray-700'
          : 'bg-white text-gray-900 border-gray-200'
          }`}
      >
        <div className="flex items-center gap-2">
          <FileCode className={`h-6 w-6 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
          <div className="flex flex-col">
            <span className="text-lg font-semibold leading-tight">{t('appName')}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">by pricootz</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Selettore lingua */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">
            <Globe className="h-4 w-4" />
            <select
              value={currentLanguage}
              onChange={(e) => changeLanguage(e.target.value)}
              className={`text-sm bg-transparent border-none focus:outline-none appearance-none ${darkMode ? 'text-white' : 'text-gray-800'
                }`}
            >
              <option value="it">Italiano</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* GitHub link */}
          <a
            href="https://github.com/pricootz/docker-compose-helper"
            target="_blank"
            rel="noopener noreferrer"
            className={`p-2 rounded-full transition-colors duration-200 ${darkMode
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            title={t('header.github')}
          >
            <Github className="h-5 w-5" />
          </a>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-full transition-colors duration-200 ${darkMode
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            title={darkMode ? t('header.lightMode') : t('header.darkMode')}
          >
            {darkMode ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Modal per salvare la configurazione */}
      {
        showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`p-6 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} w-96`}>
              <h3 className="text-lg font-medium mb-4">{t('saveDialog.title')}</h3>
              <input
                type="text"
                placeholder={t('saveDialog.placeholder')}
                value={configurationName}
                onChange={(e) => setConfigurationName(e.target.value)}
                className={`w-full p-2 mb-4 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className={`px-4 py-2 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                >
                  {t('saveDialog.cancel')}
                </button>
                <button
                  onClick={saveCurrentConfiguration}
                  disabled={!configurationName.trim()}
                  className={`px-4 py-2 rounded ${darkMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                    } ${!configurationName.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {t('saveDialog.save')}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal per scegliere un template */}
      {
        showTemplateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`p-6 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} w-3/4 max-w-4xl max-h-[80vh] overflow-y-auto`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">{t('templates.selectTemplate')}</h3>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(dockerComposeTemplates).map(([id, template]) => (
                  <div
                    key={id}
                    className={`p-4 border rounded-lg cursor-pointer ${darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}
                    onClick={() => {
                      loadTemplate(id);
                      setShowTemplateModal(false);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {template.icon === 'database' && <Database className="h-5 w-5" />}
                      {template.icon === 'server' && <Server className="h-5 w-5" />}
                      {template.icon === 'code' && <Code className="h-5 w-5" />}
                      {template.icon === 'fileText' && <FileText className="h-5 w-5" />}
                      <span className="font-medium">{template.name}</span>
                    </div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {template.description || t('templates.noDescription')}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className={`px-4 py-2 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                >
                  {t('templates.cancel')}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Sezione Configurazioni Salvate */}
      {
        savedConfigurations.length > 0 && (
          <div className={`w-full px-6 py-2 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <span className="text-sm font-medium">{t('savedConfigs.title')}</span>
              {savedConfigurations.map(config => (
                <div key={config.id} className={`flex items-center gap-1 p-1 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                  }`}>
                  <button
                    onClick={() => loadConfiguration(config)}
                    className="text-xs px-2 py-1"
                    title={t('savedConfigs.loadTooltip')}
                  >
                    {config.name}
                  </button>
                  <button
                    onClick={() => deleteConfiguration(config.id)}
                    className={`text-xs rounded-full p-1 ${darkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-300 text-gray-500'
                      }`}
                    title={t('savedConfigs.deleteTooltip')}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      }

      {/* Main Content */}
      <div className="flex flex-1 p-6 gap-6">
        {/* Left Panel */}
        <div className={`flex-1 rounded-lg shadow p-6 flex flex-col ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white'}`}>
          <div className={`flex justify-between items-center border-b pb-3 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className="font-medium text-lg">{t('editor.title')}</h2>

            {/* Toggle per l'anteprima - visibile solo quando ci sono variabili */}
            {variables.length > 0 && (
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">
                <span className="text-sm">{t('editor.preview')}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={showPreview}
                    onChange={() => setShowPreview(!showPreview)}
                  />
                  <div className={`w-11 h-6 rounded-full peer ${darkMode
                    ? 'bg-gray-700 peer-checked:bg-blue-600'
                    : 'bg-gray-200 peer-checked:bg-blue-500'
                    } peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                </label>
              </div>
            )}
          </div>

          {error && (
            <div className={`mt-4 p-3 rounded-md flex items-center gap-2 ${darkMode ? 'bg-red-900 border-red-800 text-red-200' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          <div className="flex-1 mt-4">
            {showPreview && variables.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 h-full">
                <div className="border rounded">
                  <div className={`px-3 py-2 text-sm font-medium ${darkMode ? 'bg-gray-700 border-b border-gray-600' : 'bg-gray-100 border-b border-gray-200'}`}>
                    {t('editor.original')}
                  </div>
                  <AceEditor
                    mode="yaml"
                    theme={darkMode ? "monokai" : "tomorrow"}
                    name="docker-compose-editor-original"
                    value={dockerComposeContent}
                    onChange={setDockerComposeContent}
                    fontSize={14}
                    width="100%"
                    height="calc(100% - 36px)"
                    showPrintMargin={false}
                    showGutter={true}
                    highlightActiveLine={true}
                    readOnly={false}
                    setOptions={{
                      enableBasicAutocompletion: true,
                      enableLiveAutocompletion: true,
                      enableSnippets: true,
                      showLineNumbers: true,
                      tabSize: 2,
                      useSoftTabs: true,
                      wrapEnabled: true
                    }}
                    className="border-0"
                  />
                </div>
                <div className="border rounded">
                  <div className={`px-3 py-2 text-sm font-medium ${darkMode ? 'bg-gray-700 border-b border-gray-600' : 'bg-gray-100 border-b border-gray-200'}`}>
                    {t('editor.preview')}
                  </div>
                  <AceEditor
                    mode="yaml"
                    theme={darkMode ? "monokai" : "tomorrow"}
                    name="docker-compose-editor-preview"
                    value={previewContent}
                    fontSize={14}
                    width="100%"
                    height="calc(100% - 36px)"
                    showPrintMargin={false}
                    showGutter={true}
                    highlightActiveLine={false}
                    readOnly={true}
                    setOptions={{
                      showLineNumbers: true,
                      tabSize: 2,
                      useSoftTabs: true,
                      wrapEnabled: true
                    }}
                    className="border-0"
                  />
                </div>
              </div>
            ) : (
              <AceEditor
                mode="yaml"
                theme={darkMode ? "monokai" : "tomorrow"}
                name="docker-compose-editor"
                value={dockerComposeContent}
                onChange={setDockerComposeContent}
                fontSize={14}
                width="100%"
                height="100%"
                showPrintMargin={false}
                showGutter={true}
                highlightActiveLine={true}
                readOnly={false}
                setOptions={{
                  enableBasicAutocompletion: true,
                  enableLiveAutocompletion: true,
                  enableSnippets: true,
                  showLineNumbers: true,
                  tabSize: 2,
                  useSoftTabs: true,
                  wrapEnabled: true
                }}
                className="border rounded"
                placeholder={t('editor.placeholder')}
              />
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".yml,.yaml"
              onChange={handleFileUpload}
            />
            <button
              className={`px-4 py-2 rounded-md flex items-center gap-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
              onClick={() => document.getElementById('file-upload').click()}
              title={t('editor.uploadFile')}
            >
              <Upload className="h-4 w-4" />
              {t('editor.uploadFile')}
            </button>
            <button
              className={`px-4 py-2 rounded-md ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-800 hover:bg-gray-900 text-white'}`}
              onClick={validateAndAnalyzeDockerCompose}
              disabled={!dockerComposeContent}
              title={t('editor.analyze')}
            >
              {t('editor.analyze')}
            </button>

            {/* Pulsante per aprire il modal dei template */}
            <button
              className={`px-4 py-2 rounded-md flex items-center gap-2 ${darkMode ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
              onClick={() => setShowTemplateModal(true)}
              title={t('templates.loadTemplate')}
            >
              <Plus className="h-4 w-4" />
              {t('templates.loadTemplate')}
            </button>            {/* Pulsante per generare docker-compose modificato */}
            {variables.length > 0 && (
              <button
                onClick={generateModifiedDockerCompose}
                className={`px-4 py-2 rounded-md flex items-center gap-2 ${darkMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'}`}
                title={t('actions.generateComposeTooltip')}
              >
                <Download className="h-4 w-4" />
                {t('actions.generateCompose')}
              </button>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className={`flex-1 rounded-lg shadow p-6 flex flex-col ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white'}`}>
          <div className={`flex justify-between items-center border-b pb-3 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className="font-medium text-lg">{t('variables.title')}</h2>
            <div className="flex gap-2">
              {variables.length > 0 && (
                <>
                  <input
                    type="file"
                    id="env-file-upload"
                    className="hidden"
                    accept=".env"
                    onChange={handleEnvFileUpload}
                  />
                  <button
                    onClick={() => document.getElementById('env-file-upload').click()}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm ${darkMode ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-purple-500 hover:bg-purple-600 text-white'
                      }`}
                    title={t('actions.importEnvTooltip')}
                  >
                    <Upload className="h-4 w-4" />
                    {t('actions.importEnv')}
                  </button>
                  <button
                    onClick={generateEnvFile}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm ${darkMode ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                    title={t('actions.generateEnvTooltip')}
                  >
                    <Download className="h-4 w-4" />
                    {t('actions.generateEnv')}
                  </button>                  <button
                    onClick={() => setShowSaveDialog(true)}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm ${darkMode ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-purple-500 hover:bg-purple-600 text-white'}`}
                    title={t('actions.saveTooltip')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17 21 17 13 7 13 7 21"></polyline>
                      <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    {t('actions.save')}
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="flex-1 mt-4 overflow-auto">
            {variables.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                <p>{t('variables.empty')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.keys(categories).map(categoryKey => {
                  const categoryVariables = variables.filter(v => v.category === categoryKey);
                  if (categoryVariables.length === 0) return null;

                  return (
                    <div key={categoryKey} className={`border rounded-lg overflow-hidden ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className={`px-4 py-2 font-medium text-sm flex items-center justify-between ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-2">
                          {categories[categoryKey].icon}
                          {t(`categories.${categoryKey}`)}
                        </div>
                        {categoryVariables.some(v => v.modified) && (
                          <button
                            onClick={() => {
                              // Ripristina tutte le variabili di questa categoria
                              const variablesToReset = categoryVariables.map(v => v.name);
                              const newVariables = [...variables];
                              variablesToReset.forEach(name => {
                                const index = newVariables.findIndex(v => v.name === name);
                                if (index !== -1) {
                                  newVariables[index].value = originalVariables[name];
                                  newVariables[index].modified = false;
                                }
                              });
                              setVariables(newVariables);
                            }}
                            className={`text-xs px-2 py-0.5 rounded ${darkMode ? 'bg-gray-600 hover:bg-gray-500 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                            title={t('variables.resetAll')}
                          >
                            {t('variables.resetAll')}
                          </button>
                        )}
                      </div>
                      <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {categoryVariables.map((variable, index) => (
                          <div key={index} className="p-4">
                            <div className="flex items-start gap-4">
                              <div className="flex-1">
                                <div className="flex justify-between">
                                  <div className="font-mono text-sm font-medium flex items-center gap-1">
                                    {variable.name}
                                    {variable.modified && (
                                      <span className={`text-xs px-1 py-0.5 rounded ${darkMode ? 'bg-yellow-700 text-yellow-200' : 'bg-yellow-100 text-yellow-800'}`}>{t('variables.modified')}</span>
                                    )}
                                    {categories[categoryKey].descriptions[variable.name] && (
                                      <Tooltip text={categories[categoryKey].descriptions[variable.name]}>
                                        <Info className={`h-4 w-4 ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'} cursor-help`} />
                                      </Tooltip>
                                    )}
                                  </div>
                                  {variable.modified && (
                                    <button
                                      onClick={() => resetVariable(variable.name)}
                                      className={`text-xs px-2 py-0.5 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                                      title={t('variables.reset')}
                                    >
                                      {t('variables.reset')}
                                    </button>
                                  )}
                                </div>
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={variable.value}
                                    onChange={(e) => {
                                      const newValue = e.target.value;
                                      const newVariables = [...variables];
                                      const index = variables.findIndex(v => v.name === variable.name);
                                      newVariables[index].value = newValue;
                                      // Imposta modified a true se il valore è diverso dall'originale
                                      newVariables[index].modified = newValue !== originalVariables[variable.name];
                                      setVariables(newVariables);

                                      // Validare il nuovo valore
                                      const error = validateVariable(variable.name, newValue);
                                      setValidationErrors(prev => ({
                                        ...prev,
                                        [variable.name]: error
                                      }));

                                      // Forza l'aggiornamento dell'anteprima
                                      if (showPreview) {
                                        // Usa un timer per evitare troppi aggiornamenti in sequenza
                                        if (window.previewUpdateTimeout) {
                                          clearTimeout(window.previewUpdateTimeout);
                                        }
                                        window.previewUpdateTimeout = setTimeout(() => {
                                          setPreviewKey(prev => prev + 1);
                                        }, 200);
                                      }
                                    }}
                                    className={`mt-1 w-full px-2 py-1 border rounded text-sm ${validationErrors[variable.name]
                                      ? 'border-red-500 bg-red-50 text-red-800'
                                      : darkMode
                                        ? 'bg-gray-700 border-gray-600 text-white'
                                        : 'bg-white border-gray-300 text-gray-800'
                                      }`}
                                    placeholder={t('variables.inputPlaceholder')}
                                  />
                                  {validationErrors[variable.name] && (
                                    <div className={`flex items-center gap-1 text-xs mt-1 ${darkMode ? 'text-red-400' : 'text-red-500'}`}>
                                      <AlertCircle className="h-3 w-3" />
                                      {t(`validation.${validators[validationErrors[variable.name]]}`)}
                                    </div>
                                  )}
                                </div>
                                {categories[categoryKey].suggestions[variable.name] && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {categories[categoryKey].suggestions[variable.name].map((suggestion, i) => (
                                      <button
                                        key={i}
                                        onClick={() => {
                                          const newVariables = [...variables];
                                          if (variable.name === 'DB_PASSWORD' && suggestion === 'Genera una password sicura') {
                                            const password = generateSecurePassword();
                                            newVariables[variables.findIndex(v => v.name === variable.name)].value = password;
                                            // Validare la password
                                            const error = validateVariable(variable.name, password);
                                            setValidationErrors(prev => ({
                                              ...prev,
                                              [variable.name]: error
                                            }));
                                          } else {
                                            newVariables[variables.findIndex(v => v.name === variable.name)].value = suggestion;
                                            // Validare il valore suggerito
                                            const error = validateVariable(variable.name, suggestion);
                                            setValidationErrors(prev => ({
                                              ...prev,
                                              [variable.name]: error
                                            }));
                                          }
                                          setVariables(newVariables);
                                        }}
                                        className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${darkMode
                                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                                          : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                                          }`}
                                      >
                                        {variable.name === 'DB_PASSWORD' && suggestion === 'Genera una password sicura' ? (
                                          <>
                                            <Key className="h-3 w-3" />
                                            {suggestion}
                                          </>
                                        ) : (
                                          suggestion
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {/* Lint Results Panel - visibile solo quando sono presenti risultati */}
        {lintResults && (
          <div className={`flex-1 rounded-lg shadow p-6 flex flex-col mt-6 ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white'}`}>
            <div className={`flex justify-between items-center border-b pb-3 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className="font-medium text-lg">{t('linter.title')}</h2>
            </div>
            <div className="mt-4 space-y-4">
              {lintResults.errors.length === 0 && lintResults.warnings.length === 0 && suggestions.length === 0 ? (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-green-900 text-green-100' : 'bg-green-50 text-green-800'}`}>
                  <p className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    {t('linter.noIssues')}
                  </p>
                </div>
              ) : (
                <>
                  {lintResults.errors.length > 0 && (
                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-red-900 text-red-100' : 'bg-red-50 text-red-700'}`}>
                      <h3 className="font-medium mb-2">{t('linter.errors')}</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {lintResults.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {lintResults.warnings.length > 0 && (
                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-yellow-900 text-yellow-100' : 'bg-yellow-50 text-yellow-700'}`}>
                      <h3 className="font-medium mb-2">{t('linter.warnings')}</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {lintResults.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {suggestions.length > 0 && (
                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-900 text-blue-100' : 'bg-blue-50 text-blue-700'}`}>
                      <h3 className="font-medium mb-2">{t('linter.suggestions')}</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {suggestions.map((suggestion, index) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div >
  );
}

export default App;