# AGENTS.md

## Projeto
Landing page estática para Dra. Vanessa Costa, com foco em estética avançada, harmonização facial e conversão via WhatsApp.

## Regras principais
- Usar apenas HTML, CSS e JavaScript puro.
- Não instalar dependências.
- Não usar React, Next, Vite, Tailwind ou bibliotecas externas de animação.
- Manter o projeto leve e pronto para Netlify.
- Publicar a raiz do projeto como diretório final.

## Estrutura esperada
- index.html
- README.md
- netlify.toml
- assets/css/style.css
- assets/js/main.js
- assets/img/

## Direção visual
- Página preta e dourada.
- Estética premium, elegante, clínica, sofisticada e feminina.
- Não usar visual genérico.
- Criar botões com brilho, cards com hover, animações suaves e composição editorial com imagens.

## Responsividade
- Priorizar mobile.
- Não permitir scroll horizontal.
- Botões devem ser grandes e fáceis de clicar no celular.
- Imagens devem manter enquadramento bonito em telas pequenas.

## Acessibilidade
- Usar alt em todas as imagens.
- Usar aria-label onde necessário.
- Respeitar prefers-reduced-motion.
- Manter bom contraste entre texto e fundo.

## Deploy
O projeto será publicado no Netlify.
Configuração:
[build]
publish = "."
command = ""

Revise todo o projeto antes do deploy. Verifique:
1. Se todas as imagens estão no caminho correto assets/img/.
2. Se nenhum link de imagem está quebrado.
3. Se o site funciona em mobile, tablet e desktop.
4. Se todos os botões apontam para o WhatsApp.
5. Se não existe dependência NPM.
6. Se o netlify.toml está correto.
7. Se o visual está realmente preto e dourado, premium e responsivo.
8. Se o HTML, CSS e JS estão organizados.
Corrija qualquer problema encontrado.
