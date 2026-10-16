# AtalhosTouchpad 1.12.1

Extensão GNOME Shell para transformar pinças e gestos do touchpad em ações nativas do GNOME ou atalhos de teclado configuráveis.

## Gestos

A extensão reconhece pinças de:

- 2 dedos;
- 3 dedos;
- 4 dedos.

Cada quantidade possui dois atalhos independentes:

- pinça para dentro, com escala menor que 1;
- pinça para fora, com escala maior que 1.

O gesto precisa ultrapassar o limiar de 12% e a ação é enviada uma vez ao terminar a pinça.

## Configuração

Cada direção oferece uma lista de atalhos predefinidos e a opção **Atalho personalizado…**. A opção **Gravar** continua disponível para escolher qualquer combinação de modificadores e uma tecla. Use **Limpar** para desativar uma direção.

As predefinições universais incluem **Anterior** (`Alt+←`), **Próximo** (`Alt+→`), **Mostrar notificações**, **Arquivos**, **Nova aba do navegador** (`Ctrl+T`) e **Fechar aba do navegador** (`Ctrl+W`). Mostrar notificações usa primeiro o menu nativo de data/notificações do GNOME e recorre a `Super+M` como fallback. **Arquivos** abre diretamente a pasta pessoal no aplicativo de arquivos padrão e usa `Super+E` como fallback. Elas podem ser usadas em qualquer gesto ou região configurável.

As predefinições incluem visão geral, mostrar painel rápido, aplicativos, workspaces, troca de aplicativos, fechar janela, bloquear tela, captura de tela, volume e brilho. A opção Mostrar área de trabalho foi removida por incompatibilidade observada no teste. As ações nativas do GNOME usam as APIs do Shell quando disponíveis e têm fallback para atalhos de teclado.

O botão **Gravar** fica oculto enquanto uma predefinição está selecionada e aparece ao escolher **Atalho personalizado…**.

A aba **Gestos** adiciona swipes de 3 e 4 dedos para cima, baixo, esquerda e direita, além de toque com 4 dedos. Ela usa a mesma lista de predefinições e o mesmo gravador de atalhos da aba **Pinças**.

O toque com 4 dedos possui um slider contínuo de **0,1 a 250 ms**, com precisão de 0,1 ms. O padrão é **250 ms**. Valores antigos acima do novo limite são ajustados automaticamente para 250 ms. Também é possível selecionar **Aceitar qualquer duração**, que mantém a detecção do toque, mas ignora somente o limite de tempo.

As configurações do toque com 4 dedos ficam na aba visual **Toque**.

As predefinições também incluem atalhos comuns de abas, disponíveis em todas as opções: **Aba anterior** (`Ctrl+Shift+Tab`) e **Próxima aba** (`Ctrl+Tab`).

A aba **Top Bar** é dividida em regiões **esquerda** e **direita**, com atalhos independentes para rolagem para cima e para baixo. Ela aceita as mesmas predefinições e o mesmo atalho personalizado das demais abas. Quando uma região/direção não está configurada, a rolagem continua sendo propagada normalmente para o GNOME.

A aba **Top Bar** também possui um slider de sensibilidade entre `0,1x` e `5,0x`. O valor `1,0x` preserva o comportamento original; valores maiores disparam com menos movimento acumulado e valores menores exigem mais movimento.

Na aba **Top Bar**, recomenda-se usar as predefinições de volume e brilho, pois elas enviam as teclas multimídia padrão do GNOME e funcionam independentemente do aplicativo ativo.

Quando um gesto não possui configuração, a PinçaTouch não o bloqueia: o evento é propagado e o comportamento padrão do GNOME continua disponível. Quando há um atalho configurado, a extensão captura aquele gesto e executa o atalho escolhido.

## Instalação

O arquivo precisa manter o nome `pincatouch@manus.local.zip` e a extensão deve ser instalada com:

```bash
gnome-extensions install --force pincatouch@manus.local.zip
gnome-extensions enable pincatouch@manus.local
```

A sessão GNOME precisa oferecer eventos `TOUCHPAD_PINCH` ao Clutter. A extensão não usa X11, libinput direto, Touchégg ou APIs internas de swipe, e não desativa gestos nativos.

A compatibilidade declarada inclui GNOME 49, 50 e 51. GNOME 45–48 foram retirados da lista por não fazerem parte do alvo atual de compatibilidade. Versões futuras podem exigir atualização do metadata ou do código.

## Idiomas

A interface de preferências está preparada para português, inglês e espanhol por meio de gettext. Os catálogos fonte ficam em `po/` e os catálogos compilados ficam em `locale/`.

## Licença

Este projeto é distribuído sob a licença **GNU General Public License v3.0 or later**. Consulte o arquivo `LICENSE`.

As instruções para criar o repositório, preparar o pacote e enviar a extensão ao GNOME Extensions estão em [`PUBLICACAO.md`](PUBLICACAO.md).
