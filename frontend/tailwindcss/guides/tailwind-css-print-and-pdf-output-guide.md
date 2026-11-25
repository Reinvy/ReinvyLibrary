---
title: "Tailwind CSS Print Styles and PDF Document Output Guide"
description: "An advanced guide to making Tailwind CSS interfaces printable: paper geometry with @page, print variants, pagination control, print-safe color and type, and deterministic PDF rendering through headless Chrome."
category: "frontend"
technology: "tailwindcss"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# Tailwind CSS Print Styles and PDF Document Output Guide

## Introduction

Printing is not "the same page in greyscale". When a browser switches to print media it drops hover states, resolves a different viewport, paginates content into fixed paper boxes, and stops running lazy-loading heuristics. A layout that is carefully engineered for an app shell — sticky headers, dark surfaces, scroll containers, fixed sidebars — produces a different document entirely: navigation printed on every page, dark backgrounds that drain toner, cards sliced in half across a page boundary, and images that render as empty rectangles because they were never in the viewport.

Tailwind gives you three primitives for this output target: the `print:` variant for per-component conditions, the `break-*` pagination utilities, and plain CSS for what utilities cannot express (page geometry with `@page`, repeated table headers, link annotations). A fourth piece lives outside the stylesheet: the renderer. Most products that "export to PDF" are really running headless Chrome, so the print stylesheet is not just an accessibility nicety — it is the actual production renderer for invoices, receipts, statements, reports, and certificates.

This guide covers the engineering discipline behind that target: a print layer that does not pollute the screen stylesheet, explicit pagination, print-safe color and typography, flattened interactive UI, deterministic PDF generation, and CI checks that catch a broken invoice before a customer does.

## Best Practices

- **Treat print as a first-class output target.** If a document is ever exported to PDF, print CSS is production code with a contract: page count, page breaks, and content completeness are testable outputs, not cosmetic preferences.
- **Let `@page` own paper geometry.** Margins belong to the page box (`@page { margin: 18mm }`), not to padded elements inside the document. Padding-based margins break the moment the paper size changes from A4 to Letter.
- **Prefer `print:` variants for component-level rules, `@media print` for structural ones.** A component should know how it prints (`print:hidden`, `print:break-inside-avoid`). Rules that touch the document root, page boxes, or global typography belong in one dedicated print block so they are greppable.
- **Decide pagination instead of discovering it.** Explicit `break-before-page` on chapters and `break-inside-avoid` on atomic units (a single invoice line item, a signature block) turn unpredictable output into a layout you specified.
- **Flatten interactive UI before the print stylesheet runs.** Hide navigation, floating action buttons, toasts, and cookie banners; expand `details`, accordions, and inactive tab panels — hidden content is silently missing from the PDF, and support tickets follow.
- **Print in ink, not in RGB.** Light surfaces with dark text are the default; heavy `bg-slate-900` sections should collapse to white with a border. Reserve `print-color-adjust: exact` for brand marks and data visualisations that lose meaning without color.
- **Expose what the medium removes.** A printed link has no cursor, so append the destination with an `::after` rule; a chart loses its legend interaction, so keep the legend visible in the static frame.
- **Render PDFs with the same engine users print from.** Headless Chrome and the user's browser share a print implementation, which is why the same stylesheet produces the same page count. Treat any other PDF toolchain as a separate output target with its own styles.
- **Test page counts, not screenshots.** A visual snapshot of page one tells you nothing about the invoice that grew to four pages and lost its totals block. Assert document completeness and page count in CI.

## Implementation Steps

### Step 1: Establish the Print Layer

Create one print block in the Tailwind entry stylesheet, after the import. Everything structural lives here — page geometry, global type adjustments, and the small set of element rules that utilities cannot reach.

```css
@import "tailwindcss";

@page {
  size: A4;
  margin: 18mm 16mm 20mm;

  @bottom-center {
    content: counter(page) " / " counter(pages);
    font-size: 9pt;
    color: #6b7280;
  }
}

@media print {
  html {
    font-size: 10.5pt;
  }

  body {
    background: #fff;
    color: #111827;
  }

  a[href^="http"]::after {
    content: " (" attr(href) ")";
    font-size: 8.5pt;
    color: #6b7280;
    word-break: break-all;
  }
}
```

Two details matter here. `@page` margin boxes are supported by Chrome for headers and footers, which removes the need for a fixed header hack. And `font-size` on `html` in print overrides the screen scale, so every `text-sm` and `text-2xl` utility inherits a paper-appropriate baseline instead of 16px-screen proportions.

### Step 2: Split the Shell from the Document

The application shell and the printable document are different trees. Hide the shell in print and mark the document root explicitly, so a future layout refactor cannot accidentally print a sidebar.

