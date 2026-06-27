---
title: "Panduan Autentikasi dan Otorisasi Next.js"
description: "Panduan komprehensif untuk mengimplementasikan autentikasi dan otorisasi dalam aplikasi Next.js menggunakan App Router, mencakup integrasi Auth.js, perlindungan rute berbasis middleware, pola RBAC, manajemen sesi, dan keamanan API."
category: "frontend"
technology: "nextjs"
difficulty: "advanced"
type: "guide"
locale: "id"
---

# Panduan Autentikasi dan Otorisasi Next.js

## Pendahuluan

Autentikasi dan otorisasi adalah komponen penting dalam aplikasi web modern. Next.js, dengan arsitektur App Router-nya, memperkenalkan pola unik untuk mengamankan aplikasi yang melintasi batas server dan klien. Tidak seperti aplikasi single-page tradisional, aplikasi Next.js merender di sisi server (RSC) dan klien, sehingga memerlukan pendekatan hibrida untuk autentikasi yang bekerja mulus di kedua lingkungan.

Panduan ini mengeksplorasi strategi autentikasi siap-produksi untuk aplikasi Next.js, mencakup solusi berbasis pustaka seperti Auth.js (sebelumnya NextAuth.js), perlindungan rute berbasis middleware, kontrol akses berbasis peran (RBAC), manajemen sesi, dan pola keamanan API. Pada akhirnya, Anda akan memiliki arsitektur autentikasi lengkap yang aman, mudah dipelihara, dan selaras dengan praktik terbaik Next.js.

## Praktik Terbaik

### 1. Gunakan Pustaka Autentikasi Khusus

Hindari membangun autentikasi dari awal. Manfaatkan pustaka mapan seperti Auth.js (NextAuth.js v5) atau Clerk yang menangani manajemen sesi, alur OAuth, hashing kata sandi, dan praktik terbaik keamanan secara bawaan. Auth.js adalah pilihan paling populer untuk Next.js karena terintegrasi secara native dengan App Router dan Pages Router, mendukung 80+ penyedia OAuth, dan menyediakan dukungan kelas satu untuk Server Components.

```bash
npm install next-auth@beta
```

### 2. Simpan Logika Autentikasi dalam Modul Terpusat

Enkapsulasi semua konfigurasi, pembantu, dan tipe yang terkait autentikasi dalam modul `auth/` khusus di akar proyek. Ini menjaga logika autentikasi tetap mudah ditemukan, diuji, dan dipelihara. Hindari menyebarkan panggilan auth di seluruh basis kode.

```text
src/
  auth/
    auth.config.ts       # Konfigurasi Auth.js (provider, callback)
    auth.ts              # Pembantu auth() untuk pengambilan sesi sisi server
    middleware.ts         # Middleware perlindungan rute
    lib/
      session.ts         # Fungsi utilitas sesi
      roles.ts           # Pembantu RBAC dan definisi tipe
  app/
  features/
```

### 3. Terapkan Pertahanan Berlapis

Mengandalkan satu lapisan autentikasi (seperti pemeriksaan sisi klien) adalah anti-pola keamanan yang umum. Terapkan pemeriksaan autentikasi di setiap batas:

- **Lapisan middleware**: Arahkan pengguna tidak terautentikasi menjauh dari rute yang dilindungi sebelum mereka mencapai halaman.
- **Lapisan Server Component**: Verifikasi sesi dan izin saat merender halaman yang dilindungi.
- **Lapisan Server Action**: Validasi ulang izin di setiap mutasi.
- **Lapisan Rute API**: Autentikasi setiap penangan rute API secara independen.
- **Lapisan basis data**: Terapkan keamanan tingkat baris atau pemeriksaan akses tingkat aplikasi.

### 4. Utamakan Validasi Sesi di Sisi Server

Jangan pernah mempercayai klien untuk keputusan otorisasi. Sesi dan token harus divalidasi di sisi server menggunakan cookie HTTP-only dan JWT dengan verifikasi yang tepat. Auth.js menangani ini secara otomatis dengan menyimpan data sesi dalam JWT terenkripsi atau sesi basis data, yang hanya dapat diakses melalui pembantu `auth()` sisi server.

### 5. Gunakan Middleware untuk Perlindungan Rute, Bukan Pengaman Halaman

Middleware di Next.js berjalan di Edge sebelum permintaan mencapai halaman. Gunakan untuk mengelola akses ke seluruh grup rute (misalnya, `/dashboard/*`, `/api/admin/*`). Middleware adalah garis pertahanan pertama dan cara paling efisien untuk memblokir akses tidak sah — middleware tidak pernah mengeksekusi kode halaman yang dilindungi.

### 6. Terapkan RBAC Sejak Awal

