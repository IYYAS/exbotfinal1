import { useRef, useState, useEffect } from 'react';

export interface UseRecordingReturn {
  isRecording: boolean;
  recordingTime: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Blob | null;
  cancelRecording: () => void;
  error: string;
  clearError: () => void;
}

export const useRecording = (): UseRecordingReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      clearError();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone blocked — allow mic in browser address bar, then reload.');
      } else {
        setError('Could not access microphone.');
      }
    }
  };

  const stopRecording = (): Blob | null => {
    if (!mediaRecorderRef.current) return null;

    mediaRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());

    if (timerRef.current) clearInterval(timerRef.current);

    setIsRecording(false);

    const mimeType = mediaRecorderRef.current.mimeType || 'audio/ogg';
    const blob = new Blob(audioChunksRef.current, { type: mimeType });

    return blob;
  };

  const cancelRecording = () => {
    audioChunksRef.current = [];
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());

    if (timerRef.current) clearInterval(timerRef.current);

    setIsRecording(false);
    setRecordingTime(0);
  };

  const clearError = () => setError('');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    cancelRecording,
    error,
    clearError,
  };
};
