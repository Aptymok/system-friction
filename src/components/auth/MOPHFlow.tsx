// src/components/auth/MOPHFlow.tsx
'use client';
import { useState } from 'react';
import { MOPH_QUESTIONS } from '@/lib/agents/systemPrompt';

export function MOPHFlow({ userId, onComplete }: { userId: string; onComplete: () => void }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const question = MOPH_QUESTIONS[index];
  const handleNext = async () => {
    if (!answers[index]?.trim()) return;
    if (index < MOPH_QUESTIONS.length - 1) {
      setIndex(i => i + 1);
    } else {
      setLoading(true);
      // Enviar respuestas al backend para crear nodo, etc.
      await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, responses: Object.entries(answers).map(([k, v]) => ({ question_id: k, answer: v })) })
      });
      setLoading(false);
      onComplete();
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gold">Pregunta {index+1}/{MOPH_QUESTIONS.length}</p>
      <p className="text-sm font-serif italic">{question}</p>
      <textarea value={answers[index] || ''} onChange={e => setAnswers({...answers, [index]: e.target.value})} className="w-full bg-black border border-zinc-700 p-2 text-sm h-24" />
      <button onClick={handleNext} disabled={loading} className="w-full bg-gold text-void py-2 text-xs uppercase tracking-widest">
        {index < MOPH_QUESTIONS.length - 1 ? 'Siguiente' : 'Finalizar'}
      </button>
    </div>
  );
}
