import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BotAvatar } from "./BotAvatar";

describe("BotAvatar", () => {
  it("renderiza sem erros", () => {
    render(<BotAvatar />);
    expect(screen.getByTestId("bot-avatar")).toBeInTheDocument();
  });

  it("tem role='img' para leitores de tela", () => {
    render(<BotAvatar />);
    expect(screen.getByRole("img", { name: /assistente virtual/i })).toBeInTheDocument();
  });

  it("renderiza em tamanho 'sm' sem erros", () => {
    render(<BotAvatar tamanho="sm" />);
    const avatar = screen.getByTestId("bot-avatar");
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveClass("h-28");
  });

  it("renderiza em tamanho 'md' sem erros", () => {
    render(<BotAvatar tamanho="md" />);
    expect(screen.getByTestId("bot-avatar")).toHaveClass("h-44");
  });

  it("aceita className adicional", () => {
    render(<BotAvatar className="minha-classe" />);
    expect(screen.getByTestId("bot-avatar")).toHaveClass("minha-classe");
  });
});
