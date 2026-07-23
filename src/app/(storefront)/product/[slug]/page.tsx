import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { BuyOnWhatsAppModal } from "@/components/storefront/buy-on-whatsapp-modal";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import { ShareButton } from "@/components/storefront/share-button";
import { ProductCard } from "@/components/storefront/product-card";
import { incrementProductView } from "@/actions/product";
import { getCurrentCustomerAccount } from "@/actions/customer-auth";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

async function getProduct(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: { category: true, variants: { where: { isActive: true } } },
  });
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found" };

  const title = product.seoTitle || product.name;
  const description =
    product.seoDescription || product.shortDescription || product.description.slice(0, 160);

  return {
    title,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title,
      description,
      images: [product.featuredImage],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [product.featuredImage],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product || product.status !== "PUBLISHED") {
    notFound();
  }

  incrementProductView(product.id).catch(() => {});

  const [related, customerAccount] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: "PUBLISHED",
        categoryId: product.categoryId,
        NOT: { id: product.id },
      },
      take: 4,
    }),
    getCurrentCustomerAccount(),
  ]);

  const price = Number(product.price);
  const salePrice = product.salePrice != null ? Number(product.salePrice) : null;
  const onSale = salePrice != null && salePrice < price;
  const gallery = [product.featuredImage, ...product.images.filter((i) => i !== product.featuredImage)];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: gallery,
    description: product.shortDescription || product.description,
    sku: product.sku,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/product/${product.slug}`,
      priceCurrency: "NGN",
      price: salePrice ?? price,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/shop" className="hover:text-foreground">Shop</Link>
        <span className="mx-2">/</span>
        <Link href={`/category/${product.category.slug}`} className="hover:text-foreground">
          {product.category.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-10 md:grid-cols-2">
        <ProductGallery images={gallery} name={product.name} />

        <div className="space-y-5">
          <div className="flex flex-wrap gap-1.5">
            {onSale && <Badge variant="accent">Sale</Badge>}
            {product.isNewArrival && <Badge variant="secondary">New Arrival</Badge>}
            {product.isTrending && <Badge variant="outline">Trending</Badge>}
          </div>

          <div className="flex items-start justify-between gap-4">
            <h1 className="font-display text-3xl md:text-4xl">{product.name}</h1>
            <ShareButton
              title={product.name}
              text={product.shortDescription ?? undefined}
              url={`${siteUrl}/product/${product.slug}`}
            />
          </div>

          {product.brand && (
            <p className="text-sm text-muted-foreground">Brand: {product.brand}</p>
          )}

          <div className="flex items-baseline gap-3 font-data">
            <span className="text-2xl font-semibold">
              {formatCurrency(salePrice ?? price)}
            </span>
            {onSale && (
              <span className="text-base text-muted-foreground line-through">
                {formatCurrency(price)}
              </span>
            )}
          </div>

          {product.shortDescription && (
            <p className="text-muted-foreground">{product.shortDescription}</p>
          )}

          <BuyOnWhatsAppModal
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              sku: product.sku,
              price,
              salePrice,
              stock: product.stock,
              colors: product.colors,
              sizes: product.sizes,
              variants: product.variants.map((v) => ({
                id: v.id,
                color: v.color,
                size: v.size,
                quantity: v.quantity,
                priceAdjustment: Number(v.priceAdjustment),
                sku: v.sku,
              })),
            }}
            initialAccount={customerAccount}
          />

          <AddToCartButton
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              sku: product.sku,
              price,
              salePrice,
              stock: product.stock,
              featuredImage: product.featuredImage,
              colors: product.colors,
              sizes: product.sizes,
              variants: product.variants.map((v) => ({
                id: v.id,
                color: v.color,
                size: v.size,
                quantity: v.quantity,
                priceAdjustment: Number(v.priceAdjustment),
                sku: v.sku,
              })),
            }}
          />

          <div className="space-y-2 border-t border-border pt-5 text-sm">
            <p><span className="font-medium">SKU:</span> <span className="font-data">{product.sku}</span></p>
            {product.tags.length > 0 && (
              <p className="flex flex-wrap gap-1.5">
                {product.tags.map((t) => (
                  <span key={t} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">
                    {t}
                  </span>
                ))}
              </p>
            )}
          </div>

          <div className="prose prose-sm max-w-none border-t border-border pt-5 text-foreground/90">
            <p>{product.description}</p>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16 border-t border-border pt-10">
          <h2 className="mb-6 font-display text-2xl">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
            {related.map((p) => (
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
        </section>
      )}
    </div>
  );
}
