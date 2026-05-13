# Exemplos de Mensagens Formatadas para Telegram

## Exemplo 1 - Estilo Minimalista

```
✨ Novidade exclusiva

Cenário elegante com iluminação suave
Pose natural e expressiva
Visual moderno e atraente

Quer ver mais?
Clique agora e descubra

[BOTÃO: VER AGORA]
```

## Exemplo 2 - Estilo Promocional

```
🔥 Imperdível

Conteúdo especial acabou de chegar
Qualidade premium
Não deixe passar

Curioso?
Acesse já

[BOTÃO: ENTRAR]
```

## Exemplo 3 - Estilo Descritivo

```
💎 Conteúdo especial

Ambiente sofisticado com detalhes únicos
Composição visual impecável
Cores vibrantes e harmoniosas
Sensação de exclusividade

Interessado?
Confira agora

[BOTÃO: ABRIR]
```

## Exemplo 4 - Estilo Direto

```
⚡ Acabou de chegar

Visual impactante
Estilo marcante
Qualidade garantida

Pronto para ver?
Veja tudo aqui

[BOTÃO: VER MAIS]
```

## Exemplo 5 - Estilo Emocional

```
🌟 Destaque do dia

Momento capturado com perfeição
Emoção genuína e envolvente
Atmosfera única

Vamos lá?
Entre e explore

[BOTÃO: ACESSAR]
```

## Formato HTML (usado no código)

```html
<b>✨ Novidade exclusiva</b>

Cenário elegante com iluminação suave
Pose natural e expressiva
Visual moderno e atraente

Quer ver mais?
<a href="https://t.me/seubot">Clique agora e descubra</a>
```

## Formato com Botão Inline

```javascript
{
  caption: "texto formatado em HTML",
  parse_mode: 'HTML',
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: 'VER AGORA',
          url: 'https://t.me/seubot'
        }
      ]
    ]
  }
}
```

## Variações de Headlines

- ✨ Novidade exclusiva
- 🔥 Imperdível
- 💎 Conteúdo especial
- ⚡ Acabou de chegar
- 🎯 Só hoje
- 🌟 Destaque do dia
- 💫 Não perca
- 🎁 Surpresa especial

## Variações de Pré-CTA

- Quer ver mais?
- Curioso?
- Interessado?
- Quer conferir?
- Pronto para ver?
- Vamos lá?

## Variações de CTA

- Clique agora e descubra
- Acesse já
- Confira agora
- Veja tudo aqui
- Entre e explore
- Descubra mais

## Variações de Botão

- VER AGORA
- ENTRAR
- ABRIR
- VER MAIS
- ACESSAR
- CONFERIR

## Dicas de Formatação

### Negrito
```html
<b>texto em negrito</b>
```

### Itálico
```html
<i>texto em itálico</i>
```

### Link Inline
```html
<a href="https://exemplo.com">texto do link</a>
```

### Código
```html
<code>código</code>
```

### Quebra de Linha
Use `\n` ou simplesmente quebre a linha no texto

## Exemplo Completo de Publicação

```javascript
await bot.telegram.sendPhoto(
  chatId,
  { source: fs.createReadStream('imagem.jpg') },
  {
    caption: `<b>✨ Novidade exclusiva</b>

Cenário elegante com iluminação suave
Pose natural e expressiva
Visual moderno e atraente

Quer ver mais?
<a href="https://t.me/seubot">Clique agora e descubra</a>`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'VER AGORA',
            url: 'https://t.me/seubot'
          }
        ]
      ]
    }
  }
);
```

## Limites do Telegram

- Caption: máximo 1024 caracteres
- Botões: máximo 8 botões por linha
- Linhas de botões: máximo 100 linhas
- Tamanho de imagem: máximo 10MB
- Formatos suportados: JPG, PNG, GIF

## Boas Práticas

1. **Mantenha curto**: Prévias devem ser rápidas de ler no celular
2. **Use emojis com moderação**: 1-2 por prévia é suficiente
3. **CTA claro**: Deixe óbvio o que o usuário deve fazer
4. **Teste no celular**: Sempre visualize como fica no mobile
5. **Varie o conteúdo**: Não repita a mesma estrutura sempre
6. **Link funcional**: Sempre teste se o link está correto
7. **Botão atrativo**: Use verbos de ação no botão

## Erros Comuns a Evitar

❌ Texto muito longo
❌ Muitos emojis
❌ CTA confuso
❌ Link quebrado
❌ Formatação HTML incorreta
❌ Caracteres especiais não escapados
❌ Imagem muito pesada

## Testando Mensagens

Use o endpoint de teste do Telegram:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/sendPhoto" \
  -F "chat_id=<CHAT_ID>" \
  -F "photo=@imagem.jpg" \
  -F "caption=<b>Teste</b>" \
  -F "parse_mode=HTML"
```
