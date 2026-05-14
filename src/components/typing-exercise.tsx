import { useEffect, useMemo, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RotateCcw, Check } from "lucide-react";

interface TypingExerciseProps {
  text: string;
  targetWpm: number;
  onComplete: (result: { wpm: number; accuracy: number }) => void;
}

export function TypingExercise({ text, targetWpm, onComplete }: TypingExerciseProps) {
  const [typed, setTyped] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [errors, setErrors] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [text]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (finished) return;
    const value = e.target.value;
    if (!startedAt && value.length > 0) setStartedAt(Date.now());

    // Count new errors
    if (value.length > typed.length) {
      const idx = value.length - 1;
      if (value[idx] !== text[idx]) {
        setErrors((prev) => prev + 1);
      }
    }
    setTyped(value);

    if (value.length >= text.length) {
      setFinished(true);
      const elapsedMin = (Date.now() - (startedAt ?? Date.now())) / 60000;
      const words = text.length / 5;
      const wpm = elapsedMin > 0 ? Math.round(words / elapsedMin) : 0;
      const correctChars = value.split("").filter((c, i) => c === text[i]).length;
      const accuracy = Math.round((correctChars / text.length) * 10000) / 100;
      onComplete({ wpm, accuracy });
    }
  };

  const reset = () => {
    setTyped("");
    setStartedAt(null);
    setFinished(false);
    setErrors(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const stats = useMemo(() => {
    const elapsedMs = startedAt ? Date.now() - startedAt : 0;
    const elapsedMin = elapsedMs / 60000;
    const correctChars = typed.split("").filter((c, i) => c === text[i]).length;
    const words = correctChars / 5;
    const wpm = elapsedMin > 0 ? Math.round(words / elapsedMin) : 0;
    const accuracy = typed.length > 0 ? Math.round((correctChars / typed.length) * 100) : 100;
    return { wpm, accuracy, progress: (typed.length / text.length) * 100 };
  }, [typed, startedAt, text]);

  // Re-tick for live wpm
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!startedAt || finished) return;
    const i = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(i);
  }, [startedAt, finished]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Stat label="PPM" value={stats.wpm} hint={`Meta: ${targetWpm}`} />
        <Stat label="Precisão" value={`${stats.accuracy}%`} />
        <Stat label="Erros" value={errors} />
      </div>

      <Progress value={stats.progress} />

      <div
        className="typing-text rounded-lg border bg-card p-6 select-none cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {text.split("").map((char, i) => {
          let cls = "typing-char-pending";
          if (i < typed.length) {
            cls = typed[i] === char ? "typing-char-correct" : "typing-char-incorrect";
          } else if (i === typed.length) {
            cls = "typing-char-current";
          }
          return (
            <span key={i} className={cls}>
              {char === " " && i === typed.length ? "·" : char}
            </span>
          );
        })}
      </div>

      <input
        ref={inputRef}
        type="text"
        value={typed}
        onChange={handleChange}
        className="sr-only"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        disabled={finished}
      />

      {finished ? (
        <div className="rounded-lg border bg-success/10 p-6 text-center">
          <Check className="mx-auto h-10 w-10 text-success" />
          <h3 className="mt-3 text-xl font-semibold">Lição concluída!</h3>
          <p className="mt-1 text-muted-foreground">
            {stats.wpm} PPM · {stats.accuracy}% de precisão
          </p>
          <Button onClick={reset} className="mt-4" variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            Refazer
          </Button>
        </div>
      ) : (
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Comece a digitar para iniciar o cronômetro</span>
          <button onClick={reset} className="hover:text-foreground inline-flex items-center gap-1">
            <RotateCcw className="h-3 w-3" /> Reiniciar
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 text-center">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}
