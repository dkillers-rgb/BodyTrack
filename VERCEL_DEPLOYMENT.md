# Guia de Deploy no Vercel — BodyTrack

Este documento descreve passo a passo como fazer o deploy da aplicação **BodyTrack** no Vercel.

## 📋 Pré-requisitos

- ✅ Conta no Vercel ([vercel.com](https://vercel.com))
- ✅ Conta no GitHub, GitLab ou Bitbucket com acesso ao repositório do BodyTrack
- ✅ Repositório remoto atualizado com as mudanças (incluindo `vercel.json` e build compilado)
- ✅ Backend hospedado separadamente (Render, Railway, DigitalOcean, etc.) — veja a seção [Deploy do Backend](#-deploy-do-backend)

---

## 🚀 Opção A: Deploy via Interface Web (Recomendado para Iniciantes)

### Passo 1: Fazer Push das Mudanças para o Repositório

```bash
git add .
git commit -m "Prepare web for Vercel: add vercel.json and build"
git push origin main
```

### Passo 2: Acessar o Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login com sua conta.
2. Clique no botão **"New Project"** (ou acesse [vercel.com/new](https://vercel.com/new)).

### Passo 3: Importar o Repositório

1. Na tela "Import Git Repository", selecione o serviço (GitHub, GitLab, Bitbucket).
2. Autorize o Vercel a acessar sua conta.
3. Localize e clique no repositório **BodyTrack**.

### Passo 4: Configurar o Projeto

Após selecionar o repositório, você verá a tela de configuração:

#### **Project Name**
- Digite um nome para o projeto (ex.: `bodytrack-web`)

#### **Root Directory**
- Deixe **em branco** ou `/` (o arquivo `vercel.json` na raiz detectará automaticamente a pasta `web`)

#### **Framework Preset**
- Deixe como **"Other"** (será detectado automaticamente via `vercel.json`)

#### **Build Command**
- Deixe **em branco** (já está configurado no `vercel.json` como `npm run build --workspace=web`)

#### **Output Directory**
- Deixe **em branco** (já está configurado no `vercel.json` como `web/dist`)

#### **Install Command**
- Deixe **em branco** (padrão: `npm install`)

### Passo 5: Adicionar Variáveis de Ambiente

Se o frontend precisa se conectar a um backend remoto, adicione:

```
VITE_API_URL = https://bodytrack-ph0z.onrender.com
```

Se você usa o backend localmente em desenvolvimento, defina:

```
VITE_API_URL = http://localhost:10000
```

Ou ajuste para o endereço do backend que estiver ativo.

**Como adicionar:**
1. Na tela de configuração, clique em **"Environment Variables"**
2. Adicione as variáveis com seus respectivos valores
3. Selecione quais ambientes (Production, Preview, Development) devem usar essas variáveis

### Passo 6: Deploy

1. Clique em **"Deploy"**.
2. Aguarde a build concluir (geralmente 1-3 minutos).
3. Após conclusão, você receberá um URL público (ex.: `https://bodytrack-web.vercel.app`).

### Passo 7: Verificar o Deploy

1. Abra a URL fornecida pelo Vercel.
2. Teste a aplicação:
   - Login funciona?
   - Relatórios carregam?
   - Filtro por nome funciona?
   - API chamadas apontam para seu backend?

---

## ⚙️ Opção B: Deploy via CLI (Para Usuários Avançados)

### Passo 1: Instalar Vercel CLI

```bash
npm install -g vercel
```

### Passo 2: Fazer Login

```bash
vercel login
```

Siga as instruções e autorize sua conta Vercel.

### Passo 3: Deploy em Produção

Na raiz do repositório, execute:

```bash
vercel --prod
```

Siga os prompts:
- **Project name**: Digite `bodytrack-web` (ou seu nome preferido)
- **Directory**: Deixe em branco (usará `vercel.json`)
- **Settings overrides**: Deixe em branco (usará `vercel.json`)

### Passo 4: Aguarde e Verifique

A build será executada e o URL de produção será exibido no terminal.

---

## 🔧 Configuração Avançada

### Redeploying com Atualizações

Depois que o projeto estiver no Vercel, qualquer push na branch `main` (ou branch conectada) acionará um novo deploy automaticamente.

### Variáveis de Ambiente Adicionadas Após o Deploy

Se precisar adicionar variáveis posteriormente:

1. Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
2. Clique no projeto **bodytrack-web**
3. Acesse **Settings** → **Environment Variables**
4. Adicione as variáveis e salve
5. Redeployar (via novo push ou botão "Redeploy" no Vercel)

### Redeploying Manual

1. No dashboard do Vercel, clique no projeto
2. Clique em **"Deployments"**
3. Encontre o deploy desejado
4. Clique nos 3 pontinhos e selecione **"Redeploy"**

---

## 🌐 Deploy do Backend

O backend do BodyTrack **não pode ser deployado diretamente no Vercel** como está (usa dependências nativas como `sharp` e `tesseract.js`).

### Opção Recomendada: Render ou Railway

#### **Com Render.com (Recomendado):**

1. Acesse [render.com](https://render.com)
2. Clique em **"New Web Service"** (ou "New +" → "Web Service")
3. Conecte seu repositório Git (GitHub, GitLab ou Bitbucket)
4. Autorize o Render a acessar sua conta
5. Selecione o repositório **BodyTrack**
6. Configure:
   - **Name**: `bodytrack-backend` (ou seu nome preferido)
   - **Repository**: BodyTrack
   - **Branch**: `main` (ou sua branch padrão)
   - **Runtime**: `Docker` (será detectado automaticamente pelo Dockerfile)
   - **Build Command**: Deixe em branco (será executado automaticamente)
   - **Start Command**: Deixe em branco (será usado do Dockerfile)
7. Adicione variáveis de ambiente (clique em "Advanced" ou "Environment"):
   ```
   DATABASE_URL = postgresql://user:password@host:5432/bodytrack
   JWT_SECRET = seu_jwt_secret_seguro_aqui
   GOOGLE_VISION_API_KEY = sua_chave_google_vision (opcional)
   OPENAI_API_KEY = sua_chave_openai (opcional)
   OCR_PROVIDER = tesseract
   UPLOAD_DIR = ./uploads
   NODE_ENV = production
   ```
8. Clique em **"Create Web Service"**
9. Aguarde o build e deploy (5-10 minutos na primeira vez)
10. Você receberá uma URL pública (ex.: `https://bodytrack-backend.onrender.com`)

**Nota:** O Render detectará automaticamente o `Dockerfile` na pasta `backend` e fará o build via Docker.

#### **Com Railway.app:**

1. Acesse [railway.app](https://railway.app)
2. Clique em **"Start a New Project"**
3. Selecione **"Deploy from GitHub Repo"**
4. Autorize e selecione o repositório **BodyTrack**
5. Selecione a branch (geralmente `main`)
6. Railway detectará o `Dockerfile` automaticamente
7. Configure variáveis de ambiente:
   ```
   DATABASE_URL = postgresql://user:password@host:5432/bodytrack
   JWT_SECRET = seu_jwt_secret_seguro_aqui
   GOOGLE_VISION_API_KEY = sua_chave_google_vision (opcional)
   OPENAI_API_KEY = sua_chave_openai (opcional)
   OCR_PROVIDER = tesseract
   UPLOAD_DIR = ./uploads
   NODE_ENV = production
   ```
8. Deploy (Railway fará build via Docker)
9. Você receberá uma URL pública

---

## 🐳 Sobre o Dockerfile

O arquivo `backend/Dockerfile` está configurado para:

- **Usar Node.js 20 Alpine** (imagem leve)
- **Instalar dependências nativas** necessárias para `sharp` e `tesseract.js`
- **Build em dois estágios** (builder → runtime) para reduzir tamanho da imagem
- **Compilar TypeScript** durante o build
- **Expor porta 3001** (compatível com backend Express)
- **Criar diretório `/uploads`** para armazenar arquivos

Este Dockerfile é compatível com:
- Render.com
- Railway.app
- Docker (local)
- DigitalOcean App Platform
- Qualquer plataforma que suporte Docker/Containers

### Testar Localmente

Se quiser testar o Dockerfile antes de fazer deploy:

```bash
# Build da imagem
docker build -t bodytrack-backend:latest ./backend

# Executar container
docker run -p 3001:3001 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="seu_secret" \
  bodytrack-backend:latest
```

A aplicação estará disponível em `http://localhost:3001`.

---

## 📝 Exemplo: Variáveis de Ambiente Completas

Para o frontend (`VITE_` prefixo):

```env
VITE_API_URL=https://seu-backend.render.com/api
```

Para o backend (quando hospedado separadamente):

```env
DATABASE_URL=postgresql://user:password@host:5432/bodytrack
JWT_SECRET=seu_jwt_secret_seguro_aqui
GOOGLE_VISION_API_KEY=sua_chave_google_vision (opcional)
OPENAI_API_KEY=sua_chave_openai (opcional)
OCR_PROVIDER=tesseract
UPLOAD_DIR=./uploads
```

---

## 🔒 Configuração de Domínio Personalizado

1. No dashboard do Vercel, clique no projeto
2. Acesse **Settings** → **Domains**
3. Clique em **"Add Domain"**
4. Insira seu domínio (ex.: `bodytrack.com`)
5. Siga as instruções para atualizar registros DNS no seu registrador
6. Aguarde propagação de DNS (5-48 horas)

---

## ✅ Checklist Final

Antes de considerar o deploy completo:

- [ ] Frontend (`web`) deployado no Vercel
- [ ] Backend hospedado em Render/Railway/outro
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] `VITE_API_URL` aponta para seu backend público
- [ ] Login funciona
- [ ] Leitura de QR Code funciona
- [ ] Relatórios e filtros funcionam
- [ ] Domínio personalizado (opcional)
- [ ] HTTPS ativado (automático no Vercel)

---

## 🐛 Troubleshooting

### Erro: "Build failed"
- Verifique se `web/package.json` tem `build` script
- Confira se todas as dependências estão instaladas
- Veja logs no Vercel Dashboard

### Erro: "API URL não definida" ou erro de conexão
- Confirme `VITE_API_URL` está configurada no Vercel
- Teste se a URL do backend é acessível publicamente
- Verifique CORS no backend

### Erro: "Module not found"
- Verifique importações relativas em `web/src`
- Rebuild localmente: `npm run build:web`
- Redeploy no Vercel

### Deploy lento
- Verifique tamanho do bundle (warning no build)
- Considere code-splitting dinâmico
- Otimize imagens

---

## 📚 Referências

- [Documentação Vercel](https://vercel.com/docs)
- [Vercel CLI](https://vercel.com/cli)
- [Render Docs](https://render.com/docs)
- [Railway Docs](https://docs.railway.app)

---

**Última atualização:** 2026-06-23  
**Status:** Pronto para produção
