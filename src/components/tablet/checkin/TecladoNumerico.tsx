"use client";

import { Delete } from "lucide-react";

type TecladoNumericoProps = {
  onDigito: (digito: string) => void;
  onApagar: () => void;
  onLimpar: () => void;
  desabilitado?: boolean;
};

const DIGITOS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

// Alvos de toque de no mínimo 64 × 64 px (RNF-001.10).
const TECLA =
  "flex h-16 min-w-16 cursor-pointer items-center justify-center rounded-2xl border border-sky-700 bg-sky-900/80 text-3xl font-semibold text-white transition-all active:scale-95 disabled:opacity-50 focus-visible:ring-4 focus-visible:ring-emerald-400 focus-visible:outline-none";

/** Teclado na tela: o telefone é digitado só por toque, sem o teclado do sistema. */
export function TecladoNumerico({
  onDigito,
  onApagar,
  onLimpar,
  desabilitado,
}: TecladoNumericoProps) {
  return (
    <div className="grid grid-cols-3 gap-3" role="group" aria-label="Teclado numérico">
      {DIGITOS.map((digito) => (
        <button
          key={digito}
          type="button"
          className={TECLA}
          disabled={desabilitado}
          onClick={() => onDigito(digito)}
        >
          {digito}
        </button>
      ))}
      <button
        type="button"
        className={`${TECLA} text-lg`}
        disabled={desabilitado}
        onClick={onLimpar}
      >
        Limpar
      </button>
      <button type="button" className={TECLA} disabled={desabilitado} onClick={() => onDigito("0")}>
        0
      </button>
      <button
        type="button"
        className={TECLA}
        disabled={desabilitado}
        onClick={onApagar}
        aria-label="Apagar"
      >
        <Delete className="h-8 w-8" aria-hidden="true" />
      </button>
    </div>
  );
}
