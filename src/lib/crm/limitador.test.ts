import { beforeEach, describe, expect, it } from "vitest";

import { criarLimitador, limitadorBuscas } from "./limitador";

describe("limitador - Limite de buscas por minuto", () => {
  let agora: number;
  const relogio = () => agora;

  beforeEach(() => {
    agora = 1_000_000;
  });

  it("allows the 10th search in the window", () => {
    const limitador = criarLimitador({ maximo: 10, janelaMs: 60_000, agora: relogio });
    let ultima = false;
    for (let i = 0; i < 10; i++) ultima = limitador.permitir("tablet-1");
    expect(ultima).toBe(true);
  });

  it("blocks the 11th search in the window", () => {
    const limitador = criarLimitador({ maximo: 10, janelaMs: 60_000, agora: relogio });
    for (let i = 0; i < 10; i++) limitador.permitir("tablet-1");
    expect(limitador.permitir("tablet-1")).toBe(false);
  });

  it("keeps blocking further searches after the limit", () => {
    const limitador = criarLimitador({ maximo: 2, janelaMs: 60_000, agora: relogio });
    limitador.permitir("tablet-1");
    limitador.permitir("tablet-1");
    expect(limitador.permitir("tablet-1")).toBe(false);
    expect(limitador.permitir("tablet-1")).toBe(false);
  });

  it("counts each device separately", () => {
    const limitador = criarLimitador({ maximo: 10, janelaMs: 60_000, agora: relogio });
    for (let i = 0; i < 10; i++) limitador.permitir("tablet-1");
    expect(limitador.permitir("tablet-1")).toBe(false);
    expect(limitador.permitir("tablet-2")).toBe(true);
  });

  it("opens the window at the first call, not at creation", () => {
    const limitador = criarLimitador({ maximo: 1, janelaMs: 60_000, agora: relogio });
    agora += 500_000;
    expect(limitador.permitir("tablet-1")).toBe(true);
    agora += 59_999;
    expect(limitador.permitir("tablet-1")).toBe(false);
  });
});

describe("limitador - Limite renovado depois de um minuto", () => {
  it("still blocks at 59_999 ms after the window opened", () => {
    let agora = 5_000;
    const limitador = criarLimitador({ maximo: 10, janelaMs: 60_000, agora: () => agora });
    for (let i = 0; i < 10; i++) limitador.permitir("tablet-1");
    agora = 5_000 + 59_999;
    expect(limitador.permitir("tablet-1")).toBe(false);
  });

  it("allows again at exactly 60_000 ms after the window opened", () => {
    let agora = 5_000;
    const limitador = criarLimitador({ maximo: 10, janelaMs: 60_000, agora: () => agora });
    for (let i = 0; i < 10; i++) limitador.permitir("tablet-1");
    agora = 5_000 + 60_000;
    expect(limitador.permitir("tablet-1")).toBe(true);
  });

  it("starts a fresh count after the renewal", () => {
    let agora = 0;
    const limitador = criarLimitador({ maximo: 2, janelaMs: 60_000, agora: () => agora });
    limitador.permitir("tablet-1");
    limitador.permitir("tablet-1");
    agora = 60_000;
    expect(limitador.permitir("tablet-1")).toBe(true);
    expect(limitador.permitir("tablet-1")).toBe(true);
    expect(limitador.permitir("tablet-1")).toBe(false);
  });
});

describe("limitador reiniciar", () => {
  it("clears the counts of every device", () => {
    const limitador = criarLimitador({ maximo: 1, janelaMs: 60_000, agora: () => 0 });
    limitador.permitir("tablet-1");
    limitador.permitir("tablet-2");
    expect(limitador.permitir("tablet-1")).toBe(false);
    expect(limitador.permitir("tablet-2")).toBe(false);

    limitador.reiniciar();

    expect(limitador.permitir("tablet-1")).toBe(true);
    expect(limitador.permitir("tablet-2")).toBe(true);
  });
});

describe("limitadorBuscas", () => {
  it("allows 10 searches and blocks the 11th", () => {
    limitadorBuscas.reiniciar();
    const resultados = Array.from({ length: 11 }, () => limitadorBuscas.permitir("tablet-teste"));
    expect(resultados.slice(0, 10).every(Boolean)).toBe(true);
    expect(resultados[10]).toBe(false);
    limitadorBuscas.reiniciar();
  });
});