```html
<body class="bg-slate-100">
  <nav class="print:hidden">...</nav>

  <aside class="hidden lg:block print:hidden">...</aside>

  <main class="print:block">
    <article class="mx-auto max-w-3xl bg-white p-8 print:max-w-none print:p-0">
      <header class="hidden print:flex print:items-baseline print:justify-between">
        <h1 class="text-xl font-semibold">Invoice INV-2041</h1>
        <span class="text-sm text-slate-600">2026-11-25</span>
      </header>
      <!-- document body -->
    </article>
  </main>

  <div class="fixed bottom-4 right-4 print:hidden">...</div>

  <div role="status" class="print:hidden">...</div>
</body>
```

The reverse direction is just as important: elements that are redundant on screen often carry the document's identity on paper. `hidden print:flex` on the print header is the standard pattern — the screen shows the same information in the app's chrome, and the paper version gets a self-contained header.

### Step 3: Control Pagination Explicitly

Long documents are where naive print CSS fails. Pagination is controlled at three levels: chapters (force a break), atomic units (never split), and flowing content (orphans and widows).

```css
@media print {
  .doc-section + .doc-section {
    break-before: page;
  }

  .doc-atomic,
  .doc-figure,
  .doc-signature {
    break-inside: avoid;
  }

  p,
  li {
    orphans: 3;
    widows: 3;
  }

  h2,
  h3 {
    break-after: avoid;
  }
}
```

Apply the atomic class to anything that loses meaning when split: an invoice line item row, a chart with its caption, a signature and date pair, a callout box. `break-after: avoid` on headings is the cheapest fix for the classic "chapter title at the bottom of a page, content on the next" defect.

When a section must start a new page regardless of available space, use the utility directly in markup rather than a CSS selector:

```html
<section class="doc-section print:break-before-page">
  <h2>Payment terms</h2>
</section>
```

### Step 4: Expand Collapsed Content Before Printing

`details` elements, accordions, and tab panels render their hidden state in print — the reader gets a document with missing sections. Fix this at two levels: force the open state in CSS, and settle the JS state for components that store their open flag in the DOM.

```css
@media print {
  details > *:not(summary) {
    display: block;
  }

  details > summary {
    list-style: none;
    font-weight: 600;
  }

  [data-print-expand="true"] {
    display: block;
  }

  [role="tabpanel"][hidden] {
    display: block;
  }
}
```

CSS alone cannot cover everything, because some component libraries re-hide content on the next render tick. Pair it with a settle step that runs on the print event, so the DOM agrees with the stylesheet:

```typescript
const expandForPrint = () => {
    document.querySelectorAll<HTMLDetailsElement>("details").forEach((el) => {
        el.dataset.printState = String(el.open);
        el.open = true;
    });

    document.querySelectorAll<HTMLElement>('[role="tabpanel"]').forEach((panel) => {
        panel.dataset.printState = String(panel.hidden);
        panel.hidden = false;
    });
};

const restoreAfterPrint = () => {
    document.querySelectorAll<HTMLElement>("[data-print-state]").forEach((el) => {
        if (el instanceof HTMLDetailsElement) {
            el.open = el.dataset.printState === "true";
        } else {
            el.hidden = el.dataset.printState === "true";
        }
        delete el.dataset.printState;
    });
};

window.addEventListener("beforeprint", expandForPrint);
window.addEventListener("afterprint", restoreAfterPrint);
```

The headless PDF renderer must call `expandForPrint()` explicitly — `beforeprint` fires for user-initiated printing, not reliably for programmatic PDF generation.

### Step 5: Build a Print-Safe Color and Type Scale

Screen palettes are tuned for backlit displays. In print, a `bg-slate-900` hero becomes a solid black plate, `text-slate-400` body copy becomes invisible, and translucent layers flatten unpredictably. Define print tokens once and apply them as a component-level override.

```css
@theme {
  --color-print-ink: #111827;
  --color-print-muted: #4b5563;
  --color-print-rule: #d1d5db;
  --color-print-accent: #1d4ed8;
}

@media print {
  .print-surface {
    background: #fff;
    color: var(--color-print-ink);
  }

  .print-muted {
    color: var(--color-print-muted);
  }

  .print-rule {
    border-color: var(--color-print-rule);
  }
}
```

Then apply them where a component's screen styling would be wrong on paper:

```html
<div class="bg-slate-900 p-6 text-slate-100 print-surface print:border print-rule">
  <p class="text-slate-300 print-muted">Total due</p>
  <p class="text-3xl font-bold print:text-2xl">Rp 4.250.000</p>
</div>
```

Use `print-color-adjust: exact` narrowly. It forces the browser to keep background colors, which is correct for a brand mark, a status badge whose meaning is carried by color, or a chart series — and wrong everywhere else, because it also keeps dark fills that consume toner and blur on cheap printers.

```css
@media print {
  .print-exact {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}
```

### Step 6: Make Tables and Data Grids Printable

