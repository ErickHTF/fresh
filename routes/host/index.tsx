import { Head } from "fresh/runtime";
import { Brand } from "@/components/Brand.tsx";
import HostLanding from "@/islands/HostLanding.tsx";
import { define } from "@/utils.ts";

export default define.page(function HostIndex() {
  return (
    <main class="page-background">
      <Head>
        <title>Criar partida | Fresh Quiz</title>
      </Head>
      <div class="shell shell-small">
        <Brand />
        <div class="landing-shell">
          <HostLanding />
        </div>
      </div>
    </main>
  );
});
