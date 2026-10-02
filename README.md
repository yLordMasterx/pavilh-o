# Pavilhão 9

Jogo de terror em primeira pessoa que roda no navegador (computador e celular).
Hospital Colônia São Lázaro, 1974. Você é o vigia do turno da noite, preso no pavilhão interditado.
Restaure a energia e fuja da enfermeira sem rosto.

## Como rodar
É um site estático, sem etapa de build. Publique a pasta inteira (por exemplo no Vercel, framework "Other")
ou sirva localmente com qualquer servidor estático:

```
npx serve .
```

## Estrutura
- `index.html` e `css/style.css`: página e interface
- `js/map.js`: mapa desenhado à mão, salas e objetos
- `js/nav.js`: colisão, linha de visão e caminhos
- `js/world.js`, `js/props.js`, `js/textures.js`: construção do mundo 3D
- `js/render.js`: visual retrô (PS1 e VHS)
- `js/player.js`, `js/enemy.js`: jogador e a inimiga
- `js/game.js`: regras, roteiro de sustos, save
- `js/audio.js`: sons sintetizados
- `js/story.js`: textos e objetivos
- `classico/`: a primeira versão do jogo
- `vendor/three.module.js`: three.js r128 (licença MIT em `vendor/three-LICENSE`)