Bahkan jika aplikasi Anda saat ini memiliki hierarki pengguna yang datar, rancang sistem otorisasi Anda dengan RBAC dari awal. Definisikan peran yang jelas (admin, editor, pengguna) dan set izin. Ini mencegah refactoring yang mahal ketika kebutuhan peran berkembang. Simpan peran dalam token sesi sehingga tersedia di setiap lapisan tanpa kueri basis data tambahan.

### 7. Lindungi Rute API dan Server Action Secara Independen

Pemeriksaan sisi klien dapat dilewati. Setiap rute API dan Server Action harus memverifikasi status autentikasi dan izin pengguna secara independen. Gunakan pembantu `verifyAuth()` atau `authorize()` yang konsisten yang Anda impor ke setiap penangan yang dilindungi.

### 8. Tangani Kedaluwarsa Sesi dengan Baik

Definisikan pola UX yang jelas untuk sesi yang kedaluwarsa. Pembaruan token diam-diam (silent refresh) berfungsi baik untuk access token berumur pendek yang dikombinasikan dengan refresh token berumur panjang. Ketika sesi kedaluwarsa, arahkan pengguna ke halaman login dengan URL kembali sehingga mereka dikirim kembali ke tujuan asli setelah autentikasi ulang.

### 9. Catat Peristiwa Autentikasi untuk Audit Keamanan

Lacak upaya login (berhasil dan gagal), perubahan peran, pengaturan ulang kata sandi, dan peristiwa logout. Pencatatan terstruktur membantu mendeteksi serangan brute-force, akun yang dikompromikan, dan kesalahan konfigurasi otorisasi. Gunakan layanan pencatatan atau tulis peristiwa auth ke tabel basis data khusus.

### 10. Uji Alur Autentikasi Secara Menyeluruh

Autentikasi adalah perhatian lintas sektor yang menyentuh setiap bagian aplikasi Anda. Tulis pengujian integrasi yang mencakup alur login lengkap, akses rute yang dilindungi, penegakan peran, kedaluwarsa sesi, dan penanganan callback OAuth. Gunakan Playwright untuk pengujian E2E dan Vitest untuk pengujian unit/integrasi.

## Langkah Implementasi

### Langkah 1: Instal dan Konfigurasi Auth.js

Mulai dengan menginstal Auth.js (v5 beta) dan menyiapkan konfigurasi inti.

```bash
npm install next-auth@beta
```

Buat file konfigurasi Auth.js dengan penyedia dan callback yang Anda pilih.

```typescript
// src/auth/auth.config.ts
import type { NextAuthConfig } from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"

export const authConfig: NextAuthConfig = {
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const { email, password } = credentials as {
          email: string
          password: string
        }
        // Ganti dengan pencarian basis data Anda
        const user = await findUserByEmail(email)
        if (!user || !(await verifyPassword(password, user.passwordHash))) {
          return null
        }
        return { id: user.id, name: user.name, email: user.email, role: user.role }
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    session: ({ session, token }) => {
      session.user.role = token.role as string
      session.user.id = token.id as string
      return session
    },
    authorized: ({ auth, request }) => {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = request.nextUrl.pathname.startsWith("/dashboard")
      if (isOnDashboard) return isLoggedIn
      return true
    },
  },
  pages: {
    signIn: "/login",
  },
}
```

### Langkah 2: Buat Pembantu Auth dan Middleware

Siapkan pembantu `auth()` utama dan middleware untuk perlindungan rute.

```typescript
// src/auth/auth.ts
import NextAuth from "next-auth"
import { authConfig } from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
```

```typescript
// src/auth/middleware.ts
export { auth as middleware } from "@/auth/auth"

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/protected/:path*"],
}
```

Array `matcher` mendefinisikan rute mana yang dijalankan oleh middleware. Ini lebih efisien daripada memeriksa jalur di dalam fungsi middleware karena Next.js dapat melewati eksekusi middleware untuk rute yang tidak cocok.

### Langkah 3: Implementasi Penangan Rute untuk Endpoint Auth

Buat rute API auth yang digunakan Auth.js untuk penanganan sign-in, sign-out, dan callback.

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth/auth"

export const { GET, POST } = handlers
```

Auth.js secara otomatis membuat endpoint berikut:

- `GET /api/auth/signin` — Halaman sign-in (dapat dikustomisasi melalui konfigurasi `pages`)
- `POST /api/auth/signin/:provider` — Autentikasi penyedia
- `GET /api/auth/callback/:provider` — Penangan callback OAuth
- `GET /api/auth/signout` — Konfirmasi sign-out
- `POST /api/auth/signout` — Aksi sign-out
- `GET /api/auth/session` — Pengambilan sesi (untuk penggunaan sisi klien)
- `GET /api/auth/csrf` — Endpoint token CSRF

### Langkah 4: Siapkan Variabel Lingkungan

Konfigurasi variabel lingkungan yang diperlukan untuk Auth.js dan penyedia yang Anda pilih.

```bash
# .env.local
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"

