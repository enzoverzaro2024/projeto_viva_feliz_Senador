# Guia de Replicação do EventCard (Comandos para o Antigravity)

Este documento contém a sequência aproximada de **prompts (comandos)** que você pode repassar para outra pessoa (ou para usar em outro computador) iniciar o desenvolvimento do EventCard assistido pelo Antigravity, criando seu próprio sistema de ingressos e créditos com códigos QR.

## Como usar este guia
1. Crie uma pasta vazia no novo computador e abra-a no seu editor de código.
2. Com o Antigravity aberto, inicie o primeiro prompt.
3. Aguarde ele terminar de estruturar e responder.
4. Digite o próximo prompt e siga esse ciclo!

---

### Passo 1: Inicialização e Layout Base
> "Crie um novo projeto Next.js com App Router, TypeScript e Tailwind CSS na raiz da pasta. Instale as bibliotecas necessárias. Quero que você crie a página inicial (Home) com um visual premium, moderno e responsivo, estilo aplicativo de bancos ou eventos famosos. Use gradientes sutis, cantos arredondados (cards elegantes) e adicione um Header explicando que este é o 'Dashboard EventCard'."

### Passo 2: Banco de Dados e Cadastro (Autenticação Básica)
> "Configure o banco de dados do projeto usando Drizzle ORM (pode usar SQLite para facilitar ou PostgreSQL se eu definir o .env). Preciso que crie o Schema da tabela de Usuários com: Nome, Email, Senha, Papel/Role (admin, volunteer, participant) e Saldo Atual do cartão. Crie também uma rota de API de autenticação ou sessão e uma página `/auth` unificada de Login/Cadastro com design moderno."

### Passo 3: Geração de Cartão para o Participante
> "Quando um usuário (participant) fizer login, direcione ele para a página `/participante/cartao`. Esta tela deve carregar e exibir na tela os dados do usuário, o saldo atual dele e, principalmente, instale a biblioteca 'qrcode.react' para converter o ID único num cartão virtual com QR Code. Crie o botão 'Baixar Cartão no Celular'."

### Passo 4: Leitor de QR Code para os Voluntários
> "Crie as rotas protegidas que só voluntários e administradores possam acessar (por exemplo, `/volunteer/scanner`). Adicione a essa tela um leitor de QR Code usando a biblioteca 'html5-qrcode' acessando a câmera do dispositivo. A idéia é que, quando ele escanear o QR gerado pelo aplicativo do participante, busque via API no banco de dados e exiba o Nome e Saldo daquela pessoa na tela do aplicativo, e depois limpe a câmera."

### Passo 5: Adição de Créditos e Botões Rápidos
> "Na tela do Scanner, assim que o QR Code for validado e exibir as informações na tela, logo abaixo crie o formulário de 'Adicionar Créditos'. Em vez de apenas um campo em branco de digitação, crie os botões rápidos de 'R$ 50', 'R$ 100' e 'R$ 150'. Se o voluntário clicar em um deles, preencha automaticamente o valor e exiba na mesma tela um cartão de Confirmação dizendo 'Confirmar Adição de R$ 50 para João?' e, ao apertar sim, dispare a verificação da API para aumentar o saldo no banco de dados."

### Passo 6: Dashboard do Voluntário 
> "Crie a página `/volunteer/dashboard`. Essa tela deve exibir o resumo total do evento. Busque na base as transações e mostre em um card elegante com valor grande qual foi o montante total de créditos adicionados até agora, bem como uma tabela moderna e responsiva exibindo o Histórico das Transações mais recentes com os dados do participante, valor inserido e horário."

### Passo 7: Painel Adminstrativo & Impressão
> "Agora construa a página `/admin`. Esta rota é apenas para donos do site poderem gerenciar todos. Exiba uma lista de contas com filtragem rápida por nome. Além do gerenciamento em tabela, crie o sistema de importar artes de plano de fundo do evento ou fazer 'batch processing' em que o sistema gera todos os QR codes de acordo com planilhas Excel cadastradas para agilizar as impressões externas (impresso)."

### Passo 8: Adequação Estética / Responsividade Rigorosa
> "Faça uma varredura nas telas `/volunteer/dashboard`, `/volunteer/scanner`, `/participante/cartao`, `/auth` e na página principal `page.tsx`. Remova todos os estilos 'inline' (`style=...`) que talvez existam por lá e garanta que todas as divisões sejam feitas puramente com Tailwind CSS usando as classes `p-4`, `md:p-8`, `flex-col`, `gap-y` para garantir que fique sensacional em um smartphone sem deixar barra de rolagem horizontal. Certifique-se de que os botões (Confirmar, Abrir Câmera, Scan) estejam no formato Width-Full (largura total) no celular!"
