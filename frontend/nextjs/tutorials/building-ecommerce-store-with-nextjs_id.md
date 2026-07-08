---
title: "Membangun Toko E-commerce dengan Next.js"
description: "Tutorial komprehensif tentang katalog produk dengan ISR, keranjang belanja dengan Server Actions, integrasi pembayaran Stripe, autentikasi, dan manajemen pesanan di Next.js."
category: "frontend"
technology: "nextjs"
difficulty: "advanced"
type: "tutorial"
locale: "id"
---

# Membangun Toko E-commerce dengan Next.js

## Ringkasan

Dalam tutorial ini, Anda akan membangun toko e-commerce yang berfungsi penuh menggunakan Next.js App Router. Anda akan mempelajari cara membuat katalog produk dinamis dengan Incremental Static Regeneration (ISR), mengimplementasikan keranjang belanja menggunakan Server Actions dan cookie, mengintegrasikan Stripe untuk pemrosesan pembayaran, menyiapkan autentikasi dengan Auth.js, dan membangun dashboard admin untuk mengelola produk dan pesanan. Di akhir tutorial ini, Anda akan memiliki aplikasi e-commerce siap produksi yang di-deploy ke Vercel.

## Target Audiens

- Developer full-stack dan frontend dengan pengalaman React.
- Developer yang sudah memahami dasar Next.js dan ingin membangun aplikasi dunia nyata.
- Ekspektasi tingkat kemampuan pembaca: Mahir.

## Prasyarat

- Pemahaman kuat tentang React (hooks, komponen, props).
- Keakraban dengan fundamental Next.js App Router (layout, route, Server Components).
- Node.js 18+ dan package manager (npm, yarn, atau pnpm) terinstal.
- Akun Stripe (gratis) untuk pengujian integrasi pembayaran.
- Akun Vercel gratis untuk deployment.
- Pengetahuan dasar SQL dan PostgreSQL (kami menggunakan Prisma ORM).

## Tujuan Pembelajaran

Setelah menyelesaikan tutorial ini, Anda akan dapat:

- Menyiapkan proyek Next.js dengan Prisma ORM dan PostgreSQL.
- Membangun katalog produk dengan ISR untuk pengiriman konten berperforma tinggi.
- Mengimplementasikan keranjang belanja menggunakan Server Actions dan cookie untuk manajemen state.
- Mengintegrasikan Stripe Checkout untuk pemrosesan pembayaran yang aman.
- Menyiapkan autentikasi dengan Auth.js (NextAuth v5) untuk akun pengguna.
- Membangun dashboard admin untuk manajemen produk dan pesanan.
- Men-deploy aplikasi e-commerce lengkap ke Vercel.

## Konteks dan Motivasi

Membangun toko e-commerce adalah salah satu tantangan full-stack paling umum di dunia nyata. Ini membutuhkan penanganan data produk yang dinamis, mengelola sesi pengguna melalui keranjang belanja, memproses pembayaran dengan aman, dan mempertahankan antarmuka admin — sambil tetap memberikan performa dan SEO yang sangat baik. Next.js unggul dalam hal ini karena menggabungkan Server Components untuk pemuatan halaman awal yang cepat, ISR untuk menjaga halaman produk tetap segar tanpa rebuild penuh, dan Server Actions untuk penanganan formulir yang mulus. Tutorial ini memandu Anda melalui setiap lapisan arsitektur e-commerce, menjadikannya proyek ideal bagi developer yang ingin meningkatkan keterampilan full-stack mereka.

## Konten Inti

### Persiapan Proyek dan Skema Database

Mulai dengan membuat proyek Next.js baru dengan TypeScript dan Tailwind CSS:

```bash
npx create-next-app@latest ecommerce-app --typescript --tailwind --app --src-dir
cd ecommerce-app
```

Instal dependensi inti:

```bash
npm install @prisma/client @auth/prisma-adapter stripe @stripe/stripe-js
npm install prisma --save-dev
```

