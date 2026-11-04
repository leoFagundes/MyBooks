import type { Metadata } from "next";
import Link from "next/link";
import { Prose, ToReview } from "@/components/ui/prose";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Privacidade",
  description:
    "Quais dados o MyBooks guarda, para quê, com quem compartilha e como você os leva ou apaga.",
};

// Rascunho (MELHORIAS 9.3): os trechos em <ToReview> precisam da revisão de
// quem responde pelo MyBooks antes de valer. No dev, eles aparecem marcados.
export default function PrivacyPage() {
  return (
    <div className="flex flex-col gap-10">
      <header className="flex max-w-prose flex-col gap-3">
        <p className="font-mono text-xs text-muted-foreground">
          Atualizada em{" "}
          <ToReview note="a data em que a versão final for publicada">
            novembro de 2026
          </ToReview>
        </p>
        <h1 className="font-serif text-5xl leading-tight tracking-tight text-balance sm:text-6xl">
          Política de privacidade
        </h1>
        <p className="text-pretty text-muted-foreground">
          O MyBooks existe para você guardar e compartilhar a sua vida de
          leitor. Aqui está, sem rodeios, o que guardamos, por quê e como você
          manda nos seus dados, como garante a Lei Geral de Proteção de Dados
          (LGPD, Lei 13.709/2018).
        </p>
      </header>

      <Prose>
        <h2>Quem cuida dos seus dados</h2>
        <p>
          O controlador dos dados é{" "}
          <ToReview note="nome completo ou razão social e CPF ou CNPJ de quem responde pelo MyBooks">
            o responsável pelo MyBooks
          </ToReview>
          . Para qualquer assunto de privacidade, inclusive falar com o
          encarregado, escreva para{" "}
          <ToReview note="um e-mail de contato que alguém leia de verdade">
            privacidade@mybooks.app
          </ToReview>
          .
        </p>

        <h2>O que guardamos</h2>
        <ul>
          <li>
            <strong>Conta:</strong> o seu e-mail e a senha, que o provedor de
            autenticação guarda cifrada (nós nunca a vemos). Se você entra com o
            Google, recebemos o nome, o e-mail e a foto da conta Google.
          </li>
          <li>
            <strong>Perfil:</strong> o nome, o @, a bio, a foto e os gêneros
            favoritos que você escolher.
          </li>
          <li>
            <strong>Leituras:</strong> a estante, os status, as datas, as notas,
            as resenhas, as citações e as coleções; os livros que você cadastra
            à mão e as sugestões de edição do catálogo.
          </li>
          <li>
            <strong>Comunidade:</strong> quem você segue e quem segue você, as
            curtidas, os tópicos, as respostas, as sugestões, os votos, os
            comentários e as denúncias que você faz.
          </li>
          <li>
            <strong>Preferências:</strong> a vista da estante, guardada na conta
            e num cookie; o tema e alguns avisos já vistos ficam só no seu
            navegador.
          </li>
          <li>
            <strong>Registros técnicos:</strong> o endereço IP, a data e a hora
            dos acessos, que o Marco Civil da Internet (Lei 12.965/2014) manda
            guardar por seis meses, e métricas de desempenho e de páginas
            visitadas, contadas sem cookies e sem identificar você.
          </li>
        </ul>
        <p>
          A importação do Goodreads lê o arquivo no seu próprio navegador: só os
          livros chegam até nós. A câmera do leitor de código de barras também
          funciona só no aparelho, e nenhuma imagem sai dele.
        </p>

        <h2>Para que usamos</h2>
        <ul>
          <li>
            Fazer o MyBooks funcionar: entrar na conta, mostrar a sua estante e
            o que você publica, avisar de seguidores, respostas e menções. A
            base legal é a execução do contrato que são os{" "}
            <Link href={routes.termos}>termos de uso</Link>.
          </li>
          <li>
            Manter a comunidade segura: limitar o spam, revisar denúncias e
            aplicar as regras, por legítimo interesse.
          </li>
          <li>
            Melhorar o produto com métricas agregadas, por legítimo interesse.
          </li>
          <li>Cumprir a lei, como a guarda dos registros de acesso.</li>
        </ul>
        <p>
          Não vendemos dados, não mostramos anúncios e não montamos perfis para
          terceiros.
        </p>

        <h2>O que fica público</h2>
        <p>
          O perfil é público por padrão: o nome, o @, a bio, a foto, a estante,
          as coleções e as citações aparecem para quem visita, e o que você
          publica na comunidade aparece para todos. Com o perfil privado (em{" "}
          <Link href={routes.configuracoes}>Configurações</Link>), só quem você
          aprova vê a sua estante e as suas citações; o nome, o @ e a foto
          continuam visíveis, para que as pessoas possam pedir para seguir.
        </p>

        <h2>Com quem compartilhamos</h2>
        <p>
          Só com os serviços que fazem o MyBooks funcionar, cada um no papel de
          operador e só com o necessário: a Vercel (hospedagem e métricas), o
          Supabase (banco de dados, autenticação e arquivos), o Resend (e-mails
          da conta) e o Google (quando você entra com ele). Esses serviços ficam
          fora do Brasil, então os dados passam por uma transferência
          internacional, com as garantias contratuais deles.{" "}
          <ToReview note="confirmar as cláusulas de cada provedor e as regiões em que os dados ficam">
            Os servidores do banco de dados ficam nos Estados Unidos.
          </ToReview>
        </p>
        <p>
          Quando você busca um livro, o termo da busca vai para a Open Library
          e, às vezes, para o Google Books, sem nada que identifique você.
        </p>

        <h2>Por quanto tempo</h2>
        <p>
          Enquanto a sua conta existir. Ao excluí-la, apagamos o perfil, a
          estante, as coleções, as citações, os seus tópicos, respostas,
          sugestões e comentários, os votos, as curtidas e as fotos enviadas. Os
          livros que você cadastrou à mão podem continuar no catálogo, sem o seu
          nome, porque outros leitores podem tê-los na estante. Os registros de
          acesso ficam pelos seis meses da lei, e o registro das ações da
          moderação guarda o que foi feito, sem ligar a você.
        </p>

        <h2>Os seus direitos</h2>
        <p>
          A LGPD garante a você confirmar e acessar os seus dados, corrigir o
          que estiver errado, levá-los para outro serviço, pedir que sejam
          apagados, saber com quem os compartilhamos e revogar um consentimento.
          Muito disso está a um clique:
        </p>
        <ul>
          <li>corrigir: edite o perfil e a estante quando quiser;</li>
          <li>
            levar: em <Link href={routes.configuracoes}>Configurações</Link>,
            exporte tudo em JSON ou CSV;
          </li>
          <li>
            apagar: em <Link href={routes.configuracoes}>Configurações</Link>,
            exclua a conta.
          </li>
        </ul>
        <p>
          Para o resto, escreva para o contato acima. Respondemos em até{" "}
          <ToReview note="o prazo de resposta que dá para cumprir; a ANPD fala em 15 dias para o acesso completo">
            15 dias
          </ToReview>
          . Você também pode falar com a Autoridade Nacional de Proteção de
          Dados (ANPD).
        </p>

        <h2>Cookies e armazenamento</h2>
        <p>
          Usamos cookies só para manter você na conta e lembrar a vista da
          estante. O tema e alguns avisos ficam no armazenamento do navegador. O
          app instalado guarda no aparelho os arquivos do site, para abrir mais
          rápido; nenhuma página com os seus dados fica guardada nele. Não há
          cookies de publicidade nem de rastreamento.
        </p>

        <h2>Segurança</h2>
        <p>
          A conexão é sempre cifrada, cada pessoa só alcança os próprios dados
          privados por regras no próprio banco, e o acesso da equipe é limitado
          e registrado. Nenhum sistema é infalível: se algo acontecer com os
          seus dados, avisamos você e a ANPD, como manda a lei.
        </p>

        <h2>Crianças e adolescentes</h2>
        <p>
          O MyBooks é para pessoas a partir de{" "}
          <ToReview note="a idade mínima; com menos de 18, a LGPD pede atenção ao melhor interesse, e com menos de 12, o consentimento de um responsável">
            13 anos
          </ToReview>
          . Se você souber de uma conta de alguém mais novo, escreva para o
          contato acima.
        </p>

        <h2>Mudanças nesta política</h2>
        <p>
          Quando algo importante mudar, avisamos no MyBooks antes de valer. A
          data no topo mostra a versão em vigor.
        </p>
      </Prose>
    </div>
  );
}