# Penyedia OAuth
AUTH_GITHUB_ID="your-github-oauth-app-id"
AUTH_GITHUB_SECRET="your-github-oauth-app-secret"

AUTH_GOOGLE_ID="your-google-oauth-client-id"
AUTH_GOOGLE_SECRET="your-google-oauth-client-secret"
```

Hasilkan `AUTH_SECRET` acak yang aman menggunakan:

```bash
openssl rand --base64 32
```

### Langkah 5: Implementasi Kontrol Akses Berbasis Peran (RBAC)

Definisikan peran dan pembantu izin yang jelas yang dapat digunakan di semua lapisan.

```typescript
// src/auth/lib/roles.ts
export type Role = "admin" | "editor" | "user"

export type Permission =
  | "post:create"
  | "post:edit"
  | "post:delete"
  | "post:publish"
  | "user:manage"
  | "settings:read"
  | "settings:write"

const rolePermissions: Record<Role, Permission[]> = {
  admin: ["post:create", "post:edit", "post:delete", "post:publish", "user:manage", "settings:read", "settings:write"],
  editor: ["post:create", "post:edit", "post:publish"],
  user: ["post:create", "post:edit"],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false
}

export function requirePermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error("Forbidden: insufficient permissions")
  }
}
```

### Langkah 6: Lindungi Server Components

Untuk halaman yang memerlukan autentikasi atau peran tertentu, gunakan pembantu `auth()` sisi server.

```typescript
// src/app/dashboard/page.tsx
import { auth } from "@/auth/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard")
  }

  return (
    <div>
      <h1>Selamat datang, {session.user.name}</h1>
      <p>Peran: {session.user.role}</p>
    </div>
  )
}
```

```typescript
// src/app/admin/page.tsx
import { auth } from "@/auth/auth"
import { redirect } from "next/navigation"
import { requirePermission } from "@/auth/lib/roles"

export default async function AdminPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin")
  }

  requirePermission(session.user.role as any, "user:manage")

  return (
    <div>
      <h1>Panel Admin</h1>
      <p>Selamat datang, {session.user.name}</p>
    </div>
  )
}
```

### Langkah 7: Lindungi Server Actions

Server Action adalah endpoint POST yang berjalan di server. Mereka harus memverifikasi otorisasi secara independen.

```typescript
// src/app/dashboard/posts/actions.ts
"use server"

import { auth } from "@/auth/auth"
import { requirePermission } from "@/auth/lib/roles"
import { revalidatePath } from "next/cache"

export async function createPost(formData: FormData) {
  const session = await auth()

  if (!session?.user) {
    throw new Error("Tidak terautentikasi")
  }

  requirePermission(session.user.role as any, "post:create")

  const title = formData.get("title") as string
  const content = formData.get("content") as string

  // Masukkan ke basis data
  await db.post.create({
    data: {
      title,
      content,
      authorId: session.user.id,
    },
  })

  revalidatePath("/dashboard/posts")
}

export async function deletePost(postId: string) {
  const session = await auth()

  if (!session?.user) {
    throw new Error("Tidak terautentikasi")
  }

  requirePermission(session.user.role as any, "post:delete")

  await db.post.delete({ where: { id: postId } })
  revalidatePath("/dashboard/posts")
}
```

### Langkah 8: Lindungi Rute API

Rute API terpisah dari Server Action dan memerlukan logika autentikasi mereka sendiri.

```typescript
// src/app/api/posts/route.ts
import { auth } from "@/auth/auth"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 })
  }

  const posts = await db.post.findMany({
    where: { authorId: session.user.id },
    select: { id: true, title: true, createdAt: true },
  })

  return NextResponse.json(posts)
}

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 })
  }

  const body = await request.json()
  const post = await db.post.create({
    data: {
      title: body.title,
      content: body.content,
      authorId: session.user.id,
    },
  })

  return NextResponse.json(post, { status: 201 })
}
```

### Langkah 9: Bangun Halaman Login dengan Auth Sisi Klien

Buat halaman login yang mendukung penyedia OAuth dan kredensial. Gunakan pembantu `signIn` dari Auth.js.

```typescript
// src/app/login/page.tsx
import { LoginForm } from "./login-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Masuk</h1>
          <p className="mt-2 text-gray-600">Pilih metode masuk</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
```

```typescript
// src/app/login/login-form.tsx
"use client"

import { signIn } from "@/auth/auth"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleCredentialLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Email atau kata sandi salah")
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCredentialLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded border p-2"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Kata Sandi
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded border p-2"
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Masuk dengan Email
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">Atau lanjutkan dengan</span>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
          className="w-full rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800"
        >
          Masuk dengan GitHub
        </button>
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Masuk dengan Google
        </button>
      </div>
    </div>
  )
}
```

### Langkah 10: Tampilkan Sesi Pengguna di Sisi Klien

Gunakan hook `useSession` dari Auth.js untuk mengakses data sesi di komponen klien.

```typescript
// src/components/auth/session-provider.tsx
"use client"

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"
import type { ReactNode } from "react"

