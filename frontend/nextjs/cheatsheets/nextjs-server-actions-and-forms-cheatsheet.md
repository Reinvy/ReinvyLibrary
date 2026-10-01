---
title: "Next.js Server Actions and Forms Cheatsheet"
description: "A quick reference for mastering Next.js Server Actions — defining and invoking actions, progressive enhancement with native forms, form state and validation, pending and optimistic UI, cache revalidation, security considerations, and when to prefer route handlers."
category: "frontend"
technology: "nextjs"
difficulty: "advanced"
type: "cheatsheet"
locale: "en"
---

# Next.js Server Actions and Forms Cheatsheet

## Quick Reference Table

| Action | Code / Config | Description |
|--------|---------------|-------------|
| File-level directive | `"use server"` at the top of a file | Marks every exported async function in the file as a Server Action |
| Inline action | `"use server"` inside an async function | Marks a single function defined in a Client Component as a Server Action |
| Form action | `<form action={action}>` | Invokes the action on submission; works without JavaScript (progressive enhancement) |
| Bound argument | `action.bind(null, userId)` | Closes a Server Action over an extra argument while keeping the event/submission data as the last argument |
| Managed form state | `const [state, formAction] = useActionState(fn, init)` | Returns the action's return value plus a new form action (replaces `useFormState`) |
| Pending state | `const { pending } = useFormStatus()` | Reads the submitting state of the nearest parent `<form>` (must be a child of the form) |
| Optimistic UI | `const [opt, addOpt] = useOptimistic(state, reducer)` | Shows a snapshot immediately, then reconciles with the real server result |
| Revalidate a path | `revalidatePath('/blog')` | Purges the Data Cache and Full Route Cache for a specific path after a mutation |
| Revalidate by tag | `revalidateTag('posts')` | Purges every cached entry tagged `posts` after a mutation |
| Redirect after mutation | `redirect('/posts/new-id')` | Navigates from inside the action after the mutation succeeds |
| Create a cookie | `(await cookies()).set('theme', 'dark')` | Writes a cookie from a Server Action (read with `get`) |
| Delete a cookie | `(await cookies()).delete('session')` | Removes a cookie from a Server Action |
| Read request headers | `(await headers()).get('user-agent')` | Accesses incoming request metadata inside the action |
| Origin check | `await isOriginAllowed(req)` | Next.js 15+ built-in CSRF protection for Server Actions (thrown on mismatched origin) |
| Action without a form | `onClick={async () => { await action() }}` | Calls a Server Action from a Client Component event handler (requires JS) |
| Route handler fallback | `app/api/items/route.ts` | Use a `POST` endpoint when a non-form client (mobile, third party) must call the mutation |

## Common Commands

### Project Setup and Dependencies

```bash
# Server Actions ship with the App Router (stable since Next.js 14) — no extra dependency
npx create-next-app@latest my-app --typescript --app

# Validation library commonly paired with Server Actions
npm install zod

# Check the installed Next.js version (Server Actions stable requires >= 14)
npm list next
```

### Verify a Server Action Builds

```bash
# Server Actions are compiled during build; a misused directive fails here
npm run build

# Actions are not REST endpoints — a plain curl POST to a page URL returns HTML,
# not the action result. Test with a real browser form submission instead.
npm run dev
```

### Revalidation Commands

```bash
# After merging a mutation, confirm the cache header shows a fresh MISS
curl -sI https://example.com/blog | grep -i x-nextjs-cache
# x-nextjs-cache: HIT | MISS | STALE
```

## Code Snippets

### File-Level Server Action with a Native Form

```typescript
// app/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  // Persist to the database here (using a DB client or ORM)

  revalidatePath('/posts');
  redirect('/posts');
}
```

```typescript
// app/posts/new/page.tsx — the form posts to the server action
import { createPost } from '@/app/actions';

export default function NewPostPage() {
  return (
    <form action={createPost}>
      <input name="title" required placeholder="Post title" />
      <button type="submit">Create</button>
    </form>
  );
}
```

### Inline Action with Validation and State

```typescript
// app/login/page.tsx — a Client Component using useActionState
'use client';

import { useActionState } from 'react';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

async function login(_prev: unknown, formData: FormData) {
  'use server';

  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  // Sign the user in...

  return { success: true };
}

export default function LoginPage() {
  const [state, formAction] = useActionState(login, null);

  return (
    <form action={formAction}>
      {state && 'error' in state && <p>{state.error}</p>}
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit">Log in</button>
    </form>
  );
}
```

