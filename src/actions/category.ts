"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth-guard";
import { logActivity } from "@/lib/activity-log";
import { sanitizeText } from "@/lib/sanitize";
import { slugify } from "@/lib/utils";

const categorySchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120).optional(),
  description: z.string().max(1000).optional().nullable(),
  image: z.string().url().optional().nullable(),
  parentId: z.string().cuid().optional().nullable(),
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
  seoTitle: z.string().max(70).optional().nullable(),
  seoDescription: z.string().max(160).optional().nullable(),
});

export type CategoryInput = z.infer<typeof categorySchema>;

function handleActionError(error: unknown) {
  if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
    return { success: false as const, error: error.message };
  }
  console.error(error);
  return { success: false as const, error: "Something went wrong. Please try again." };
}

export async function createCategory(input: CategoryInput) {
  try {
    const user = await requireRole(["SUPER_ADMIN", "ADMIN", "STAFF"]);
    const parsed = categorySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: "Invalid category data.", fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const data = parsed.data;
    const slug = slugify(data.slug || data.name);

    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      return { success: false as const, error: "A category with this slug already exists." };
    }

    const category = await prisma.category.create({
      data: {
        name: sanitizeText(data.name),
        slug,
        description: data.description ? sanitizeText(data.description) : null,
        image: data.image,
        parentId: data.parentId,
        order: data.order,
        isActive: data.isActive,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
      },
    });

    await logActivity({
      userId: user.id,
      action: "CREATE",
      entity: "Category",
      entityId: category.id,
      details: { name: category.name },
    });

    revalidatePath("/admin/categories");
    revalidatePath("/shop");
    return { success: true as const, category };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateCategory(id: string, input: CategoryInput) {
  try {
    const user = await requireRole(["SUPER_ADMIN", "ADMIN", "STAFF"]);
    const parsed = categorySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: "Invalid category data.", fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const data = parsed.data;
    const slug = slugify(data.slug || data.name);

    const conflict = await prisma.category.findFirst({
      where: { slug, NOT: { id } },
    });
    if (conflict) {
      return { success: false as const, error: "A category with this slug already exists." };
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: sanitizeText(data.name),
        slug,
        description: data.description ? sanitizeText(data.description) : null,
        image: data.image,
        parentId: data.parentId,
        order: data.order,
        isActive: data.isActive,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
      },
    });

    await logActivity({
      userId: user.id,
      action: "UPDATE",
      entity: "Category",
      entityId: category.id,
    });

    revalidatePath("/admin/categories");
    revalidatePath("/shop");
    return { success: true as const, category };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteCategory(id: string) {
  try {
    const user = await requireRole(["SUPER_ADMIN", "ADMIN"]);

    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return {
        success: false as const,
        error: `Cannot delete: ${productCount} product(s) still reference this category.`,
      };
    }

    await prisma.category.delete({ where: { id } });

    await logActivity({ userId: user.id, action: "DELETE", entity: "Category", entityId: id });

    revalidatePath("/admin/categories");
    revalidatePath("/shop");
    return { success: true as const };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function toggleCategoryActive(id: string, isActive: boolean) {
  try {
    const user = await requireRole(["SUPER_ADMIN", "ADMIN", "STAFF"]);
    await prisma.category.update({ where: { id }, data: { isActive } });
    await logActivity({
      userId: user.id,
      action: "STATUS_CHANGE",
      entity: "Category",
      entityId: id,
      details: { isActive },
    });
    revalidatePath("/admin/categories");
    return { success: true as const };
  } catch (error) {
    return handleActionError(error);
  }
}