Siapkan Prisma dengan PostgreSQL. Buat file skema di `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  orders        Order[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Product {
  id          String   @id @default(cuid())
  name        String
  description String   @db.Text
  price       Int
  image       String
  category    String
  inventory   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  orderItems OrderItem[]
}

model Order {
  id          String      @id @default(cuid())
  userId      String?
  user        User?       @relation(fields: [userId], references: [id])
  items       OrderItem[]
  total       Int
  status      String      @default("pending")
  stripeId    String?     @unique
  shippingAddress Json?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId String
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int
  price     Int

  @@unique([orderId, productId])
}
```

Jalankan migrasi:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Buat singleton Prisma client di `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = globalThis.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;

export default prisma;
```

### Mengisi Data Produk

Buat file seed di `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const products = [
  {
    name: "Wireless Headphones",
    description: "Headphone nirkabel peredam bising premium dengan daya tahan baterai 30 jam.",
    price: 29999,
    image: "/images/headphones.jpg",
    category: "electronics",
    inventory: 50,
  },
  {
    name: "Cotton T-Shirt",
    description: "Kaos katun organik 100% nyaman, tersedia dalam berbagai ukuran.",
    price: 2499,
    image: "/images/tshirt.jpg",
    category: "clothing",
    inventory: 200,
  },
  {
    name: "Leather Notebook",
    description: "Buku catatan kulit buatan tangan dengan 200 halaman kertas bebas asam.",
    price: 1999,
    image: "/images/notebook.jpg",
    category: "stationery",
    inventory: 100,
  },
  {
    name: "Running Shoes",
    description: "Sepatu lari ringan dengan bantalan responsif dan mesh bernapas.",
    price: 12999,
    image: "/images/shoes.jpg",
    category: "sports",
    inventory: 75,
  },
  {
    name: "Coffee Maker",
    description: "Pembuat kopi 12 cangkir terprogram dengan carafe termal dan mati otomatis.",
    price: 7999,
    image: "/images/coffee-maker.jpg",
    category: "kitchen",
    inventory: 30,
  },
  {
    name: "Yoga Mat",
    description: "Tikar yoga anti-selip ekstra tebal dengan tali pengikat, ketebalan 6mm.",
    price: 3499,
    image: "/images/yoga-mat.jpg",
    category: "sports",
    inventory: 150,
  },
];

async function main() {
  console.log("Mengisi produk...");
  for (const product of products) {
    await prisma.product.create({ data: product });
  }
  console.log(`Berhasil mengisi ${products.length} produk.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Tambahkan konfigurasi seed ke `package.json`:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

Jalankan skrip seed:

```bash
npx prisma db seed
```

### Katalog Produk dengan Incremental Static Regeneration

Buat halaman daftar produk di `src/app/products/page.tsx`. Halaman ini menggunakan ISR untuk meregenerasi data produk maksimal setiap 60 detik sambil melayani halaman yang sudah di-cache:

