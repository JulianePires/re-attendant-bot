function calcularTempoEspera(criadoEm: Date | string): string {
  const agora = new Date();
  const inicio = new Date(criadoEm);
  const diffMs = agora.getTime() - inicio.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "agora";
  if (diffMinutes === 1) return "1 min";
  if (diffMinutes < 60) return `${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  const remainingMinutes = diffMinutes % 60;

  if (remainingMinutes === 0) return `${diffHours}h`;
  return `${diffHours}h ${remainingMinutes}min`;
}

export { calcularTempoEspera };
