# Design System Salla

## Filosofia

Inspirado na identidade visual do Salla: institucional, confiável e didático. Paleta navy + azul elétrico com toques quentes em laranja-âmbar (o "check" do logo), transmitindo autoridade acadêmica sem peso visual em jornadas longas de reserva e gestão.

## Paleta de Cores

| Cor | Dark Mode | Light Mode | Uso |
|---|---|---|---|
| Azul Marinho Primário | `rgb(67,97,238)` | `rgb(30,58,95)` | Títulos institucionais, marca, headers |
| Azul Elétrico Secundário | `rgb(94,124,255)` | `rgb(67,97,238)` | Ações primárias, links, elementos ativos |
| Cinza Neutro | `rgb(136,136,136)` | `rgb(136,136,136)` | Elementos secundários, ícones desabilitados |
| Laranja Âmbar Terciário | `rgb(245,166,35)` | `rgb(245,166,35)` | Destaques, badges, marcação de aprovado/check do logo |
| Verde Sucesso | `rgb(6,214,160)` | `rgb(6,214,160)` | Confirmações, status ativo, reservas aprovadas |
| Vermelho Alerta | `rgb(230,57,70)` | `rgb(230,57,70)` | Alertas, negações, ações destrutivas |
| Amarelo Pendente | `rgb(255,209,102)` | `rgb(255,209,102)` | Estados pendentes, em análise |

## Texto

| Nível | Dark | Light | Tamanho |
|---|---|---|---|
| Primário | `#ffffff` | `#1a1a2e` | Títulos, valores |
| Secundário | `#e0e0e0` | `#555555` | Labels, descrições |
| Terciário | `#888888` | `#888888` | Placeholders, hints |

## Backgrounds

| Elemento | Dark | Light |
|---|---|---|
| Principal | `#16182a` | `#f7f8fa` |
| Cards | `rgba(255,255,255,0.04)` + `backdrop-blur-xl` | `#ffffff` + `shadow-[0_1px_4px_rgba(0,0,0,0.07)]` |
| Bordas | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.06)` |

## Componentes

### Botão Primário
```tsx
className={`px-4 py-2 rounded-lg text-xs transition-all ${
  isDark 
    ? 'bg-gradient-to-r from-[rgba(67,97,238,0.7)] to-[rgba(94,124,255,0.5)] text-white hover:opacity-90' 
    : 'bg-gradient-to-r from-[rgba(67,97,238,0.95)] to-[rgba(30,58,95,0.85)] text-white hover:opacity-90'
}`}
```

### Card Glassmorphism
```tsx
className={`rounded-xl backdrop-blur-[40px] ${
  isDark
    ? 'bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] shadow-[0px_8px_32px_0px_rgba(0,0,0,0.45)]'
    : 'bg-[rgba(255,255,255,0.95)] border border-[rgba(0,0,0,0.06)] shadow-[0px_4px_24px_0px_rgba(30,58,95,0.08)]'
}`}
```

### Modal

Padrão canônico — o `EditarModal` (`pages/shared/ReservasSala.jsx`) é a referência. Painel sólido sobre overlay escurecido com blur; o painel em si **não** usa `backdrop-blur` nem fundos translúcidos.

```tsx
{/* Overlay: blur só aqui, no que está atrás do modal */}
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
  {/* Painel: superfície sólida, borda suave, sombra discreta */}
  <div
    className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden
               rounded-xl border border-[var(--color-border-soft)]
               bg-[var(--color-surface)]"
    style={{ boxShadow: "0px 8px 40px 0px rgba(30,58,95,0.18)" }}
  >
    {/* Header fixo */}
    <div className="flex-shrink-0 px-6 pt-5 pb-4">...</div>
    {/* Corpo scrollável */}
    <div className="flex-1 overflow-y-auto px-6 py-5 border-t border-[var(--color-border-soft)]">...</div>
    {/* Footer fixo (quando houver ações) */}
    <div className="flex-shrink-0 border-t border-[var(--color-border-soft)] px-6 py-4">...</div>
  </div>
