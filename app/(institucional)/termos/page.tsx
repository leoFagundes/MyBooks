import type { Metadata } from "next";
import Link from "next/link";
import { Prose, ToReview } from "@/components/ui/prose";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Termos de uso",
  description:
    "As regras do MyBooks: a sua conta, o que você publica, a convivência na comunidade e o que esperar do serviço.",
};

// Rascunho (MELHORIAS 9.3): os trechos em <ToReview> precisam da revisão de
// quem responde pelo MyBooks antes de valer. No dev, eles aparecem marcados.
export default function TermsPage() {
  return (
    <div className="flex flex-col gap-10">
      <header className="flex max-w-prose flex-col gap-3">
        <p className="font-mono text-xs text-muted-foreground">
          Atualizados em{" "}
          <ToReview note="a data em que a versão final for publicada">
            novembro de 2026
          </ToReview>
        </p>
        <h1 className="font-serif text-5xl leading-tight tracking-tight text-balance sm:text-6xl">
          Termos de uso
        </h1>
        <p className="text-pretty text-muted-foreground">
          Um acordo curto entre você e o MyBooks. Ao criar uma conta ou usar o
          site, você concorda com ele e com a{" "}
          <Link
            href={routes.privacidade}
            className="underline underline-offset-4 hover:text-foreground"
          >
            política de privacidade
          </Link>
          .
        </p>
      </header>

      <Prose>
        <h2>O MyBooks</h2>
        <p>
          Uma rede social de leitura: você monta a sua estante, organiza
          coleções, guarda citações, segue outros leitores e conversa na
          comunidade. O serviço é oferecido por{" "}
          <ToReview note="nome completo ou razão social e CPF ou CNPJ de quem responde pelo MyBooks">
            o responsável pelo MyBooks
          </ToReview>{" "}
          e, por enquanto, é gratuito.
        </p>

        <h2>A sua conta</h2>
        <ul>
          <li>
            Você precisa ter pelo menos{" "}
            <ToReview note="a mesma idade mínima da política de privacidade">
              13 anos
            </ToReview>
            . Com menos de 18, use o MyBooks com o conhecimento de um
            responsável.
          </li>
          <li>
            Os dados do cadastro precisam ser verdadeiros, e a conta é só sua:
            cuide da senha e avise se notar algo estranho.
          </li>
          <li>
            O @ não pode se passar por outra pessoa, por uma marca ou pela
            equipe do MyBooks.
          </li>
          <li>
            Você pode excluir a conta quando quiser, em{" "}
            <Link href={routes.configuracoes}>Configurações</Link>.
          </li>
        </ul>

        <h2>O que você publica</h2>
        <p>
          Resenhas, notas, citações, coleções, tópicos, respostas e sugestões
          continuam sendo seus. Para mostrá-los no site, você nos dá uma licença
          gratuita, mundial e não exclusiva para guardar, exibir e adaptar o
          formato (uma imagem de compartilhamento, por exemplo), enquanto o
          conteúdo estiver no MyBooks.
        </p>
        <p>
          Citações de livros devem ser trechos curtos, com o livro indicado,
          como permite a Lei de Direitos Autorais (Lei 9.610/1998, art. 46). Não
          publique obras inteiras, capítulos ou arquivos de livros.
        </p>

        <h2>A convivência na comunidade</h2>
        <p>Para a conversa continuar boa para todo mundo, não vale:</p>
        <ul>
          <li>
            ofender, ameaçar, assediar ou discriminar alguém, por qualquer
            motivo;
          </li>
          <li>
            publicar conteúdo ilegal, sexual explícito ou que exponha dados de
            outras pessoas;
          </li>
          <li>
            fazer spam, propaganda não pedida ou criar contas para driblar uma
            suspensão;
          </li>
          <li>
            contar o final de um livro sem o aviso de spoiler (use{" "}
            <code className="font-mono text-sm">||spoiler||</code> ou marque o
            tópico);
          </li>
          <li>
            tentar burlar a segurança do site, coletar dados em massa ou
            atrapalhar o serviço.
          </li>
        </ul>
        <p>
          Qualquer pessoa pode denunciar o que viola estas regras. A moderação
          pode ocultar o conteúdo, trancar uma conversa, suspender ou banir a
          conta, conforme a gravidade, e fica um registro do que foi feito. Se
          achar que houve um engano, escreva para o contato abaixo.
        </p>

        <h2>Os livros do catálogo</h2>
        <p>
          Os dados e as capas vêm da Open Library, do Google Books e dos
          próprios leitores, e podem ter erros: dá para sugerir uma correção na
          página do livro. As capas e os títulos pertencem às editoras e aos
          autores e aparecem só para identificar as obras.
        </p>

        <h2>O que esperar do serviço</h2>
        <p>
          Fazemos o possível para o MyBooks estar sempre no ar e para os seus
          dados estarem seguros, mas o serviço é oferecido como está: pode haver
          pausas para manutenção, falhas e mudanças nas funcionalidades. Exporte
          os seus dados de vez em quando, em{" "}
          <Link href={routes.configuracoes}>Configurações</Link>.{" "}
          <ToReview note="o limite de responsabilidade, que não pode afastar os direitos do Código de Defesa do Consumidor">
            Na medida permitida pela lei, o MyBooks não responde por danos
            indiretos decorrentes do uso do serviço nem pelo que os leitores
            publicam.
          </ToReview>
        </p>

        <h2>Mudanças nestes termos</h2>
        <p>
          Quando algo importante mudar, avisamos no MyBooks antes de valer.
          Continuar usando depois disso é concordar com a versão nova; se não
          concordar, você pode excluir a conta.
        </p>

        <h2>Lei e contato</h2>
        <p>
          Estes termos seguem as leis do Brasil.{" "}
          <ToReview note="o foro; para consumidores, costuma valer o do domicílio de quem usa">
            Fica eleito o foro do domicílio de quem usa o MyBooks.
          </ToReview>{" "}
          Dúvidas, pedidos e contestações:{" "}
          <ToReview note="o mesmo e-mail de contato da política de privacidade">
            contato@mybooks.app
          </ToReview>
          .
        </p>
      </Prose>
    </div>
  );
}