export function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <NextAuthSessionProvider>
      {children}
    </NextAuthSessionProvider>
  )
}
```

```typescript
// src/app/layout.tsx
import { SessionProvider } from "@/components/auth/session-provider"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
```

```typescript
// src/components/auth/user-button.tsx
"use client"

import { useSession, signOut } from "next-auth/react"

export function UserButton() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
  }

  if (!session?.user) {
    return null
  }

  return (
    <div className="flex items-center gap-3">
      {session.user.image && (
        <img
          src={session.user.image}
          alt={session.user.name ?? "Avatar"}
          className="h-8 w-8 rounded-full"
        />
      )}
      <div>
        <p className="text-sm font-medium">{session.user.name}</p>
        <p className="text-xs text-gray-500">{session.user.email}</p>
      </div>
      <button
        onClick={() => signOut()}
        className="ml-4 text-sm text-red-600 hover:text-red-800"
      >
        Keluar
      </button>
    </div>
  )
}
```

## Insight Penting

Mengimplementasikan autentikasi di Next.js memerlukan pemahaman tentang model eksekusi unik framework ini. App Router mencakup beberapa runtime (Edge untuk middleware, Node.js untuk Server Components dan rute API, dan browser untuk komponen klien), dan status autentikasi harus dapat diakses di semua runtime tersebut tanpa mengorbankan keamanan.

Auth.js (NextAuth.js v5) adalah pilihan yang direkomendasikan karena dirancang khusus untuk Next.js dan menangani kompleksitas manajemen sesi sisi server, alur OAuth, dan praktik terbaik keamanan. Strategi sesi berbasis JWT-nya berfungsi baik untuk sebagian besar aplikasi dan menghindari kebutuhan penyimpanan sesi basis data, meskipun juga mendukung sesi berbasis basis data untuk kasus penggunaan lanjutan.

Kesalahan keamanan paling umum dalam aplikasi Next.js adalah hanya mengandalkan middleware atau pemeriksaan sisi klien untuk otorisasi. Selalu verifikasi autentikasi dan izin di komponen atau penangan yang benar-benar melakukan operasi yang dilindungi. Pembantu `auth()` harus dipanggil di setiap Server Component, Server Action, dan rute API yang memerlukan otorisasi.

Untuk aplikasi dengan persyaratan izin yang kompleks, pertimbangkan untuk memperluas sistem RBAC yang dijelaskan dalam panduan ini dengan kontrol akses berbasis atribut (ABAC) atau kerangka kerja otorisasi berbasis kebijakan seperti Casbin atau Permit.io. Pendekatan ini berskala lebih baik seiring kompleksitas aturan otorisasi Anda.

## Langkah Berikutnya

Setelah mengimplementasikan fondasi dalam panduan ini, jelajahi pola autentikasi lanjutan berikut:

1. **Autentikasi multi-tenant**: Terapkan isolasi tenant di mana pengguna menjadi anggota organisasi, dengan hierarki peran yang terbatas pada setiap tenant.
2. **Autentikasi token API**: Terbitkan token API untuk akses programatis, dengan izin terbatas dan kebijakan rotasi.
3. **Autentikasi dua faktor (2FA)**: Tambahkan autentikasi dua faktor berbasis TOTP menggunakan pustaka seperti otplib.
4. **Analitik login sosial**: Lacak penyedia OAuth mana yang lebih disukai pengguna dan optimalkan alur sign-in.
5. **Pemantauan dan pencabutan sesi**: Bangun panel admin untuk melihat sesi aktif dan mencabutnya pada insiden keamanan.
6. **WebAuthn / Passkeys**: Implementasikan autentikasi tanpa kata sandi menggunakan API WebAuthn untuk keamanan dan UX yang lebih baik.

## Kesimpulan

Autentikasi dan otorisasi di Next.js memerlukan pendekatan multi-lapis yang cermat yang mempertimbangkan arsitektur hibrida server-klien framework ini. Dengan memusatkan logika autentikasi menggunakan Auth.js, menerapkan pertahanan berlapis di middleware, Server Components, Server Actions, dan rute API, serta merancang sistem RBAC yang fleksibel dari awal, Anda dapat membangun aplikasi yang aman dan mudah dipelihara.

Pola-pola dalam panduan ini menyediakan fondasi siap-produksi. Adaptasikan dengan kebutuhan spesifik aplikasi Anda, uji secara menyeluruh, dan iterasi seiring berkembangnya kebutuhan keamanan Anda.
