---
title: "SvelteKit Forms and Actions Cheatsheet"
description: "A quick reference for SvelteKit form actions, progressive enhancement with use:enhance, validation error handling, file uploads, and redirects."
category: "frontend"
technology: "svelte"
difficulty: "intermediate"
type: "cheatsheet"
locale: "en"
---

# SvelteKit Forms and Actions Cheatsheet

## Quick Reference Table

| Action | Code / Convention | Description |
|--------|-------------------|-------------|
| Default action | `export const actions = { default: async ({ request }) => {} }` | Handles `POST` to the page route |
| Named action | `export const actions = { create: async (event) => {} }` | Invoked with `action="?/create"` |
| Read fields | `const data = await request.formData()` | `FormData` from the submitted form |
| Return errors | `return { success: false, errors: { email: 'Required' } }` | Available as the `form` prop in the page |
| Fail with status | `return fail(400, { email, missing: true })` | Sets HTTP status and echoes submitted values |
| Redirect after post | `throw redirect(303, '/posts/1')` | POST-redirect-GET; must be thrown |
| Progressive enhancement | `use:enhance` from `$app/forms` | Intercepts submit, updates `form`, no reload |
| Custom callback | `use:enhance(() => async ({ result }) => {})` | Control pending state, resets, toasts |
| File upload | `<form method="POST" enctype="multipart/form-data">` | Required for `request.formData()` files |

## Common Commands

```bash
# Scaffold a TypeScript project, generate route types, then check them
npx sv create my-app --template minimal --types ts
npx svelte-kit sync && npm run check

# Inspect an action's serialized response without a browser
curl -i -X POST http://localhost:5173/contact \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "email=test@example.com&message=hello"
```

## Code Snippets

### Named action with validation

```javascript
// src/routes/contact/+page.server.js
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';

const schema = z.object({
    email: z.string().email('Enter a valid email address'),
    message: z.string().min(10, 'Message must be at least 10 characters')
});

export const actions = {
    default: async ({ request, locals }) => {
        const data = await request.formData();
        const values = Object.fromEntries(data);   // { email, message }
        const parsed = schema.safeParse(values);
        if (!parsed.success) {
            // fail() keeps the HTTP status and echoes values back to the page
            return fail(400, { values, errors: parsed.error.flatten().fieldErrors });
        }
        if (!locals.user) {
            throw redirect(303, '/login?next=/contact');
        }
        await db.message.create({ data: { ...parsed.data, userId: locals.user.id } });
        throw redirect(303, '/contact/thanks');   // must be thrown, not returned
    }
};
```

### The page component

```svelte
<!-- src/routes/contact/+page.svelte -->
<script>
    import { enhance } from '$app/forms';
    export let form;      // undefined on first render — always guard access
</script>

<form method="POST" use:enhance>
    <input name="email" type="email" value={form?.values?.email ?? ''} />
    {#if form?.errors?.email}<span class="error">{form.errors.email[0]}</span>{/if}

    <textarea name="message" rows="5">{form?.values?.message ?? ''}</textarea>
    <button type="submit">Send</button>
</form>
```

### Progressive enhancement with a callback

```svelte
<script>
    import { enhance } from '$app/forms';
    import { invalidateAll } from '$app/navigation';
    let saving = false;
</script>

<form method="POST" action="?/create" use:enhance={() => {
    saving = true;
    return async ({ result, update }) => {
        saving = false;
        if (result.type === 'success') {
            await update({ reset: true });   // clear inputs and the `form` prop
            await invalidateAll();           // refetch load data
        } else {
            await update();                  // keep values, show errors
        }
    };
}}>
    <input name="title" required />
    <button disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
</form>
```

### File uploads

```javascript
// src/routes/uploads/+page.server.js
import { fail } from '@sveltejs/kit';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/png', 'image/jpeg']);
export const actions = {
    upload: async ({ request }) => {
        const form = await request.formData();
        const file = form.get('avatar');
        if (!(file instanceof File) || file.size === 0) {
            return fail(400, { error: 'Choose a file to upload' });
        }
        if (file.size > MAX_BYTES) {
            return fail(413, { error: 'File must be smaller than 5 MB' });
        }
        if (!ALLOWED.has(file.type)) {
            return fail(415, { error: 'Only PNG and JPEG are allowed' });
        }
        const name = `${crypto.randomUUID()}${path.extname(file.name)}`;
        await writeFile(`static/uploads/${name}`, Buffer.from(await file.arrayBuffer()));
        return { success: true, url: `/uploads/${name}` };
    }
};
```

### Redirects and cross-route actions

```javascript
// src/routes/logout/+page.server.js
import { redirect } from '@sveltejs/kit';
export const actions = {
    default: async ({ cookies, locals }) => {
        cookies.delete('session', { path: '/' });
        locals.user = null;
        throw redirect(303, '/');    // a returned redirect is ignored
    }
};
```

### Gotchas

```text
- Actions run on POST only; a GET to the page never triggers them.
- Uploads need enctype="multipart/form-data", otherwise File values arrive empty.
- use:enhance without a callback resets the form on success; with a callback you
  choose via update({ reset: true }) and invalidateAll().
- A redirect inside an enhanced submit arrives as result.type === 'redirect' —
  call applyAction(result) from $app/forms to follow it.
- Read checkbox values once with formData.get('name'); use getAll for groups.
```
