# Publicação do AtalhosTouchpad

## Situação atual

A versão funcional atual é a **1.12.1**. O projeto usa **GPL-3.0-or-later**. O código foi separado em `extension.js`, `native-actions.js` e `prefs.js`; o pacote de instalação inclui schema compilado e traduções compiladas.

Ainda falta criar a identidade pública do projeto. O endereço em `metadata.json` deve ser substituído pelo URL real do repositório antes do envio ao GNOME Extensions.

## 1. Criar a conta e o repositório

1. Acesse <https://github.com/signup> e crie uma conta.
2. Confirme o endereço de e-mail.
3. Crie um repositório público chamado `atalhostouchpad`.
4. Não marque a opção de criar README, `.gitignore` ou licença, pois esses arquivos já existem neste projeto.
5. Copie o URL HTTPS do repositório.

Exemplo de URL final:

```text
https://github.com/SEU_USUARIO/atalhostouchpad
```

## 2. Atualizar a identidade do projeto

Substitua no `metadata.json`:

```json
"url": "https://github.com/"
```

pelo URL real do repositório. O namespace do UUID também deve ser revisado antes do envio. A forma recomendada é usar um identificador único associado à conta, por exemplo:

```json
"uuid": "atalhostouchpad@SEU_USUARIO.github.io"
```

Se o UUID for alterado, o mesmo UUID precisa ser usado no nome da pasta de instalação e no nome do ZIP. O `settings-schema` pode permanecer igual.

O `gettext-domain` também deve permanecer igual ao valor usado pelos diretórios em `locale/`, a menos que seja feita uma migração completa das traduções.

## 3. Enviar o código ao GitHub

Dentro da pasta do projeto:

```bash
cd ~/pincatouch

git init
git branch -M main
git add .
git commit -m "Prepare AtalhosTouchpad 1.12.1 for publication"
git remote add origin https://github.com/SEU_USUARIO/atalhostouchpad.git
git push -u origin main
```

Se o GitHub solicitar autenticação pelo terminal, use o navegador ou um token pessoal. Nunca coloque uma senha ou token dentro dos arquivos do projeto.

## 4. Testar o pacote de publicação

Antes do upload:

```bash
cd ~/pincatouch
rm -f schemas/gschemas.compiled
rm -f locale/*/LC_MESSAGES/*.mo
glib-compile-schemas schemas
msgfmt -o locale/en/LC_MESSAGES/atalhostouchpad@jeffgear23.github.io.mo po/en.po
msgfmt -o locale/es/LC_MESSAGES/atalhostouchpad@jeffgear23.github.io.mo po/es.po
node --check extension.js
node --check native-actions.js
node --check prefs.js
```

Instale o ZIP em uma sessão GNOME de teste e verifique:

- pinças de 2, 3 e 4 dedos;
- swipes de 3 e 4 dedos;
- toque de 4 dedos;
- Top Bar esquerda e direita;
- notificações, painel rápido, Arquivos, volume e brilho;
- gravação de atalhos;
- idioma português, inglês e espanhol;
- desativar e reativar a extensão;
- persistência das preferências.

## 5. Criar o ZIP para o portal

O ZIP enviado ao portal deve conter os arquivos da extensão na raiz, e não uma pasta externa contendo a extensão. Inclua apenas os arquivos necessários:

```bash
cd ~/pincatouch
zip -r ~/atalhostouchpad-publicacao.zip \
  extension.js native-actions.js prefs.js metadata.json README.md LICENSE \
  schemas locale
```

Confirme:

```bash
unzip -t ~/atalhostouchpad-publicacao.zip
unzip -l ~/atalhostouchpad-publicacao.zip
```

Não inclua `.git`, arquivos `*~`, backups, logs ou arquivos pessoais.

## 6. Enviar ao GNOME Extensions

1. Acesse <https://extensions.gnome.org/upload/>.
2. Entre com uma conta GNOME / GitLab.
3. Faça upload de `atalhostouchpad-publicacao.zip`.
4. Escolha a versão GNOME compatível indicada no portal.
5. Preencha nome, descrição, licença GPL-3.0-or-later, URL do repositório e capturas de tela.
6. Envie para revisão.

A revisão verifica principalmente metadados, limpeza no `disable()`, segurança, compatibilidade declarada e qualidade do código. O portal pode solicitar ajustes antes da aprovação.

## 7. Depois da aprovação

- Não altere o UUID entre versões.
- Incremente a versão em cada atualização.
- Atualize o repositório antes de enviar uma nova versão.
- Declare apenas versões GNOME estáveis realmente testadas.
- Responda aos problemas dos usuários no repositório e às solicitações da revisão.

## Pendências pessoais

- [ ] Criar conta GitHub.
- [ ] Criar repositório público.
- [ ] Escolher o UUID final associado à conta.
- [ ] Atualizar `metadata.json` com URL e UUID reais.
- [ ] Fazer push do código.
- [ ] Testar em GNOME 49, 50 e 51.
- [ ] Adicionar capturas de tela.
- [ ] Enviar o ZIP ao GNOME Extensions.