### Pending State with useFormStatus

```typescript
// app/posts/_components/submit-button.tsx — must be a child of the form
'use client';

import { useFormStatus } from 'react-dom';

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Saving...' : 'Save'}
    </button>
  );
}
```

```typescript
// app/posts/_components/post-form.tsx
import { SubmitButton } from './submit-button';
import { createPost } from '@/app/actions';

export function PostForm() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <SubmitButton />
    </form>
  );
}
```

### Bound Arguments for Per-Item Actions

```typescript
// app/todos/actions.ts
'use server';

import { revalidatePath } from 'next/cache';

export async function deleteTodo(id: string) {
  // DELETE FROM todos WHERE id = $1
  revalidatePath('/todos');
}
```

```typescript
// app/todos/page.tsx — bind closes over each todo id
import { deleteTodo } from './actions';

export default function TodosPage({ todos }: { todos: { id: string; title: string }[] }) {
  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>
          {todo.title}
          <form action={deleteTodo.bind(null, todo.id)}>
            <button type="submit">Delete</button>
          </form>
        </li>
      ))}
    </ul>
  );
}
```

### Optimistic Updates with useOptimistic

```typescript
// app/messages/page.tsx — mark a message as sent before the action resolves
'use client';

import { useOptimistic } from 'react';
import { sendMessage } from './actions';

type Message = { id: number; text: string; pending?: boolean };

export default function MessagesPage({ messages }: { messages: Message[] }) {
  const [optimisticMessages, addOptimistic] = useOptimistic(
    messages,
    (state: Message[], newMessage: Message) => [...state, newMessage],
  );

  async function handleSubmit(formData: FormData) {
    addOptimistic({ id: Date.now(), text: String(formData.get('text')), pending: true });
    await sendMessage(formData);
  }

  return (
    <>
      <ul>
        {optimisticMessages.map((m) => (
          <li key={m.id} style={{ opacity: m.pending ? 0.6 : 1 }}>
            {m.text}
          </li>
        ))}
      </ul>
      <form action={handleSubmit}>
        <input name="text" required />
        <button type="submit">Send</button>
      </form>
    </>
  );
}
```

### Cookie and Header Access Inside an Action

```typescript
// app/settings/actions.ts
'use server';

import { cookies, headers } from 'next/headers';

export async function updateTheme(formData: FormData) {
  const theme = String(formData.get('theme'));

  const cookieStore = await cookies();
  cookieStore.set('theme', theme);

  const headerStore = await headers();
  const userAgent = headerStore.get('user-agent');
  // Log or adapt behavior based on the client, then revalidate as needed
}
```

### Calling a Server Action from an Event Handler

```typescript
// app/dashboard/page.tsx — a Client Component that calls an imported action
'use client';

import { likePost } from '@/app/actions';

export function LikeButton({ postId }: { postId: string }) {
  return (
    <button
      onClick={async () => {
        await likePost(postId);
      }}
    >
      Like
    </button>
  );
}
```

### Server-Side Validation with Error Return

```typescript
// app/register/actions.ts
'use server';

import { z } from 'zod';

const schema = z.object({
  username: z.string().min(3),
  age: z.coerce.number().min(18, 'Must be at least 18'),
});

export type RegisterState = { error?: string; values?: { username: string; age: number } };

export async function register(
  _prev: RegisterState | null,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = schema.safeParse({
    username: formData.get('username'),
    age: formData.get('age'),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues.map((i) => i.message).join(', '),
    };
  }

  // Persist the validated user, then revalidate or redirect
  return { values: parsed.data };
}
```

### Route Handler Fallback for Non-Form Clients

```typescript
// app/api/items/route.ts — POST endpoint for mobile or third-party clients
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  // Persist the item (same mutation logic as the Server Action)

  return NextResponse.json({ ok: true }, { status: 201 });
}
```

### Security Checklist

```text
- Validate ALL inputs server-side with a schema library (zod) — client-side checks are cosmetic
- Never trust values from FormData.get() — coerce and parse them
- Server Actions include built-in CSRF origin checks since Next.js 15; keep them enabled
- Keep secrets in server-only code — actions never ship to the browser bundle
- Rate-limit expensive mutations (email, payments) at the action or infrastructure layer
- Avoid logging formData containing passwords or tokens
- Use `cookies()` and `headers()` only in actions or Server Components, never in Client Components
```
