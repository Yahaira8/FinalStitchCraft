import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionInstanceLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstanceLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

export function useSpeechRecognition(options: {
  onNext: () => void;
  onBack: () => void;
}) {
  const ctor = getSpeechRecognitionCtor();
  const supported = Boolean(ctor);
  const [listening, setListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);
  const shouldListenRef = useRef(false);
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    setListening(false);
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore stop errors
    }
    recognitionRef.current = null;
  }, []);

  const start = useCallback(() => {
    const Recognition = getSpeechRecognitionCtor();
    if (!Recognition) {
      setError('Voice recognition unsupported in this browser.');
      return;
    }

    try {
      const recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (!result.isFinal) continue;
          const spoken = result[0]?.transcript?.trim().toLowerCase() || '';
          if (!spoken) continue;

          if (spoken.includes('next') || spoken.includes('count')) {
            setLastCommand('Next (+1)');
            callbacksRef.current.onNext();
          } else if (spoken.includes('back') || spoken.includes('previous')) {
            setLastCommand('Back (-1)');
            callbacksRef.current.onBack();
          }
        }
      };

      recognition.onerror = (evt) => {
        if (evt.error === 'not-allowed' || evt.error === 'service-not-allowed') {
          setError('Microphone permission denied.');
          shouldListenRef.current = false;
          setListening(false);
        }
      };

      recognition.onend = () => {
        if (shouldListenRef.current) {
          try {
            recognition.start();
          } catch {
            shouldListenRef.current = false;
            setListening(false);
          }
        } else {
          setListening(false);
        }
      };

      shouldListenRef.current = true;
      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
      setError(null);
    } catch {
      setError('Unable to start voice recognition.');
      shouldListenRef.current = false;
      setListening(false);
    }
  }, []);

  const toggle = useCallback(() => {
    if (listening) {
      stop();
    } else {
      start();
    }
  }, [listening, start, stop]);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

  return {
    supported,
    listening,
    lastCommand,
    error,
    toggle,
  };
}
