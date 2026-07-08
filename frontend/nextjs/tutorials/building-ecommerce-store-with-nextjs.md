---
title: "Building an E-commerce Store with Next.js"
description: "A comprehensive hands-on tutorial covering product catalog with ISR, shopping cart with Server Actions, Stripe checkout, authentication, and order management in Next.js."
category: "frontend"
technology: "nextjs"
difficulty: "advanced"
type: "tutorial"
locale: "en"
---

# Building an E-commerce Store with Next.js

## Summary

In this tutorial, you will build a fully functional e-commerce store using Next.js App Router. You will learn how to create a dynamic product catalog with Incremental Static Regeneration (ISR), implement a shopping cart using Server Actions and cookies, integrate Stripe for payment processing, set up authentication with Auth.js, and build an admin dashboard for managing products and orders. By the end of this tutorial, you will have a production-ready e-commerce application deployed on Vercel.

## Target Audience

- Full-stack and frontend developers with React experience.
- Developers familiar with Next.js basics who want to build real-world applications.
- Expected developer level: Advanced.

## Prerequisites

- Solid understanding of React (hooks, components, props).
- Familiarity with Next.js App Router fundamentals (layouts, routes, Server Components).
- Node.js 18+ and a package manager (npm, yarn, or pnpm) installed.
- A Stripe account (free) for payment integration testing.
- A free Vercel account for deployment.
- Basic familiarity with SQL and PostgreSQL (we use Prisma ORM).

## Learning Objectives

By the end of this tutorial, you will be able to:

- Set up a Next.js project with Prisma ORM and PostgreSQL.
- Build a product catalog with ISR for high-performance content delivery.
- Implement a shopping cart using Server Actions and cookies for state management.
- Integrate Stripe Checkout for secure payment processing.
- Set up authentication with Auth.js (NextAuth v5) for user accounts.
- Build an admin dashboard for product and order management.
- Deploy the complete e-commerce application to Vercel.

## Context and Motivation

Building an e-commerce store is one of the most common real-world full-stack challenges. It requires handling dynamic product data, managing user sessions through a shopping cart, processing payments securely, and maintaining an admin interface — all while delivering excellent performance and SEO. Next.js excels at this because it combines Server Components for fast initial page loads, ISR for keeping product pages fresh without full rebuilds, and Server Actions for seamless form handling. This tutorial walks through each layer of an e-commerce architecture, making it an ideal project for developers looking to level up their full-stack skills.

## Core Content

### Project Setup and Database Schema

Start by creating a new Next.js project with TypeScript and Tailwind CSS:

```bash
npx create-next-app@latest ecommerce-app --typescript --tailwind --app --src-dir
cd ecommerce-app
```

Install the core dependencies:

```bash
npm install @prisma/client @auth/prisma-adapter stripe @stripe/stripe-js
npm install prisma --save-dev
```

Set up Prisma with PostgreSQL. Create the schema file at `prisma/schema.prisma`:

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

Run the migration:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Create a Prisma client singleton at `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = globalThis.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;

export default prisma;
```

### Seeding Product Data

