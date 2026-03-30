export type TurnoId = "manha" | "tarde" | "noite";

export type TurnoAtual = {
  id: TurnoId;
  label: "Manhã" | "Tarde" | "Noite";
  emoji: "☀️" | "🌤️" | "🌙";
  inicioTexto: string;
  fimTexto: string;
  inicio: Date;
  fim: Date;
};

function construirData(base: Date, hora: number, minuto: number, segundo = 0, ms = 0) {
  const data = new Date(base);
  data.setHours(hora, minuto, segundo, ms);
  return data;
}

export function obterTurnoAtual(agora: Date = new Date()): TurnoAtual {
  const horaAtual = agora.getHours();

  if (horaAtual >= 6 && horaAtual < 12) {
    return {
      id: "manha",
      label: "Manhã",
      emoji: "☀️",
      inicioTexto: "06:00",
      fimTexto: "11:59",
      inicio: construirData(agora, 6, 0, 0, 0),
      fim: construirData(agora, 11, 59, 59, 999),
    };
  }

  if (horaAtual >= 12 && horaAtual < 18) {
    return {
      id: "tarde",
      label: "Tarde",
      emoji: "🌤️",
      inicioTexto: "12:00",
      fimTexto: "17:59",
      inicio: construirData(agora, 12, 0, 0, 0),
      fim: construirData(agora, 17, 59, 59, 999),
    };
  }

  if (horaAtual >= 18) {
    const fimNoite = new Date(agora);
    fimNoite.setDate(fimNoite.getDate() + 1);
    fimNoite.setHours(5, 59, 59, 999);

    return {
      id: "noite",
      label: "Noite",
      emoji: "🌙",
      inicioTexto: "18:00",
      fimTexto: "05:59",
      inicio: construirData(agora, 18, 0, 0, 0),
      fim: fimNoite,
    };
  }

  const inicioNoite = new Date(agora);
  inicioNoite.setDate(inicioNoite.getDate() - 1);
  inicioNoite.setHours(18, 0, 0, 0);

  return {
    id: "noite",
    label: "Noite",
    emoji: "🌙",
    inicioTexto: "18:00",
    fimTexto: "05:59",
    inicio: inicioNoite,
    fim: construirData(agora, 5, 59, 59, 999),
  };
}
