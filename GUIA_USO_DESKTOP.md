# 📱 BodyTrack - Guia de Uso Desktop

## 🎯 Visão Geral

BodyTrack é um aplicativo desktop para Windows que permite registrar e acompanhar dados de composição corporal através de análise de imagens.

---

## ✅ Requisitos do Sistema

- **Sistema Operacional**: Windows 10 ou superior (64 bits)
- **Espaço em Disco**: Mínimo 500 MB
- **RAM**: Mínimo 2 GB (recomendado 4 GB)
- **Conexão de Internet**: Não é necessária (funciona offline)
- **Permissões**: Permissão para criar arquivos no perfil do usuário

---

## 📦 Instalação e Execução

### Passo 1: Copiar o Aplicativo

1. Copie a pasta **`BodyTrack.exe`** e os arquivos associados para qualquer localização no seu computador
   - Exemplo: `C:\Programas\BodyTrack\` ou `C:\Users\SeuUsuário\Documentos\BodyTrack\`

2. **Importante**: Mantenha todos os arquivos juntos na mesma pasta:
   ```
   BodyTrack/
   ├── BodyTrack.exe
   ├── chrome_100_percent.pak
   ├── chrome_200_percent.pak
   ├── d3dcompiler_47.dll
   ├── ffmpeg.dll
   ├── libEGL.dll
   ├── libGLESv2.dll
   ├── locales/
   ├── resources/
   └── ... (outros arquivos)
   ```

### Passo 2: Executar o Aplicativo

1. **Primeira Execução**:
   - Clique duas vezes em `BodyTrack.exe`
   - Aguarde 5-10 segundos enquanto o banco de dados é criado
   - A janela da aplicação abrirá automaticamente

2. **Execuções Posteriores**:
   - Simplesmente clique duplo em `BodyTrack.exe`
   - Inicia em menos de 3 segundos

### Passo 3: Criar um Atalho (Opcional)

Para facilitar o acesso:

1. Clique com botão direito em `BodyTrack.exe`
2. Selecione **"Criar atalho"**
3. Mova o atalho para a **Área de Trabalho** ou **Iniciar**

---

## 🚀 Primeira Execução

Na primeira execução, o aplicativo:

1. ✅ Criará um banco de dados local em: `C:\Users\[SeuUsuário]\AppData\Roaming\bodytrack\bodytrack.db`
2. ✅ Criará uma pasta para armazenar imagens: `C:\Users\[SeuUsuário]\AppData\Roaming\bodytrack\uploads\`
3. ✅ Inicializará o servidor backend na porta `3001`
4. ✅ Abrirá a interface do usuário

**Primeira tela**: Tela de login

---

## 📋 Como Usar o Aplicativo

### 1. Login

1. Na tela inicial, faça login com as credenciais padrão ou crie uma nova conta
2. Você será redirecionado para a página inicial

### 2. Gerenciar Clientes

**Adicionar Cliente**:
1. Clique em **"Clientes"** no menu
2. Clique em **"Novo Cliente"**
3. Preencha os dados:
   - Nome
   - Gênero (Masculino/Feminino/Outro)
   - Idade
   - Altura (em cm)
4. Clique em **"Salvar"**

**Visualizar Cliente**:
1. Clique no nome do cliente na lista
2. Veja o histórico de avaliações e gráficos de evolução

### 3. Registrar Avaliação

1. Clique em **"Scan"** ou **"Avaliações"**
2. Selecione o cliente
3. Faça upload da imagem do relatório (JPG ou PNG)
   - Certifique-se que a imagem mostra claramente os dados de:
     - Peso
     - Massa Muscular
     - Gordura Corporal
4. O aplicativo extrairá automaticamente os dados via OCR
5. Revise os dados extraídos
6. Clique em **"Salvar"**

### 4. Visualizar Relatórios

1. Clique em **"Relatórios"**
2. Selecione um cliente para ver:
   - Gráfico de evolução de peso
   - Gráfico de evolução de massa muscular
   - Gráfico de evolução de gordura corporal
   - Última avaliação
3. Clique em **"Exportar PDF"** para gerar relatório imprimível

### 5. Histórico

1. Clique em **"Histórico"**
2. Veja todas as avaliações registradas
3. Filtre por cliente ou data

---

## 💾 Dados e Backup

### Localização do Banco de Dados

Os dados são armazenados em:
```
C:\Users\[SeuUsuário]\AppData\Roaming\bodytrack\bodytrack.db
```

### Fazer Backup

1. Navegue até a pasta: `C:\Users\[SeuUsuário]\AppData\Roaming\bodytrack\`
2. Copie o arquivo **`bodytrack.db`**
3. Salve em um local seguro (USB, OneDrive, etc.)

### Restaurar Dados

1. Feche o aplicativo
2. Copie o arquivo **`bodytrack.db`** de backup
3. Cole em: `C:\Users\[SeuUsuário]\AppData\Roaming\bodytrack\`
4. Reinicie o aplicativo

### Transferir para Outro Computador

1. Faça backup do arquivo `bodytrack.db`
2. Instale o BodyTrack no novo computador (siga Passo 1 e 2)
3. Execute uma vez para criar a pasta de dados
4. Feche o aplicativo
5. Copie o arquivo `bodytrack.db` de backup
6. Cole em: `C:\Users\[SeuUsuário]\AppData\Roaming\bodytrack\`
7. Reinicie o aplicativo

---

## ⚙️ Configurações

O aplicativo funciona offline. Não requer configuração adicional após instalação.

### Variáveis de Ambiente (Avançado)

Se precisar customizar, crie um arquivo `.env` na mesma pasta do `BodyTrack.exe`:

```
PORT=3001
UPLOAD_DIR=./uploads
JWT_SECRET=seu-segredo-aqui
OCR_PROVIDER=tesseract
```

---

## 🐛 Troubleshooting

### Problema: "Falha na conexão com o servidor"

**Solução**:
1. Feche o aplicativo completamente
2. Aguarde 5 segundos
3. Execute novamente

### Problema: "Erro ao carregar imagem"

**Solução**:
1. Certifique-se que o arquivo é JPG ou PNG
2. Verifique que o arquivo não está corrompido
3. Tente com outro arquivo

### Problema: "OCR não está extraindo os dados"

**Solução**:
1. Certifique-se que a imagem é clara e legível
2. A imagem deve mostrar claramente os números (peso, massa muscular, gordura corporal)
3. Tente uma imagem com melhor resolução

### Problema: "Erro ao salvar dados"

**Solução**:
1. Verifique se há espaço em disco
2. Certifique-se que não há outro BodyTrack.exe aberto
3. Reinicie o computador e tente novamente

### Problema: "Aplicativo não inicia"

**Solução**:
1. Verifique se você tem permissão de escrita na pasta
2. Tente executar como administrador:
   - Clique direito em `BodyTrack.exe`
   - Selecione **"Executar como administrador"**
3. Verifique se a pasta `resources` existe junto com o `.exe`

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique a seção **Troubleshooting** acima
2. Tente executar como administrador
3. Reinicie o computador
4. Reinstale o aplicativo em nova pasta

---

## 📝 Notas Importantes

- ✅ O aplicativo funciona **completamente offline**
- ✅ Os dados são armazenados **localmente** no seu computador
- ✅ Não requer conexão com a internet
- ✅ Seguro para dados sensíveis (tudo fica no seu PC)
- ⚠️ **Faça backup regularmente** do arquivo `bodytrack.db`
- ⚠️ Não delete a pasta `resources` dentro do diretório do aplicativo

---

## 📊 Dicas de Uso

### Para Melhor OCR

1. Fotografe o relatório diretamente (não de lado)
2. Garanta boa iluminação
3. Evite reflexos ou brilho
4. Use câmera de qualidade

### Para Melhor Performance

1. Mantenha pelo menos 500 MB de espaço em disco livre
2. Feche outros aplicativos pesados se o PC for antigo
3. Reinicie o aplicativo se ficar lento

### Exportar Dados

1. Os dados estão em `bodytrack.db` (SQLite)
2. Pode ser aberto com ferramentas SQLite externas
3. Consulte a documentação de backup para transferências

---

## ✨ Versão

**BodyTrack Desktop v1.0**  
Data: Junho 2026  
Plataforma: Windows 10/11 (64 bits)

---

Aproveite! 🎉