Create a seed file at `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const products = [
  {
    name: "Wireless Headphones",
    description: "Premium noise-canceling wireless headphones with 30-hour battery life.",
    price: 29999,
    image: "/images/headphones.jpg",
    category: "electronics",
    inventory: 50,
  },
  {
    name: "Cotton T-Shirt",
    description: "Comfortable 100% organic cotton t-shirt available in multiple sizes.",
    price: 2499,
    image: "/images/tshirt.jpg",
    category: "clothing",
    inventory: 200,
  },
  {
    name: "Leather Notebook",
    description: "Handcrafted leather-bound notebook with 200 pages of acid-free paper.",
    price: 1999,
    image: "/images/notebook.jpg",
    category: "stationery",
    inventory: 100,
  },
  {
    name: "Running Shoes",
    description: "Lightweight running shoes with responsive cushioning and breathable mesh.",
    price: 12999,
    image: "/images/shoes.jpg",
    category: "sports",
    inventory: 75,
  },
  {
    name: "Coffee Maker",
    description: "Programmable 12-cup coffee maker with thermal carafe and auto-shutoff.",
    price: 7999,
    image: "/images/coffee-maker.jpg",
    category: "kitchen",
    inventory: 30,
  },
  {
    name: "Yoga Mat",
    description: "Extra-thick non-slip yoga mat with carrying strap, 6mm thickness.",
    price: 3499,
    image: "/images/yoga-mat.jpg",
    category: "sports",
    inventory: 150,
  },
];

async function main() {
  console.log("Seeding products...");
  for (const product of products) {
    await prisma.product.create({ data: product });
  }
  console.log(`Seeded ${products.length} products.`);
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

Add the seed configuration to `package.json`:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

Run the seed script:

```bash
npx prisma db seed
```

### Product Catalog with Incremental Static Regeneration

Create the product listing page at `src/app/products/page.tsx`. This page uses ISR to regenerate product data at most every 60 seconds while serving cached pages to visitors:

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
      <h1 className="text-3xl font-bold mb-8">All Products</h1>
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

Create the dynamic product detail page at `src/app/products/[id]/page.tsx`:

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
              ? `${product.inventory} in stock`
              : "Out of stock"}
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

### Shopping Cart with Server Actions and Cookies

The shopping cart is stored as a cookie on the client side. Server Actions handle adding, removing, and updating cart items. This approach keeps the cart persistent across sessions without requiring a database.

Create the cart types at `src/lib/cart.ts`:

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

Create the Server Actions at `src/app/cart/actions.ts`:

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
    throw new Error("Product unavailable or insufficient inventory.");
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

Create the Add to Cart button at `src/components/AddToCartButton.tsx`:

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
      {pending ? "Adding..." : "Add to Cart"}
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

Create the cart page at `src/app/cart/page.tsx`:

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
        <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
        <p className="text-gray-600 mb-8">
          Add some products to get started.
        </p>
        <Link
          href="/products"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
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
          Proceed to Checkout
        </Link>
      </div>
    </div>
  );
}
```

Create the CartItemRow client component at `src/components/CartItemRow.tsx`:

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
      {pending ? "Updating..." : "Update"}
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
      {pending ? "Removing..." : "Remove"}
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

### Authentication with Auth.js

Set up Auth.js (NextAuth v5) for user authentication. Install the required packages:

```bash
npm install next-auth@beta @auth/prisma-adapter
```

Create the auth configuration at `src/auth.ts`:

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

Create the API route handler at `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

Create a middleware at `src/middleware.ts` to protect the checkout and admin routes:

```typescript
export { auth as middleware } from "@/auth";

export const config = {
  matcher: ["/checkout", "/admin/:path*"],
};
```

### Checkout with Stripe Integration

Set up Stripe Checkout for payment processing. Create the checkout session route at `src/app/api/checkout/route.ts`:

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
      { error: "Cart is empty" },
      { status: 400 }
    );
  }

  const cart: Cart = JSON.parse(cartJson);

  if (cart.items.length === 0) {
    return NextResponse.json(
      { error: "Cart is empty" },
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

Create the checkout page at `src/app/checkout/page.tsx`:

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
      alert("Checkout failed. Please try again.");
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      <div className="max-w-md mx-auto">
        <p className="text-gray-600 mb-6">
          You will be redirected to Stripe Checkout to complete your payment securely.
        </p>
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Redirecting to Stripe..." : "Pay with Stripe"}
        </button>
      </div>
    </div>
  );
}
```

Create the success page at `src/app/checkout/success/page.tsx`:

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
        Payment Successful!
      </h1>
      <p className="text-gray-600 mb-8">
        Thank you for your order. You will receive a confirmation email shortly.
      </p>
      <Link
        href="/products"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Continue Shopping
      </Link>
    </div>
  );
}
```

Create the cancel page at `src/app/checkout/cancel/page.tsx`:

```typescript
import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-bold text-red-600 mb-4">
        Payment Cancelled
      </h1>
      <p className="text-gray-600 mb-8">
        Your payment was cancelled. Your cart items are still saved.
      </p>
      <Link
        href="/cart"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Return to Cart
      </Link>
    </div>
  );
}
```

Create a webhook handler at `src/app/api/webhooks/stripe/route.ts` for post-payment order fulfillment:

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
      { error: "Invalid signature" },
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

### Admin Dashboard

Create the admin layout at `src/app/admin/layout.tsx`:

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
          <h1 className="font-bold text-lg">Admin Dashboard</h1>
          <a href="/admin" className="hover:text-gray-300">Overview</a>
          <a href="/admin/products" className="hover:text-gray-300">Products</a>
          <a href="/admin/orders" className="hover:text-gray-300">Orders</a>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
```

