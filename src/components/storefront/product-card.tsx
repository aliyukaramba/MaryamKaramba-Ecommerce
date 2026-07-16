import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  featuredImage: string;
  stock: number;
  isFeatured?: boolean;
  isTrending?: boolean;
  isNewArrival?: boolean;
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const onSale = product.salePrice != null && product.salePrice < product.price;
  const outOfStock = product.stock <= 0;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Image
          src={product.featuredImage}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {onSale && <Badge variant="accent">Sale</Badge>}
          {product.isNewArrival && <Badge variant="secondary">New</Badge>}
          {product.isTrending && <Badge variant="outline">Trending</Badge>}
        </div>
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <span className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background">
              Out of stock
            </span>
          </div>
        )}
      </div>
      <div className="space-y-1 p-4">
        <h3 className="line-clamp-1 font-display text-base">{product.name}</h3>
        <div className="flex items-baseline gap-2 font-data">
          <span className="text-base font-semibold">
            {formatCurrency(product.salePrice ?? product.price)}
          </span>
          {onSale && (
            <span className="text-xs text-muted-foreground line-through">
              {formatCurrency(product.price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