Tables are the most common printable structure in business applications and the most common source of broken output: headers that appear only on page one, rows split across pages, and columns compressed into unreadable slivers.

```css
@media print {
  table.doc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5pt;
  }

  table.doc-table thead {
    display: table-header-group;
  }

  table.doc-table tfoot {
    display: table-footer-group;
  }

  table.doc-table tr {
    break-inside: avoid;
  }

  table.doc-table th,
  table.doc-table td {
    border-bottom: 1px solid var(--color-print-rule);
    padding: 4pt 6pt;
    text-align: left;
  }
}
```

`display: table-header-group` on `thead` is what makes Chrome repeat column headers on every page — the single highest-value rule in this section. Pair it with `tfoot` for a totals row that must appear on the final page, and avoid horizontal scroll wrappers in print: an `overflow-x-auto` container clips columns rather than shrinking them, so give the table explicit print widths.

```html
<div class="overflow-x-auto print:overflow-visible">
  <table class="doc-table w-full">
    <thead>
      <tr>
        <th class="w-1/2">Description</th>
        <th class="w-1/6 text-right">Qty</th>
        <th class="w-1/3 text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr class="print:break-inside-avoid">
        <td>Annual platform subscription</td>
        <td class="text-right">1</td>
        <td class="text-right">Rp 4.250.000</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Step 7: Handle Images, Charts, and Lazy Loading

Lazy-loaded images are the most frequent cause of empty boxes in exported PDFs: the image never enters the viewport, so the browser never fetches it, and the PDF renderer rasterises a placeholder. Force eager loading on anything inside a printable document.

```html
<img
  src="/receipts/stamp.svg"
  alt="Verified payment stamp"
  width="96"
  height="96"
  loading="eager"
  decoding="sync"
  class="print:max-w-[24mm]"
/>
```

For charts, prefer inline SVG over canvas. SVG scales losslessly at any paper resolution and inherits CSS colors, while a canvas element is rasterised at its on-screen pixel size and prints soft. When a chart must stay canvas-based, set a device-pixel-ratio-scaled backing store before rendering and keep the legend inside the chart frame — a print reader cannot hover to reveal series names.

```css
@media print {
  .doc-figure img,
  .doc-figure svg {
    max-width: 100%;
    height: auto;
    break-inside: avoid;
  }

  .doc-figure figcaption {
    font-size: 9pt;
    color: var(--color-print-muted);
  }
}
```

### Step 8: Render the PDF Deterministically

Generation and styling are one pipeline. Drive headless Chrome with the same document, the same viewport-independent print media, and explicit settings so an invoice rendered today matches one rendered last quarter.

```typescript
import puppeteer from "puppeteer";

const renderDocument = async (url: string, output: string) => {
    const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "networkidle0" });
    await page.emulateMediaType("print");
    await page.evaluate(() => {
        document.querySelectorAll<HTMLDetailsElement>("details").forEach((el) => {
            el.open = true;
        });
    });

    await page.pdf({
        path: output,
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
        displayHeaderFooter: false,
    });

    await browser.close();
};
```

Three settings prevent the most common mismatches. `printBackground: true` is required or every background color silently disappears. `preferCSSPageSize: true` makes `@page` authoritative instead of the `format` option, so paper size lives in one place. Explicit zero margins keep Chrome's own header and footer from overlapping the content you positioned in `@page` margin boxes.

### Step 9: Automate Print Regression Checks in CI

A print stylesheet without tests drifts. Assert the properties that actually break: page count, presence of a totals block, and absence of clipped table columns.

```bash
npx playwright install --with-deps chromium

node -e "const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto('http://localhost:3000/invoices/INV-2041');await p.emulateMedia({media:'print'});await p.pdf({path:'/tmp/invoice.pdf',format:'A4',printBackground:true});await b.close();})()"

pdfinfo /tmp/invoice.pdf | grep -E "Pages|Page size"
pdftotext /tmp/invoice.pdf - | grep -c "Total due"
```

Gate on the output: fail when the page count exceeds the documented budget for the template, and fail when `pdftotext` cannot find the totals label. That catches the two failures customers actually report — a missing section and a document that grew into an unexpected page.

### Step 10: Verify Across Paper Sizes and Locales

The same stylesheet must survive Letter paper, a longer locale (German invoice labels are considerably longer than English ones), and a browser zoom setting. Check both paper sizes before shipping.

```bash
node -e "const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto('http://localhost:3000/invoices/INV-2041');await p.emulateMedia({media:'print'});await p.pdf({path:'/tmp/letter.pdf',format:'Letter',printBackground:true});await b.close();})()"

pdfinfo /tmp/letter.pdf | grep "Pages"
```

If Letter shifts the page count, the layout depends on a fixed metric that should be relative — usually a hard-coded `w-[210mm]` container, or a `min-h` on a section that was sized for A4 content height. Replace those with content-driven sizing and let `@page` determine the page box.