```typescript
import Link from "next/link";
import prisma from "@/lib/prisma";

export const revalidate = 60;

async function getProducts() {
  return prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Semua Produk</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.id}`}
            className="group border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="aspect-square bg-gray-100 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                {product.name.charAt(0)}
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-500 uppercase tracking-wide">
                {product.category}
              </p>
              <h2 className="font-semibold text-lg mt-1 group-hover:text-blue-600 transition-colors">
                {product.name}
              </h2>
              <p className="text-gray-600 mt-1">
                ${(product.price / 100).toFixed(2)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

Buat halaman detail produk dinamis di `src/app/products/[id]/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import AddToCartButton from "@/components/AddToCartButton";

export const revalidate = 60;

async function getProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) notFound();
  return product;
}

export async function generateStaticParams() {
  const products = await prisma.product.findMany({ select: { id: true } });
  return products.map((product) => ({ id: product.id }));
}

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await getProduct(params.id);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-6xl">
          {product.name.charAt(0)}
        </div>
        <div>
          <p className="text-sm text-gray-500 uppercase tracking-wide">
            {product.category}
          </p>
          <h1 className="text-3xl font-bold mt-2">{product.name}</h1>
          <p className="text-2xl font-semibold text-blue-600 mt-4">
            ${(product.price / 100).toFixed(2)}
          </p>
          <p className="text-gray-600 mt-4">{product.description}</p>
          <p className="text-sm text-gray-500 mt-2">
            {product.inventory > 0
              ? `${product.inventory} tersedia`
              : "Stok habis"}
          </p>
          <AddToCartButton
            productId={product.id}
            disabled={product.inventory === 0}
          />
        </div>
      </div>
    </div>
  );
}
```

### Keranjang Belanja dengan Server Actions dan Cookie

Keranjang belanja disimpan sebagai cookie di sisi klien. Server Actions menangani penambahan, penghapusan, dan pembaruan item keranjang. Pendekatan ini menjaga keranjang tetap persisten antar sesi tanpa memerlukan database.

Buat tipe keranjang di `src/lib/cart.ts`:

```typescript
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
}
```

Buat Server Actions di `src/app/cart/actions.ts`:

```typescript
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import type { Cart, CartItem } from "@/lib/cart";

function getCart(): Cart {
  const cookieStore = cookies();
  const cartJson = cookieStore.get("cart")?.value;
  if (cartJson) {
    try {
      return JSON.parse(cartJson);
    } catch {
      return { items: [] };
    }
  }
  return { items: [] };
}

function saveCart(cart: Cart) {
  const cookieStore = cookies();
  cookieStore.set("cart", JSON.stringify(cart), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function addToCart(formData: FormData) {
  const productId = formData.get("productId") as string;
  const quantity = parseInt(formData.get("quantity") as string) || 1;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, price: true, image: true, inventory: true },
  });

  if (!product || product.inventory < quantity) {
    throw new Error("Produk tidak tersedia atau stok tidak mencukupi.");
  }

  const cart = getCart();
  const existingItem = cart.items.find(
    (item) => item.productId === productId
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity,
    });
  }

  saveCart(cart);
  redirect("/cart");
}

export async function updateCartItemQuantity(formData: FormData) {
  const productId = formData.get("productId") as string;
  const quantity = parseInt(formData.get("quantity") as string);

  const cart = getCart();
  const item = cart.items.find((item) => item.productId === productId);

  if (item) {
    if (quantity <= 0) {
      cart.items = cart.items.filter((i) => i.productId !== productId);
    } else {
      item.quantity = quantity;
    }
  }

  saveCart(cart);
  redirect("/cart");
}

export async function removeFromCart(formData: FormData) {
  const productId = formData.get("productId") as string;

  const cart = getCart();
  cart.items = cart.items.filter((i) => i.productId !== productId);

  saveCart(cart);
  redirect("/cart");
}
```

Buat tombol Tambah ke Keranjang di `src/components/AddToCartButton.tsx`:

```typescript
"use client";

import { useFormStatus } from "react-dom";
import { addToCart } from "@/app/cart/actions";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? "Menambahkan..." : "Tambah ke Keranjang"}
    </button>
  );
}

export default function AddToCartButton({
  productId,
  disabled,
}: {
  productId: string;
  disabled: boolean;
}) {
  return (
    <form action={addToCart}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="quantity" value="1" />
      <SubmitButton disabled={disabled} />
    </form>
  );
}
```

Buat halaman keranjang di `src/app/cart/page.tsx`:

```typescript
import { cookies } from "next/headers";
import Link from "next/link";
import type { Cart } from "@/lib/cart";
import CartItemRow from "@/components/CartItemRow";

function getCart(): Cart {
  const cookieStore = cookies();
  const cartJson = cookieStore.get("cart")?.value;
  if (cartJson) {
    try {
      return JSON.parse(cartJson);
    } catch {
      return { items: [] };
    }
  }
  return { items: [] };
}

export default function CartPage() {
  const cart = getCart();
  const total = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Keranjang Anda Kosong</h1>
        <p className="text-gray-600 mb-8">
          Tambahkan beberapa produk untuk memulai.
        </p>
        <Link
          href="/products"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Lihat Produk
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Keranjang Belanja</h1>
      <div className="space-y-4">
        {cart.items.map((item) => (
          <CartItemRow key={item.productId} item={item} />
        ))}
      </div>
      <div className="mt-8 border-t pt-4">
        <div className="flex justify-between items-center text-xl font-bold">
          <span>Total</span>
          <span>${(total / 100).toFixed(2)}</span>
        </div>
        <Link
          href="/checkout"
          className="mt-4 inline-block px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Lanjut ke Pembayaran
        </Link>
      </div>
    </div>
  );
}
```

Buat komponen CartItemRow di `src/components/CartItemRow.tsx`:

```typescript
"use client";

import { useFormStatus } from "react-dom";
import {
  updateCartItemQuantity,
  removeFromCart,
} from "@/app/cart/actions";
import type { CartItem } from "@/lib/cart";

function UpdateButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm text-blue-600 hover:underline disabled:opacity-50"
    >
      {pending ? "Memperbarui..." : "Perbarui"}
    </button>
  );
}

function RemoveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm text-red-600 hover:underline disabled:opacity-50"
    >
      {pending ? "Menghapus..." : "Hapus"}
    </button>
  );
}

export default function CartItemRow({ item }: { item: CartItem }) {
  return (
    <div className="flex items-center justify-between border rounded-lg p-4">
      <div className="flex-1">
        <h3 className="font-semibold">{item.name}</h3>
        <p className="text-gray-600">${(item.price / 100).toFixed(2)}</p>
      </div>
      <div className="flex items-center gap-4">
        <form action={updateCartItemQuantity} className="flex items-center gap-2">
          <input type="hidden" name="productId" value={item.productId} />
          <input
            type="number"
            name="quantity"
            defaultValue={item.quantity}
            min="1"
            className="w-16 border rounded px-2 py-1 text-center"
          />
          <UpdateButton />
        </form>
        <form action={removeFromCart}>
          <input type="hidden" name="productId" value={item.productId} />
          <RemoveButton />
        </form>
      </div>
    </div>
  );
}
```

### Autentikasi dengan Auth.js

Siapkan Auth.js (NextAuth v5) untuk autentikasi pengguna. Instal paket yang diperlukan:

```bash
npm install next-auth@beta @auth/prisma-adapter
```

Buat konfigurasi auth di `src/auth.ts`:

```typescript
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
```

Buat route handler API di `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

Buat middleware di `src/middleware.ts` untuk melindungi rute checkout dan admin:

```typescript
export { auth as middleware } from "@/auth";

export const config = {
  matcher: ["/checkout", "/admin/:path*"],
};
```

### Checkout dengan Integrasi Stripe

Siapkan Stripe Checkout untuk pemrosesan pembayaran. Buat rute checkout session di `src/app/api/checkout/route.ts`:

```typescript
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Cart } from "@/lib/cart";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export async function POST() {
  const session = await auth();
  const cartJson = cookies().get("cart")?.value;

  if (!cartJson) {
    return NextResponse.json(
      { error: "Keranjang kosong" },
      { status: 400 }
    );
  }

  const cart: Cart = JSON.parse(cartJson);

  if (cart.items.length === 0) {
    return NextResponse.json(
      { error: "Keranjang kosong" },
      { status: 400 }
    );
  }

  const lineItems = cart.items.map((item) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: item.name,
      },
      unit_amount: item.price,
    },
    quantity: item.quantity,
  }));

  const order = await prisma.order.create({
    data: {
      userId: session?.user?.id,
      total: cart.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      ),
      status: "pending",
      items: {
        create: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
      },
    },
  });

  const stripeSession = await stripe.checkout.sessions.create({
    line_items: lineItems,
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/cancel`,
    metadata: {
      orderId: order.id,
    },
  });

  return NextResponse.json({ url: stripeSession.url });
}
```

Buat halaman checkout di `src/app/checkout/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCheckout() {
    setLoading(true);
    const res = await fetch("/api/checkout", { method: "POST" });
    const data = await res.json();

    if (data.url) {
      router.push(data.url);
    } else {
      setLoading(false);
      alert("Checkout gagal. Silakan coba lagi.");
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      <div className="max-w-md mx-auto">
        <p className="text-gray-600 mb-6">
          Anda akan diarahkan ke Stripe Checkout untuk menyelesaikan pembayaran dengan aman.
        </p>
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Mengarahkan ke Stripe..." : "Bayar dengan Stripe"}
        </button>
      </div>
    </div>
  );
}
```

Buat halaman sukses di `src/app/checkout/success/page.tsx`:

```typescript
import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id;

  if (sessionId) {
    const order = await prisma.order.findUnique({
      where: { stripeId: sessionId },
    });

    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "paid" },
      });
    }
  }

  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-bold text-green-600 mb-4">
        Pembayaran Berhasil!
      </h1>
      <p className="text-gray-600 mb-8">
        Terima kasih atas pesanan Anda. Anda akan menerima email konfirmasi segera.
      </p>
      <Link
        href="/products"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Lanjut Belanja
      </Link>
    </div>
  );
}
```

Buat halaman batal di `src/app/checkout/cancel/page.tsx`:

```typescript
import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-bold text-red-600 mb-4">
        Pembayaran Dibatalkan
      </h1>
      <p className="text-gray-600 mb-8">
        Pembayaran Anda dibatalkan. Item keranjang Anda masih tersimpan.
      </p>
      <Link
        href="/cart"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Kembali ke Keranjang
      </Link>
    </div>
  );
}
```

Buat handler webhook di `src/app/api/webhooks/stripe/route.ts` untuk pemenuhan pesanan pasca-pembayaran:

```typescript
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") as string;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Tanda tangan tidak valid" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata.orderId;

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "paid",
        stripeId: session.id,
      },
    });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    for (const item of order.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { inventory: { decrement: item.quantity } },
      });
    }
  }

  return NextResponse.json({ received: true });
}
```

### Dashboard Admin

Buat layout admin di `src/app/admin/layout.tsx`:

```typescript
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-900 text-white px-4 py-3">
        <div className="container mx-auto flex items-center gap-6">
          <h1 className="font-bold text-lg">Dashboard Admin</h1>
          <a href="/admin" className="hover:text-gray-300">Ringkasan</a>
          <a href="/admin/products" className="hover:text-gray-300">Produk</a>
          <a href="/admin/orders" className="hover:text-gray-300">Pesanan</a>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
```

Buat halaman ringkasan admin di `src/app/admin/page.tsx`:

```typescript
import prisma from "@/lib/prisma";

export default async function AdminPage() {
  const [productCount, orderCount, totalRevenue] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: "paid" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Ringkasan</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-gray-500 text-sm uppercase">Produk</h2>
          <p className="text-3xl font-bold mt-2">{productCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-gray-500 text-sm uppercase">Pesanan</h2>
          <p className="text-3xl font-bold mt-2">{orderCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-gray-500 text-sm uppercase">Pendapatan</h2>
          <p className="text-3xl font-bold mt-2">
            ${((totalRevenue._sum.total ?? 0) / 100).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
```

Buat halaman produk admin di `src/app/admin/products/page.tsx`:

```typescript
import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Produk</h1>
        <Link
          href="/admin/products/new"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Tambah Produk
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3">Nama</th>
              <th className="text-left px-4 py-3">Kategori</th>
              <th className="text-right px-4 py-3">Harga</th>
              <th className="text-right px-4 py-3">Stok</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t">
                <td className="px-4 py-3">{product.name}</td>
                <td className="px-4 py-3 text-gray-600">{product.category}</td>
                <td className="px-4 py-3 text-right">
                  ${(product.price / 100).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right">{product.inventory}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### Konfigurasi Environment

Buat file `.env` dengan variabel environment yang diperlukan:

```text
DATABASE_URL="postgresql://user:password@localhost:5432/ecommerce"
AUTH_SECRET="your-auth-secret"
AUTH_GITHUB_ID="your-github-oauth-app-id"
AUTH_GITHUB_SECRET="your-github-oauth-app-secret"
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Deployment ke Vercel

Deploy toko e-commerce ke Vercel menghubungkan database PostgreSQL, mengonfigurasi variabel environment, dan menjalankan build:

1. Dorong kode Anda ke repositori GitHub.
2. Impor repositori di Vercel.
3. Atur semua variabel environment di dashboard proyek Vercel.
4. Hubungkan database PostgreSQL (Vercel Postgres atau Neon).
5. Deploy dan jalankan `npx prisma migrate deploy` di hook pasca-deploy Vercel.

## Contoh Kode

Kode lengkap untuk tutorial ini diorganisir dalam struktur proyek berikut:

```text
src/
  app/
    admin/
      layout.tsx
      page.tsx
      products/
        page.tsx
        new/
          page.tsx
    api/
      auth/[...nextauth]/route.ts
      checkout/route.ts
      webhooks/stripe/route.ts
    cart/
      actions.ts
      page.tsx
    checkout/
      page.tsx
      success/page.tsx
      cancel/page.tsx
    products/
      page.tsx
      [id]/page.tsx
  components/
    AddToCartButton.tsx
    CartItemRow.tsx
  lib/
    cart.ts
    prisma.ts
  auth.ts
  middleware.ts
prisma/
  schema.prisma
  seed.ts
```

Semua harga disimpan sebagai integer (sen) untuk menghindari masalah presisi floating-point. Dashboard Stripe menyediakan nomor kartu uji (`4242 4242 4242 4242`) untuk pengembangan.

## Insight Penting

- **ISR untuk halaman produk**: Gunakan `revalidate` di level halaman untuk menyeimbangkan kesegaran dan performa. Untuk katalog produk e-commerce dengan perubahan yang jarang, jendela revalidasi ISR 60 detik memberikan pemuatan halaman yang hampir instan sambil menjaga data produk tetap cukup terkini.
- **Server Actions untuk mutasi keranjang**: Operasi keranjang (tambah, hapus, perbarui jumlah) adalah kandidat sempurna untuk Server Actions. Mereka berjalan sebelum JavaScript dimuat, bekerja tanpa state sisi klien, dan terintegrasi secara alami dengan penanganan formulir Next.js melalui `useFormStatus` untuk status yang menunggu.
- **Keranjang berbasis cookie vs database**: Keranjang berbasis cookie bekerja dengan baik untuk pengguna anonim dan mengurangi beban database. Untuk e-commerce produksi, pertimbangkan migrasi ke keranjang berbasis database saat pengguna masuk untuk memungkinkan sinkronisasi lintas perangkat.
- **Stripe Checkout untuk kepatuhan PCI**: Menggunakan Stripe Checkout atau Stripe Elements berarti aplikasi Anda tidak pernah menangani data kartu mentah, secara signifikan mengurangi cakupan kepatuhan PCI DSS. Alur payment intent memisahkan otorisasi pembayaran dari pemenuhan pesanan.
- **Pemenuhan pesanan berbasis webhook**: Selalu gunakan webhook Stripe untuk pemenuhan pasca-pembayaran daripada hanya mengandalkan redirect URL sukses. Webhook adalah pengiriman yang dijamin yang menangani kasus tepi seperti pembayaran tertunda dan gangguan jaringan.
- **Penyimpanan harga dalam sen**: Menyimpan harga sebagai integer (sen) menghindari kesalahan pembulatan floating-point JavaScript. Selalu lakukan aritmatika harga dalam unit mata uang terkecil dan konversi ke dolar hanya untuk tampilan.

## Langkah Berikutnya

- Jelajahi fitur keranjang lanjutan: item tersimpan, kartu hadiah, kode kupon, dan kalkulasi pajak.
- Tambahkan pencarian produk dengan full-text search menggunakan PostgreSQL atau layanan pencarian khusus.
- Implementasikan mesin rekomendasi menggunakan riwayat pembelian dan kategori produk.
- Siapkan alur kerja pemenuhan pesanan dengan kurir pengiriman dan notifikasi email.
- Tambahkan ulasan dan rating produk dengan moderasi.
- Pelajari tentang optimalisasi performa dengan Next.js: optimasi gambar dengan `next/image`, prefetching rute, dan streaming dengan React Suspense.

## Kesimpulan

Anda telah membangun toko e-commerce lengkap dengan Next.js, mengintegrasikan katalog produk dengan ISR, keranjang belanja berbasis cookie dengan Server Actions, pemrosesan pembayaran Stripe, autentikasi pengguna dengan Auth.js, dan dashboard admin. Proyek ini mendemonstrasikan pola-pola kunci Next.js untuk aplikasi produksi: pengambilan data sisi server, incremental static regeneration, server actions untuk penanganan formulir, dan komposisi API route. Arsitektur yang Anda bangun berfungsi sebagai fondasi yang dapat diperluas dengan fitur tambahan seperti manajemen inventaris, dashboard supplier, dukungan multi-bahasa, dan analitik.