Create the admin overview page at `src/app/admin/page.tsx`:

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
      <h1 className="text-2xl font-bold mb-6">Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-gray-500 text-sm uppercase">Products</h2>
          <p className="text-3xl font-bold mt-2">{productCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-gray-500 text-sm uppercase">Orders</h2>
          <p className="text-3xl font-bold mt-2">{orderCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-gray-500 text-sm uppercase">Revenue</h2>
          <p className="text-3xl font-bold mt-2">
            ${((totalRevenue._sum.total ?? 0) / 100).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
```

Create the admin products page at `src/app/admin/products/page.tsx`:

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
        <h1 className="text-2xl font-bold">Products</h1>
        <Link
          href="/admin/products/new"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Product
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-right px-4 py-3">Price</th>
              <th className="text-right px-4 py-3">Inventory</th>
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

### Environment Configuration

Create a `.env` file with the required environment variables:

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

### Deployment to Vercel

Deploying the e-commerce store to Vercel connects the PostgreSQL database, configures environment variables, and runs the build:

1. Push your code to a GitHub repository.
2. Import the repository on Vercel.
3. Set all environment variables in the Vercel project dashboard.
4. Connect a PostgreSQL database (Vercel Postgres or Neon).
5. Deploy and run `npx prisma migrate deploy` in the Vercel post-deploy hook.

## Code Examples

The complete code for this tutorial is organized in the following project structure:

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

All prices are stored as integers (cents) to avoid floating-point precision issues. The Stripe dashboard provides test card numbers (`4242 4242 4242 4242`) for development.

## Key Insights

- **ISR for product pages**: Use `revalidate` at the page level to balance freshness and performance. For e-commerce product catalogs with infrequent changes, an ISR revalidation window of 60 seconds provides near-instant page loads while keeping product data reasonably current.
- **Server Actions for cart mutations**: Cart operations (add, remove, update quantity) are perfect candidates for Server Actions. They run before JavaScript loads, work without client-side state, and integrate naturally with Next.js form handling via `useFormStatus` for pending states.
- **Cookie-based cart vs database cart**: A cookie-based cart works well for anonymous users and reduces database load. For production e-commerce, consider migrating to a database-backed cart when users sign in to enable cross-device synchronization.
- **Stripe Checkout for PCI compliance**: Using Stripe Checkout or Stripe Elements means your application never handles raw card data, significantly reducing your PCI DSS compliance scope. The payment intent flow separates payment authorization from fulfillment.
- **Webhook-driven order fulfillment**: Always use Stripe webhooks for post-payment fulfillment rather than relying solely on the success URL redirect. Webhooks are guaranteed delivery events that handle edge cases like delayed payments and network interruptions.
- **Price storage in cents**: Storing prices as integers (cents/paise) avoids JavaScript floating-point rounding errors. Always do price arithmetic in the smallest currency unit and convert to dollars only for display.

## Next Steps

- Explore advanced cart features: saved items, gift cards, coupon codes, and tax calculation.
- Add product search with full-text search using PostgreSQL or a dedicated search service.
- Implement a recommendation engine using purchase history and product categories.
- Set up order fulfillment workflows with shipping carriers and email notifications.
- Add product reviews and ratings with moderation.
- Learn about performance optimization with Next.js: image optimization with `next/image`, route prefetching, and streaming with React Suspense.

## Conclusion

You have built a complete e-commerce store with Next.js, integrating a product catalog with ISR, a cookie-based shopping cart with Server Actions, Stripe payment processing, user authentication with Auth.js, and an admin dashboard. This project demonstrates key Next.js patterns for production applications: server-side data fetching, incremental static regeneration, server actions for form handling, and API route composition. The architecture you built serves as a foundation that can be extended with additional features like inventory management, supplier dashboards, multi-language support, and analytics.
