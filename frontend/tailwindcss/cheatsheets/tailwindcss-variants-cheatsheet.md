---
title: "Tailwind CSS Variants and Conditional Styling Cheatsheet"
description: "A quick reference for Tailwind CSS's variant system: pseudo-class and pseudo-element variants, group and peer modifiers, data-attribute and ARIA variants, nth-child selectors, variant stacking, arbitrary variants, and CSS-first custom variants in v4."
category: "frontend"
technology: "tailwindcss"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Tailwind CSS Variants and Conditional Styling Cheatsheet

## Quick Reference Table

| Variant family | Example | Purpose |
|----------------|---------|---------|
| Pseudo-class | `hover:bg-indigo-600` | Apply styles on mouse hover |
| Keyboard focus | `focus-visible:ring-2` | Apply styles on keyboard focus only |
| Pseudo-element | `before:content-['']` | Style the generated `::before` box |
| Group | `group-hover:opacity-100` | Style children when the `.group` ancestor matches |
| Peer | `peer-checked:block` | Style following siblings of a matched input |
| Data attribute | `data-[state=open]:block` | Style when a custom attribute matches |
| ARIA state | `aria-expanded:rotate-180` | Style on an ARIA attribute state |
| Breakpoint | `md:grid-cols-3` | Apply at a minimum viewport width |
| Motion | `motion-reduce:transition-none` | Respect the reduced-motion preference |
| Orientation | `portrait:flex-col` | Apply by viewport orientation |
| Direction | `rtl:mr-0` | Apply in right-to-left contexts |
| Print | `print:hidden` | Apply only to print media |
| nth-child | `odd:bg-gray-50` | Style alternating children |
| Child selector | `*:my-2` | Style every direct child |
| Arbitrary variant | `[&:nth-child(3)]:block` | Use any raw selector |

## Common Commands

### Pseudo-Class State Variants

```text
hover:bg-blue-600                  /* &:hover                       */
focus:ring-2                       /* &:focus                       */
focus-visible:ring-2               /* &:focus-visible (keyboard)    */
focus-within:shadow-md             /* &:focus-within (child focus)  */
active:scale-95                    /* &:active (while pressed)      */
visited:text-purple-600            /* &:visited                     */
target:border-indigo-500           /* &:target (anchor target)      */
```

```text
disabled:opacity-50                /* &:disabled                    */
enabled:shadow-md                  /* &:enabled                     */
checked:bg-indigo-600              /* &:checked                     */
indeterminate:bg-gray-300          /* &:indeterminate               */
required:border-red-400            /* &:required                    */
valid:border-green-500             /* &:valid                       */
invalid:border-red-500             /* &:invalid                     */
placeholder-shown:border-gray-200  /* &:placeholder-shown           */
autofill:shadow-[inset_0_0_0_100px_#fff]  /* &:autofill             */
read-only:bg-gray-100              /* &:read-only                   */
open:rotate-180                    /* &:open (details, dialog)      */
default:ring-2                     /* &:default (default option)    */
```

### Pseudo-Element Variants

```text
before:content-['']                /* &::before (needs content)     */
after:content-['']                 /* &::after (needs content)      */
first-letter:text-4xl              /* &::first-letter               */
first-line:uppercase               /* &::first-line                 */
marker:text-emerald-500            /* &::marker (list bullets)      */
selection:bg-amber-200             /* &::selection                  */
file:mr-4                          /* &::file-selector-button       */
placeholder:text-gray-400          /* &::placeholder                */
backdrop:bg-black/50               /* &::backdrop (dialog layer)    */
```

### Stacking and Combining Variants

```text
dark:hover:bg-gray-800             /* hover only inside dark mode   */
md:focus:ring-2                    /* focus only at md and up       */
group-hover:opacity-100            /* group plus pseudo-class       */
sm:hover:active:scale-95           /* three-deep stack              */
has-[input:checked]:bg-indigo-50   /* parent of a checked input     */
```