</div>
```

**Regras fixas**
- Painel: `bg-[var(--color-surface)]` sólido (`#ffffff` no light, `#1f2238` no dark). Nunca `bg-bg-card`/`bg-[rgba(...)]` translúcido nem `backdrop-blur` no painel.
- Borda: `border-[var(--color-border-soft)]`. Divisórias internas: a mesma cor (`border-t border-[var(--color-border-soft)]`), sem mudar o tom de fundo entre header/corpo/footer.
- Sombra: `0px 8px 40px 0px rgba(30,58,95,0.18)` via `style`.
- Largura: `max-w-6xl` para modais grandes (edição), `max-w-md`/`max-w-lg` para confirmações.
- Altura: `max-h-[92vh]` + `overflow-hidden` no painel; scroll **interno** na área de conteúdo (ver _Política Anti-Scroll_).
- Inputs/selects dentro do modal: `bg-[var(--color-surface-2)]` com `border-[var(--color-border-soft)]`.
- Botão "fechar" (X) no canto superior direito do header, sem fundo, com hover em `bg-[var(--color-surface-2)]`.

## Regras

- Fonte: `system-ui, sans-serif` (padrão global); marca "Salla" em Georgia/serif
- Títulos de página: `text-[1.4rem] font-bold text-[#1e3a5f]`, sem gradiente
- Botões: `text-[0.9rem] font-bold` (compactos: `text-[0.8rem]`)
- Ícones de lixeira/cancelar: sempre vermelho alerta (`rgb(230,57,70)`), nunca rosa
- Background de página: gerenciado pelo `Navbar` wrapper (`#f7f8fa`); páginas internas não devem sobrescrever
- Gradientes: apenas em estados ativos, badges de marca e avatares — nunca em texto corrido
- Acento âmbar (`rgb(245,166,35)`): reservado para reforçar a identidade do "check" do logo (selos de aprovado, ícones de verificação institucional). Não usar como cor de ação primária.

## Cores Proibidas

- `#00e5cc`, `#00a88c` (verde água — usar `rgb(6,214,160)`)
- `#ff0080`, `#c00060` (rosa antigo)
- `#8b5cf6` (roxo — fora da paleta institucional)
- `#0080ff` (azul genérico — usar `rgb(67,97,238)` / `rgb(30,58,95)`)
- `#ffaa00` (âmbar saturado — usar `rgb(245,166,35)` do check do logo)


---

## Política Anti-Scroll

### Diretriz

Painéis, modais e drawers que abrem sobre a tela devem caber inteiramente na viewport sem exigir scroll do usuário. O conteúdo precisa ser visível de uma vez só — o usuário não deve precisar rolar para encontrar ações ou informações relevantes.

Isso se aplica especialmente a:
- Modais de ação (confirmar/negar reserva, cancelamento, formulários rápidos)
- Drawers laterais
- Painéis flutuantes e popovers com conteúdo estruturado

### Como implementar

**1. Altura máxima com scroll interno**

O container do modal/drawer nunca deve ultrapassar a viewport. Use `max-h` com margem de segurança e delegue o scroll para a área de conteúdo interno, nunca para o painel inteiro.

```tsx
// Container do modal
<div className="flex flex-col max-h-[90vh] overflow-hidden rounded-xl">
  {/* Header fixo */}
  <div className="flex-shrink-0 p-5 border-b ...">...</div>

  {/* Corpo com scroll interno se necessário */}
  <div className="flex-1 overflow-y-auto p-5">...</div>

  {/* Footer fixo com ações */}
  <div className="flex-shrink-0 p-4 border-t ...">...</div>
</div>
```

**2. Layout em colunas para modais com múltiplas seções**

Quando o conteúdo tem duas áreas distintas (ex: seleção de sala + janela de horário), use `flex-row` em vez de empilhar verticalmente. Isso reduz a altura necessária e mantém tudo visível.

```tsx
<div className="flex flex-row gap-0 flex-1 overflow-hidden">
  <div className="w-52 flex-shrink-0 border-r overflow-y-auto p-4">
    {/* Painel esquerdo */}
  </div>
  <div className="flex-1 min-w-0 overflow-y-auto p-4">
    {/* Painel direito */}
  </div>
</div>
```

**3. Evitar altura fixa em containers internos**

Não use `h-[Xpx]` fixo em containers que dependem do conteúdo. Prefira `min-h-0` + `flex-1` para que o layout se adapte ao espaço disponível.

```tsx
// ❌ Evitar
<div className="h-[400px] overflow-y-auto">

// ✅ Preferir
<div className="flex-1 min-h-0 overflow-y-auto">
```

**4. Ações sempre visíveis**

Botões de confirmação/cancelamento devem estar no footer fixo (`flex-shrink-0`), nunca no final de uma lista scrollável. O usuário não deve precisar rolar para confirmar uma ação.

### Referência de implementação

O `ActionConfirmModal` da página `pages/admin/Reservas.jsx` é o exemplo canônico desta política: painel compacto centrado, header e footer fixos, e ação principal (Confirmar/Negar) sempre visível sem scroll.
