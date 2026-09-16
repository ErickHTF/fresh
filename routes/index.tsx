import { Head } from "fresh/runtime";
import { Brand } from "@/components/Brand.tsx";
import JoinGame from "@/islands/JoinGame.tsx";
import { define } from "@/utils.ts";

export default define.page(function Home() {
  return (
    <main class="page-background">
      <Head>
        <title>Fresh Quiz | Aprenda jogando</title>
      </Head>
      <div class="shell">
        <header class="home-header">
          <Brand />
          <a
            class="home-link"
            href="/host"
          >
            Criar partida
          </a>
        </header>
        <section class="hero-grid">
          <div class="hero-copy">
            <p class="eyebrow">Aprendizado em tempo real</p>
            <h1>
              Conhecimento que vira{" "}
              <span class="text-accent text-gradient">jogo.</span>
            </h1>
            <p class="hero-description">
              Um quiz colaborativo sobre desenvolvimento web, feito com Fresh,
              Preact e PostgreSQL.
            </p>
            <div class="hero-stats">
              <span>
                <strong>06</strong> perguntas
              </span>
              <span>
                <strong>20s</strong> por rodada
              </span>
            </div>
          </div>
          <JoinGame />
        </section>
      </div>
    </main>
  );
});
