import type { Metadata } from "next";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Política de Privacidade e utilização de cookies do site Aluga Casa Búzios.",
};

export default function PrivacidadePage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-zinc-50">
        <section className="bg-blue-950 px-6 py-20 text-white">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-sky-300">
              Privacidade e proteção de dados
            </p>

            <h1 className="mt-5 text-4xl font-black sm:text-5xl">
              Política de Privacidade
            </h1>

            <p className="mt-6 text-lg leading-8 text-white/80">
              Saiba como a Aluga Casa Búzios utiliza, protege e trata
              informações relacionadas aos visitantes do site.
            </p>

            <p className="mt-5 text-sm text-white/60">
              Última atualização: 28 de julho de 2026
            </p>
          </div>
        </section>

        <section className="px-6 py-16 sm:py-20">
          <article className="mx-auto max-w-4xl rounded-[2rem] border border-zinc-200 bg-white p-7 shadow-sm sm:p-12">
            <div className="space-y-12">
              <section>
                <h2 className="text-2xl font-bold text-blue-950">
                  1. Quem somos
                </h2>

                <p className="mt-4 leading-8 text-zinc-600">
                  A Aluga Casa Búzios atua na divulgação e no atendimento
                  relacionado a casas de temporada em Armação dos Búzios, Rio
                  de Janeiro.
                </p>

                <div className="mt-5 rounded-2xl bg-sky-50 p-6">
                  <p className="font-semibold text-blue-950">
                    Aluga Casa Búzios
                  </p>

                  <p className="mt-2 text-zinc-600">
                    Site: alugacasabuzios.com.br
                  </p>

                  <p className="mt-1 text-zinc-600">
                    E-mail: contato@alugacasabuzios.com.br
                  </p>

                  <p className="mt-1 text-zinc-600">
                    WhatsApp: (24) 99828-8846
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-blue-950">
                  2. Informações tratadas
                </h2>

                <p className="mt-4 leading-8 text-zinc-600">
                  O site pode tratar informações fornecidas voluntariamente
                  pelo visitante, como nome, datas da viagem, quantidade de
                  hóspedes e mensagem de atendimento.
                </p>

                <p className="mt-4 leading-8 text-zinc-600">
                  Quando autorizado, também podemos utilizar dados analíticos
                  de navegação, como páginas visitadas, dispositivo, origem do
                  acesso, interações e cliques nos botões do WhatsApp.
                </p>

                <p className="mt-4 leading-8 text-zinc-600">
                  Informações técnicas necessárias ao funcionamento, segurança
                  e prevenção de fraudes também podem ser processadas pelos
                  provedores de infraestrutura.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-blue-950">
                  3. Finalidades
                </h2>

                <ul className="mt-5 space-y-3 leading-7 text-zinc-600">
                  <li>
                    • Responder solicitações de atendimento e disponibilidade.
                  </li>

                  <li>
                    • Apresentar propriedades adequadas às necessidades da
                    viagem.
                  </li>

                  <li>• Melhorar o conteúdo e a navegação do site.</li>

                  <li>• Medir cliques nos canais de atendimento.</li>

                  <li>
                    • Manter a segurança e o funcionamento da plataforma.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-blue-950">
                  4. Cookies e Google Analytics
                </h2>

                <p className="mt-4 leading-8 text-zinc-600">
                  O Google Analytics é utilizado para gerar estatísticas de
                  utilização do site. Essa ferramenta somente será carregada
                  após o visitante aceitar os cookies analíticos no banner
                  exibido pelo site.
                </p>

                <p className="mt-4 leading-8 text-zinc-600">
                  O visitante pode recusar esses cookies e continuar navegando
                  normalmente. Também pode modificar sua escolha por meio do
                  botão “Preferências de cookies”.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-blue-950">
                  5. Serviços de terceiros
                </h2>

                <p className="mt-4 leading-8 text-zinc-600">
                  O site utiliza serviços de terceiros para hospedagem, análise
                  de acesso e atendimento, incluindo Vercel, Google Analytics,
                  Supabase e WhatsApp.
                </p>

                <p className="mt-4 leading-8 text-zinc-600">
                  Ao abrir um link externo, o visitante também estará sujeito às
                  políticas de privacidade da plataforma acessada.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-blue-950">
                  6. Compartilhamento de informações
                </h2>

                <p className="mt-4 leading-8 text-zinc-600">
                  Não comercializamos dados pessoais. Informações poderão ser
                  compartilhadas com fornecedores necessários ao funcionamento
                  do site e do atendimento, observadas as finalidades descritas
                  nesta política.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-blue-950">
                  7. Direitos do titular
                </h2>

                <p className="mt-4 leading-8 text-zinc-600">
                  O titular pode solicitar informações sobre o tratamento de
                  seus dados, correção, atualização, exclusão, revogação do
                  consentimento e outras providências previstas na legislação
                  aplicável.
                </p>

                <p className="mt-4 leading-8 text-zinc-600">
                  As solicitações podem ser enviadas para
                  contato@alugacasabuzios.com.br.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-blue-950">
                  8. Segurança
                </h2>

                <p className="mt-4 leading-8 text-zinc-600">
                  Adotamos medidas razoáveis para proteger as informações contra
                  acesso não autorizado, perda, alteração ou divulgação
                  indevida.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-blue-950">
                  9. Alterações desta política
                </h2>

                <p className="mt-4 leading-8 text-zinc-600">
                  Esta política poderá ser atualizada para refletir mudanças no
                  site, nos serviços utilizados ou nas práticas de tratamento
                  de dados.
                </p>
              </section>

              <section className="rounded-3xl bg-blue-950 p-7 text-white sm:p-9">
                <h2 className="text-2xl font-bold text-white">
                  Fale conosco
                </h2>

                <p className="mt-4 leading-7 text-white/75">
                  Para dúvidas relacionadas à privacidade ou à utilização de
                  dados, entre em contato com nossa equipe.
                </p>

                <a
  href="mailto:contato@alugacasabuzios.com.br"
  style={{
    backgroundColor: "#16a34a",
    color: "#ffffff",
  }}
  className="mt-6 inline-flex items-center justify-center rounded-full px-7 py-3 font-bold shadow-md transition hover:opacity-90"
>
  Enviar e-mail
</a>
              </section>
            </div>
          </article>
        </section>
      </main>

      <Footer />
    </>
  );
}