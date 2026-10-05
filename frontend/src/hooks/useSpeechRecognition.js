import { useCallback, useEffect, useRef, useState } from 'react';

const getRecognitionClass = () =>
  typeof window === 'undefined'
    ? null
    : window.SpeechRecognition || window.webkitSpeechRecognition || null;

const ERROR_MESSAGES = {
  'not-allowed': 'Permití el acceso al micrófono para dictar.',
  'service-not-allowed': 'Permití el acceso al micrófono para dictar.',
  'audio-capture': 'No se encontró un micrófono.',
  network: 'Sin conexión con el servicio de reconocimiento de voz.',
};

// Dictado por voz con la Web Speech API. Llama a onFinalText con cada
// fragmento ya reconocido y expone el texto parcial (interim) mientras se habla.
export function useSpeechRecognition({ onFinalText, lang = 'es-AR' } = {}) {
  const supported = !!getRecognitionClass();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const onFinalTextRef = useRef(onFinalText);

  useEffect(() => {
    onFinalTextRef.current = onFinalText;
  }, [onFinalText]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Recognition = getRecognitionClass();
    if (!Recognition || recognitionRef.current) return;

    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let partial = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          onFinalTextRef.current?.(text.trim());
        } else {
          partial += text;
        }
      }
      setInterim(partial);
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      setError(ERROR_MESSAGES[event.error] || 'Error en el dictado por voz.');
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      setInterim('');
    };

    setError('');
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
    }
  }, [lang]);

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
    },
    [],
  );

  return { supported, listening, interim, error, start, stop };
}