Variants compose from the outside in — the leftmost variant produces the outermost selector. For example, `md:hover:` compiles to a `@media (min-width: 48rem)` block that contains the `&:hover` rule, and `dark:hover:` only applies the hover when the dark marker is present.

### Group and Peer Variants

```text
group                              /* mark the parent element       */
group-hover:text-white             /* child styles on group hover   */
group-focus-within:border-blue-500 /* group focus state             */
group-active:scale-100             /* group pressed state           */
group-aria-expanded:block          /* group plus ARIA state         */
group-data-[state=open]:block      /* group plus data attribute     */

group/name                         /* named group on the parent     */
group-hover/name:opacity-100       /* target that named group       */

peer                               /* mark a preceding sibling      */
peer-checked:block                 /* style following sibling       */
peer-focus-visible:ring-4          /* keyboard focus on peer        */
peer-invalid:text-red-500          /* validation state on peer      */

peer/rating                        /* named peer                    */
peer-checked/rating:opacity-100    /* style the matching peer       */
```

Named groups and peers (`group/name`, `peer/name`) let you nest several group or peer relationships on one element without ambiguity — the modifier prefix must include the same name (`group-hover/name:`).

### Data Attribute and ARIA Variants

```text
data-[state=open]:block            /* any custom attribute          */
data-[size=lg]:p-6                 /* exact value match             */
group-data-[open]:visible          /* data attribute on the group   */
aria-checked:bg-indigo-600         /* aria-checked="true"           */
aria-expanded:rotate-180           /* aria-expanded="true"          */
aria-hidden:hidden                 /* aria-hidden="true"            */
aria-invalid:border-red-500        /* aria-invalid="true"           */
aria-pressed:bg-gray-900           /* aria-pressed="true"           */
aria-selected:font-semibold        /* aria-selected="true"          */
aria-[sort=ascending]:bg-gray-100  /* arbitrary ARIA value          */
supports-[display:grid]:grid       /* feature query (@supports)     */
```

Built-in `aria-*` variants map to the attribute being exactly `"true"`. For any other value, or for attributes without a built-in variant, use the arbitrary form `data-[...]:` and `aria-[...]:`.

### nth-child and Descendant Variants

```text
first:rounded-t-lg                 /* :first-child                  */
last:rounded-b-lg                  /* :last-child                   */
only:flex                          /* :only-child                   */
odd:bg-gray-50                     /* :nth-child(odd)               */
even:bg-white                      /* :nth-child(even)              */
first-of-type:mt-0                 /* :first-of-type                */
last-of-type:mb-0                  /* :last-of-type                 */
empty:hidden                       /* :empty                        */
*:my-2                             /* every direct child (& > *)     */
[&>svg]:size-4                     /* arbitrary direct child        */
[&_p]:text-gray-600                /* arbitrary descendant          */
```

### Breakpoint and Media Variants

```text
sm:...     min-width: 40rem (640px)    md:...     48rem (768px)
lg:...     64rem (1024px)              xl:...     80rem (1280px)
2xl:...    96rem (1536px)              3xl:...    120rem (1920px, v4)
max-sm:... max-width at the 640px breakpoint (v3.2+)
min-[700px]:...  arbitrary minimum     max-[700px]:...  arbitrary maximum
dark:...   prefers-color-scheme: dark (or the dark marker)
light:...  prefers-color-scheme: light (v4)
portrait:...  orientation: portrait    landscape:...  landscape
motion-safe:...  reduced-motion: no-preference
motion-reduce:...  reduced-motion: reduce
contrast-more:...  contrast: more      contrast-less:...  contrast: less
print:...  print media                 rtl:...  direction: rtl
ltr:...    direction: ltr              forced-colors:...  forced colors
```

### Arbitrary Variants

