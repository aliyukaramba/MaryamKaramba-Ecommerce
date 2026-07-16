import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MessageCircle, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/storefront/product-card";

export const revalidate = 60;

async function getHomeData() {
  const [homepage, featured, trending, newArrivals] = await Promise.all([
    prisma.homepageSettings.findFirst(),
    prisma.product.findMany({
      where: { status: "PUBLISHED", isFeatured: true },
      take: 4,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { status: "PUBLISHED", isTrending: true },
      take: 4,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { status: "PUBLISHED", isNewArrival: true },
      take: 4,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { homepage, featured, trending, newArrivals };
}

export default async function HomePage() {
  const { homepage, featured, trending, newArrivals } = await getHomeData();

  const heroTitle = homepage?.heroTitle ?? "Premium Products, Delivered Fast";
  const heroSubtitle =
    homepage?.heroSubtitle ??
    "Browse our catalog and order instantly on WhatsApp — no cart, no checkout, just a chat.";

  const faqs = (homepage?.faqs as { question: string; answer: string }[] | null) ?? [];
  const testimonials =
    (homepage?.testimonials as { name: string; rating: number; text: string }[] | null) ?? [];

  return (
    <div>
      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden border-b border-border bg-secondary/30">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-28">
          <div className="space-y-6">
            <span className="chat-tail inline-block rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground">
              Shop → Chat → Done
            </span>
            <h1 className="text-balance font-display text-4xl leading-[1.1] md:text-6xl">
              {heroTitle}
            </h1>
            <p className="max-w-md text-balance text-lg text-muted-foreground">
              {heroSubtitle}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/shop">
                  {homepage?.heroCtaText ?? "Shop Now"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/faq">How it works</Link>
              </Button>
            </div>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-md">
            {homepage?.heroImage ? (
              <Image
                src={homepage.heroImage}
                alt={heroTitle}
                fill
                className="rounded-3xl object-cover"
                priority
              />
            ) : (
              <div className="chat-tail flex h-full w-full items-center justify-center rounded-3xl bg-primary text-primary-foreground">
                <MessageCircle className="h-24 w-24 opacity-30" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---- Featured ---- */}
      {homepage?.showFeatured !== false && featured.length > 0 && (
        <ProductSection title="Featured" products={featured} />
      )}

      {/* ---- Trending ---- */}
      {homepage?.showTrending !== false && trending.length > 0 && (
        <ProductSection title="Trending Now" products={trending} />
      )}

      {/* ---- New Arrivals ---- */}
      {homepage?.showNewArrival !== false && newArrivals.length > 0 && (
        <ProductSection title="New Arrivals" products={newArrivals} />
      )}

      {/* ---- Testimonials ---- */}
      {testimonials.length > 0 && (
        <section className="border-t border-border bg-secondary/30 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="mb-10 font-display text-3xl">What customers say</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((t, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-6">
                  <div className="mb-3 flex gap-0.5 text-accent">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">&ldquo;{t.text}&rdquo;</p>
                  <p className="mt-3 text-sm font-medium">{t.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---- FAQ preview ---- */}
      {faqs.length > 0 && (
        <section className="py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="mb-8 font-display text-3xl">Frequently asked</h2>
            <div className="space-y-4">
              {faqs.slice(0, 3).map((f, i) => (
                <details key={i} className="group rounded-xl border border-border bg-card p-4">
                  <summary className="cursor-pointer list-none font-medium">
                    {f.question}
                  </summary>
                  <p className="mt-2 text-sm text-muted-foreground">{f.answer}</p>
                </details>
              ))}
            </div>
            <Link href="/faq" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">
              View all questions →
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function ProductSection({
  title,
  products,
}: {
  title: string;
  products: Array<{
    id: string;
    name: string;
    slug: string;
    price: unknown;
    salePrice: unknown;
    featuredImage: string;
    stock: number;
    isFeatured: boolean;
    isTrending: boolean;
    isNewArrival: boolean;
  }>;
}) {
  return (
    <section className="border-t border-border py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-3xl">{title}</h2>
          <Link href="/shop" className="text-sm font-medium text-accent hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={{
                ...p,
                price: Number(p.price),
                salePrice: p.salePrice != null ? Number(p.salePrice) : null,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
