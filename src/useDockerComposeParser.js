import { useState } from 'react';

export function useDockerComposeParser() {
  const [dockerComposeContent, setDockerComposeContent] = useState('');
  const [variables, setVariables] = useState([]);
  const [error, setError] = useState('');

  const validateAndAnalyzeDockerCompose = () => {
    try {
      setError('');
      setVariables([]);

      if (!dockerComposeContent.trim()) {
        setError('Inserisci un file docker-compose.yml valido.');
        return;
      }

      const lines = dockerComposeContent.split('\n');
      const foundVariables = [];

      lines.forEach((line) => {
        const envVarMatch = line.match(/\${([^}:]+)(?::([^}]+))?}/);
        if (envVarMatch) {
          const name = envVarMatch[1];
          const defaultValue = envVarMatch[2] || 'N/A';
          foundVariables.push({ name, value: defaultValue, category: 'Ambiente' });
        }
      });

      if (foundVariables.length === 0) {
        setError('Nessuna variabile trovata.');
      } else {
        setVariables(foundVariables);
      }
    } catch (err) {
      setError('Errore durante l’analisi del file.');
    }
  };

  return {
    dockerComposeContent,
    setDockerComposeContent,
    variables,
    error,
    validateAndAnalyzeDockerCompose
  };
}