```text
[&:nth-child(3)]:block           /* raw pseudo-class               */
[&[data-state="open"]]:block     /* attribute plus state           */
[&>*]:mt-4                       /* arbitrary direct child         */
[&_.tooltip]:absolute            /* descendant selector            */
[@media(any-hover:hover)]:block  /* raw media query                */
[&:is(.active, [data-open])]:visible  /* complex selector          */
```

In an arbitrary variant the `&` is a placeholder for the element itself, and everything inside the brackets is inserted into the generated selector as-is. Use underscores for spaces, just like arbitrary utilities.

### Defining Custom Variants (v4 CSS-first)

```css
/* Entry CSS file */
@import "tailwindcss";

/* Multi-selector variant */
@variant hocus (&:hover, &:focus);

/* Shorthand for a single selector */
@custom-variant dark (&:where(.dark, .dark *));

/* Skip spacing on every child after the first */
@custom-variant not-first (&:not(:first-child));
```

The new variants then work like built-ins — `hocus:bg-indigo-100`, `not-first:mt-4` — including stacking and `@apply` support.

The v3 equivalent lives in JavaScript configuration:

```javascript
// tailwind.config.js (v3)
const plugin = require('tailwindcss/plugin')

module.exports = {
  plugins: [
    plugin(function ({ addVariant }) {
      addVariant('hocus', ['&:hover', '&:focus'])
    }),
  ],
}
```

## Code Snippets

### Form Control State Patterns

```html
<button
  class="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white
    hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2
    focus-visible:ring-indigo-400 focus-visible:ring-offset-2
    active:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
  disabled
>
  Submit
</button>
```

```html
<input
  type="email"
  class="w-full rounded-lg border-2 border-gray-300 px-3 py-2
    focus:border-indigo-500 focus:outline-none
    invalid:border-red-500 invalid:focus:border-red-500"
  required
/>
```

### Group-Hover Card Reveal

```html
<div class="group relative rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-lg">
  <h3 class="text-gray-900 transition group-hover:text-indigo-600">
    Tailwind CSS Variants
  </h3>
  <p class="mt-2 translate-y-1 text-sm text-gray-500 opacity-0 transition
    group-hover:translate-y-0 group-hover:opacity-100">
    This caption fades in when the card is hovered.
  </p>
</div>
```

### Peer-Based Custom Checkbox

```html
<div class="flex items-center gap-3">
  <input id="remember" type="checkbox" class="peer sr-only" />
  <label
    for="remember"
    class="h-5 w-5 cursor-pointer rounded border-2 border-gray-300
      transition peer-checked:border-indigo-600 peer-checked:bg-indigo-600
      peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-200"
  ></label>
  <label for="remember" class="select-none text-sm text-gray-700">
    Remember me
  </label>
</div>
```

### Data-Attribute Driven Tabs

```html
<nav class="flex gap-1 rounded-xl bg-gray-100 p-1">
  <a
    href="#general"
    class="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600
      data-[state=active]:bg-white data-[state=active]:text-gray-900
      data-[state=active]:shadow-sm"
    data-state="active"
  >
    General
  </a>
  <a
    href="#billing"
    class="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600
      data-[state=active]:bg-white data-[state=active]:text-gray-900
      data-[state=active]:shadow-sm"
  >
    Billing
  </a>
</nav>
```

### Striped Table with nth-child

```html
<table class="w-full text-sm">
  <tbody>
    <tr class="odd:bg-gray-50 hover:bg-indigo-50">
      <td class="px-4 py-2">Accounting</td>
      <td class="px-4 py-2">24 min</td>
    </tr>
    <tr class="odd:bg-gray-50 hover:bg-indigo-50">
      <td class="px-4 py-2">Design review</td>
      <td class="px-4 py-2">48 min</td>
    </tr>
  </tbody>
</table>
```

### Custom Variants in CSS and Config

```css
/* Reusable focus plus hover shortcut (v4) */
@variant hocus (&:hover, &:focus);
```

```html
<button class="hocus:bg-indigo-100 hocus:text-indigo-700">Edit</button>
```
