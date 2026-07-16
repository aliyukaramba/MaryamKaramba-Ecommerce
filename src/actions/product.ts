"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { productSchema, type ProductFormValues } from "@/lib/validations/product";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth-guard";
import { logActivity } from "@/lib/activity-log";
import { sanitizeRichText, sanitizeText } from "@/lib/sanitize";
import { slugify } from "@/lib/utils";

function handleActionError(error: unknown) {
  if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
    return { success: false as const, error: error.message };
  }
  console.error(error);
  return { success: false as const, error: "Something went wrong. Please try again." };
}

export async function createProduct(input: ProductFormValues) {
  try {
    const user = await requireRole(["SUPER_ADMIN", "ADMIN", "STAFF"]);
    const parsed = productSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: "Invalid product data.", fieldErrors: parsed.error.flatten().fieldErrors };
    }
    const data = parsed.data;
    const slug = slugify(data.slug || data.name);

    const [slugConflict, skuConflict] = await Promise.all([
      prisma.product.findUnique({ where: { slug } }),
      prisma.product.findUnique({ where: { sku: data.sku } }),
    ]);
    if (slugConflict) return { success: false as const, error: "A product with this slug already exists." };
    if (skuConflict) return { success: false as const, error: "A product with this SKU already exists." };

    const product = await prisma.product.create({
      data: {
        name: sanitizeText(data.name),
        slug,
        sku: data.sku,
        barcode: data.barcode,
        brand: data.brand ? sanitizeText(data.brand) : null,
        categoryId: data.categoryId,
        description: sanitizeRichText(data.description),
        shortDescription: data.shortDescription ? sanitizeText(data.shortDescription) : null,
        price: data.price,
        salePrice: data.salePrice,
        featuredImage: data.featuredImage,
        images: data.images,
        stock: data.stock,
        lowStockThreshold: data.lowStockThreshold,
        weight: data.weight,
        tags: data.tags,
        colors: data.colors,
        sizes: data.sizes,
        status: data.status,
        isFeatured: data.isFeatured,
        isTrending: data.isTrending,
        isNewArrival: data.isNewArrival,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        seoKeywords: data.seoKeywords,
        variants: {
          create: data.variants.map((v) => ({
            color: v.color,
            size: v.size,
            sku: v.sku,
            quantity: v.quantity,
            priceAdjustment: v.priceAdjustment,
            image: v.image,
          })),
        },
      },
      include: { variants: true },
    });

    if (data.stock > 0) {
      await prisma.inventory.create({
        data: {
          productId: product.id,
          type: "RESTOCK",
          quantity: data.stock,
          previousStock: 0,
          newStock: data.stock,
          reason: "Initial stock on product creation",
        },
      });
    }

    await logActivity({
      userId: user.id,
      action: "CREATE",
      entity: "Product",
      entityId: product.id,
      details: { name: product.name, sku: product.sku },
    });

    revalidatePath("/admin/products");
    revalidatePath("/shop");
    return { success: true as const, product };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateProduct(id: string, input: ProductFormValues) {
  try {
    const user = await requireRole(["SUPER_ADMIN", "ADMIN", "STAFF"]);
    const parsed = productSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: "Invalid product data.", fieldErrors: parsed.error.flatten().fieldErrors };
    }
    const data = parsed.data;
    const slug = slugify(data.slug || data.name);

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return { success: false as const, error: "Product not found." };

    const [slugConflict, skuConflict] = await Promise.all([
      prisma.product.findFirst({ where: { slug, NOT: { id } } }),
      prisma.product.findFirst({ where: { sku: data.sku, NOT: { id } } }),
    ]);
    if (slugConflict) return { success: false as const, error: "A product with this slug already exists." };
    if (skuConflict) return { success: false as const, error: "A product with this SKU already exists." };

    const product = await prisma.$transaction(async (tx) => {
      // Diff variants instead of wholesale delete+recreate: a variant that has
      // ever been ordered must survive (its InquiryItem rows still need it
      // for the order-history display), even if the admin removes it from
      // the edit form. We match existing variants by SKU.
      const existingVariants = await tx.productVariant.findMany({ where: { productId: id } });
      const existingBySku = new Map(existingVariants.map((v) => [v.sku, v]));
      const incomingSkus = new Set(data.variants.map((v) => v.sku));

      const variantsWithHistory = await tx.inquiryItem.findMany({
        where: { variantId: { in: existingVariants.map((v) => v.id) } },
        select: { variantId: true },
        distinct: ["variantId"],
      });
      const protectedVariantIds = new Set(variantsWithHistory.map((v) => v.variantId));

      // Deactivate (don't delete) removed variants that have order history;
      // safely delete removed variants that were never ordered.
      for (const existingVariant of existingVariants) {
        if (!incomingSkus.has(existingVariant.sku)) {
          if (protectedVariantIds.has(existingVariant.id)) {
            await tx.productVariant.update({
              where: { id: existingVariant.id },
              data: { isActive: false },
            });
          } else {
            await tx.productVariant.delete({ where: { id: existingVariant.id } });
          }
        }
      }

      // Upsert incoming variants: update in place if the SKU already exists
      // (preserves its id and any inquiry-item references), otherwise create.
      for (const v of data.variants) {
        const match = existingBySku.get(v.sku);
        if (match) {
          await tx.productVariant.update({
            where: { id: match.id },
            data: {
              color: v.color,
              size: v.size,
              quantity: v.quantity,
              priceAdjustment: v.priceAdjustment,
              image: v.image,
              isActive: true,
            },
          });
        } else {
          await tx.productVariant.create({
            data: {
              productId: id,
              color: v.color,
              size: v.size,
              sku: v.sku,
              quantity: v.quantity,
              priceAdjustment: v.priceAdjustment,
              image: v.image,
            },
          });
        }
      }

      const updated = await tx.product.update({
        where: { id },
        data: {
          name: sanitizeText(data.name),
          slug,
          sku: data.sku,
          barcode: data.barcode,
          brand: data.brand ? sanitizeText(data.brand) : null,
          categoryId: data.categoryId,
          description: sanitizeRichText(data.description),
          shortDescription: data.shortDescription ? sanitizeText(data.shortDescription) : null,
          price: data.price,
          salePrice: data.salePrice,
          featuredImage: data.featuredImage,
          images: data.images,
          stock: data.stock,
          lowStockThreshold: data.lowStockThreshold,
          weight: data.weight,
          tags: data.tags,
          colors: data.colors,
          sizes: data.sizes,
          status: data.status,
          isFeatured: data.isFeatured,
          isTrending: data.isTrending,
          isNewArrival: data.isNewArrival,
          seoTitle: data.seoTitle,
          seoDescription: data.seoDescription,
          seoKeywords: data.seoKeywords,
        },
        include: { variants: true },
      });

      if (existing.stock !== data.stock) {
        await tx.inventory.create({
          data: {
            productId: id,
            type: "ADJUSTMENT",
            quantity: data.stock - existing.stock,
            previousStock: existing.stock,
            newStock: data.stock,
            reason: "Manual adjustment via product edit",
          },
        });
      }

      return updated;
    });

    await logActivity({ userId: user.id, action: "UPDATE", entity: "Product", entityId: id });

    revalidatePath("/admin/products");
    revalidatePath(`/product/${slug}`);
    revalidatePath("/shop");
    return { success: true as const, product };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteProduct(id: string) {
  try {
    const user = await requireRole(["SUPER_ADMIN", "ADMIN"]);

    const inquiryItemCount = await prisma.inquiryItem.count({ where: { productId: id } });
    if (inquiryItemCount > 0) {
      // Preserve order history — archive instead of hard delete
      await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
      await logActivity({ userId: user.id, action: "STATUS_CHANGE", entity: "Product", entityId: id, details: { archived: true } });
      revalidatePath("/admin/products");
      return { success: true as const, archived: true };
    }

    await prisma.product.delete({ where: { id } });
    await logActivity({ userId: user.id, action: "DELETE", entity: "Product", entityId: id });
    revalidatePath("/admin/products");
    revalidatePath("/shop");
    return { success: true as const, archived: false };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function bulkUpdateProductStatus(
  ids: string[],
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
) {
  try {
    const user = await requireRole(["SUPER_ADMIN", "ADMIN", "STAFF"]);
    await prisma.product.updateMany({ where: { id: { in: ids } }, data: { status } });
    await logActivity({
      userId: user.id,
      action: "STATUS_CHANGE",
      entity: "Product",
      details: { ids, status, bulk: true },
    });
    revalidatePath("/admin/products");
    revalidatePath("/shop");
    return { success: true as const };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function bulkDeleteProducts(ids: string[]) {
  try {
    const user = await requireRole(["SUPER_ADMIN", "ADMIN"]);

    const withHistory = await prisma.inquiryItem.findMany({
      where: { productId: { in: ids } },
      select: { productId: true },
      distinct: ["productId"],
    });
    const protectedIds = new Set(withHistory.map((i) => i.productId));
    const deletable = ids.filter((id) => !protectedIds.has(id));
    const toArchive = ids.filter((id) => protectedIds.has(id));

    if (deletable.length) {
      await prisma.product.deleteMany({ where: { id: { in: deletable } } });
    }
    if (toArchive.length) {
      await prisma.product.updateMany({ where: { id: { in: toArchive } }, data: { status: "ARCHIVED" } });
    }

    await logActivity({
      userId: user.id,
      action: "DELETE",
      entity: "Product",
      details: { deleted: deletable, archived: toArchive },
    });

    revalidatePath("/admin/products");
    revalidatePath("/shop");
    return { success: true as const, deletedCount: deletable.length, archivedCount: toArchive.length };
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Adjusts stock for a product directly from the Inventory screen
 * (restock, damage write-off, manual correction, return).
 */
export async function adjustStock(
  productId: string,
  type: "RESTOCK" | "ADJUSTMENT" | "RETURN" | "DAMAGE",
  quantity: number,
  reason?: string
) {
  try {
    const user = await requireRole(["SUPER_ADMIN", "ADMIN", "STAFF"]);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return { success: false as const, error: "Product not found." };

    const delta = type === "DAMAGE" ? -Math.abs(quantity) : quantity;
    const newStock = Math.max(0, product.stock + delta);

    await prisma.$transaction([
      prisma.product.update({ where: { id: productId }, data: { stock: newStock } }),
      prisma.inventory.create({
        data: {
          productId,
          type,
          quantity: delta,
          previousStock: product.stock,
          newStock,
          reason,
        },
      }),
    ]);

    await logActivity({
      userId: user.id,
      action: "UPDATE",
      entity: "Inventory",
      entityId: productId,
      details: { type, quantity: delta, newStock },
    });

    revalidatePath("/admin/inventory");
    revalidatePath("/admin/products");
    return { success: true as const, newStock };
  } catch (error) {
    return handleActionError(error);
  }
}

/** Increments the public-facing view counter — called from the product page, no auth required. */
export async function incrementProductView(productId: string) {
  try {
    await prisma.product.update({
      where: { id: productId },
      data: { viewCount: { increment: 1 } },
    });
    return { success: true as const };
  } catch (error) {
    console.error("incrementProductView failed:", error);
    return { success: false as const };
  }
}

/** Increments the "clicked Buy on WhatsApp" counter — called before the inquiry modal opens. */
export async function incrementProductClick(productId: string) {
  try {
    await prisma.product.update({
      where: { id: productId },
      data: { clickCount: { increment: 1 } },
    });
    return { success: true as const };
  } catch (error) {
    console.error("incrementProductClick failed:", error);
    return { success: false as const };
  }
}
