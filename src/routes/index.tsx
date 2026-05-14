import { createFileRoute, Link } from "@tanstack/react-router";
import { Keyboard, Trophy, BarChart3, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-6 w-6 text-primary" />
            <span className="font-semibold tracking-tight">Datilografia Online</span>
          </div>
          <Link to="/login">
            <Button variant="default" size="sm">Entrar</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <span className="inline-flex items-center rounded-full border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          Curso completo · 20 lições
        </span>
        <h1 className="mt-6 text-5xl font-bold tracking-tight text-foreground md:text-6xl">
          Aprenda a digitar com{" "}
          <span className="text-primary">velocidade e precisão</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Curso estruturado em etapas progressivas, da linha guia até textos avançados.
          Acompanhe sua evolução em tempo real com métricas de PPM e precisão.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/login">
            <Button size="lg">Acessar minha conta</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Keyboard,
              title: "20 lições progressivas",
              text: "Da linha guia (asdf jklç) até textos completos com pontuação, números e símbolos.",
            },
            {
              icon: BarChart3,
              title: "Métricas em tempo real",
              text: "Acompanhe PPM (palavras por minuto), precisão e tentativas em cada exercício.",
            },
            {
              icon: Trophy,
              title: "Progresso registrado",
              text: "Cada lição concluída fica salva no seu painel. Veja sua evolução completa.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6">
              <f.icon className="h-8 w-8 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-16 text-center">
          <Users className="h-10 w-10 text-primary" />
          <h2 className="mt-4 text-2xl font-bold">Para alunos e administradores</h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            O administrador gerencia alunos e mensalidades em um painel completo.
            Cada aluno tem seu próprio espaço para praticar e acompanhar resultados.
          </p>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Datilografia Online</span>
          <Link to="/login" className="hover:text-foreground">Entrar</Link>
        </div>
      </footer>
    </div>
  );
}
