# 🚀 Como Rodar o Projeto em Outro Computador

Este guia contém o passo a passo completo para executar o **Projeto Viva Feliz** em qualquer outro computador.

---

## 📋 Pré-requisitos
No novo computador, você precisa ter instalado:
1. **Node.js** (Versão 20 ou superior recomendada): [https://nodejs.org](https://nodejs.org)
2. **Git** (Opcional, caso clone via repositório): [https://git-scm.com](https://git-scm.com)
3. **VS Code** ou editor de sua preferência.

---

## 📦 Método 1: Se você copiou a pasta (Pen Drive, Zip ou Nuvem)

1. **Abra a pasta do projeto no VS Code / Terminal:**
   ```bash
   cd projeto_viva_feliz_Senador
   ```

2. **Verifique o arquivo `.env.local`:**
   - Se o `.env.local` não veio junto na cópia, crie um arquivo chamado `.env.local` na raiz e copie o conteúdo de `.env.example`.
   - *Nota:* O banco de dados (Neon PostgreSQL) é hospedado na nuvem, portanto **já está pronto para uso e conectado** sem precisar instalar banco local.

3. **Instale as dependências:**
   ```bash
   npm install
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

5. **Acesse no navegador:**
   - **Painel Geral:** [http://localhost:3000](http://localhost:3000)
   - **Login Geral:** [http://localhost:3000/auth](http://localhost:3000/auth)
   - **Painel Administrador:** [http://localhost:3000/admin](http://localhost:3000/admin)
   - **Área do Voluntário:** [http://localhost:3000/volunteer/dashboard](http://localhost:3000/volunteer/dashboard)
   - **Scanner / Leitor QR Code:** [http://localhost:3000/volunteer/scanner](http://localhost:3000/volunteer/scanner)
   - **Consulta de Cartão:** [http://localhost:3000/participante/cartao](http://localhost:3000/participante/cartao)
   - **Painel do Leilão:** [http://localhost:3000/public/leilao](http://localhost:3000/public/leilao)

---

## 🛠️ Comandos Úteis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor local de desenvolvimento |
| `npm run build` | Gera o build de produção e valida tipos TypeScript |
| `npm run start` | Executa o build de produção |
| `npm run db:studio` | Abre a interface visual do Drizzle para navegar no banco |
| `npm run db:push` | Sincroniza alterações no schema com o banco Neon |
| `npx tsx scripts/create-admin-user.ts` | Cria/atualiza um usuário administrador |

---

## ⚠️ Dúvidas Frequentes

- **Erro de porta 3000 ocupada:** O Next.js usará automaticamente a porta `3001` se a `3000` estiver em uso.
- **Leitor de Câmera/Scanner:** Para usar a câmera do scanner QR em outro dispositivo na mesma rede local, use o IP da máquina (ex: `http://192.168.x.x:3000`) ou `localhost` na própria máquina.
