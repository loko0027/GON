import { useState, useEffect } from 'react';

export default function useCountdown(initialMinutes: number, start: boolean) {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);

  useEffect(() => {
    if (!start || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, start]);

  const minutes = Math.floor(timeLeft / 60);
  // ✅ AJUSTE AQUI: Garantir que os segundos sejam inteiros
  const seconds = Math.floor(timeLeft % 60); 
  const isFinished = timeLeft <= 0;

  return { minutes, seconds, isFinished };
};