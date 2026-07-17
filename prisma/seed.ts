import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ---- Default admin user ----
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD ?? "Admin123!";
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Super Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });
  console.log(`✅ Admin user ready: ${admin.email}`);

  // ---- Business settings ----
  const existingBusiness = await prisma.businessSettings.findFirst();
  if (!existingBusiness) {
    await prisma.businessSettings.create({
      data: {
        businessName: "amazstore.shop",
        whatsappNumber: process.env.WHATSAPP_NUMBER ?? "2348012345678",
        businessEmail: "hello@yourdomain.com",
        address: "Lagos, Nigeria",
        currency: "NGN",
        currencySymbol: "₦",
        timezone: "Africa/Lagos",
        primaryColor: "#0f172a",
        secondaryColor: "#ffffff",
      },
    });
    console.log("✅ Business settings created");
  }

  // ---- Homepage settings ----
  const existingHomepage = await prisma.homepageSettings.findFirst();
  if (!existingHomepage) {
    await prisma.homepageSettings.create({
      data: {
        heroTitle: "Premium Products, Delivered Fast",
        heroSubtitle: "Browse our catalog and order instantly on WhatsApp",
        heroCtaText: "Shop Now",
        heroCtaLink: "/shop",
        showFeatured: true,
        showTrending: true,
        showNewArrival: true,
        faqs: [
          { question: "How do I place an order?", answer: "Browse a product, click 'Buy on WhatsApp', fill in your details, and confirm your order directly in WhatsApp." },
          { question: "Do you deliver nationwide?", answer: "Yes, we deliver to all states. Delivery fees vary by location and are confirmed via WhatsApp." },
          { question: "What payment methods do you accept?", answer: "Payment is arranged directly with our team over WhatsApp after you place your inquiry." },
        ],
        testimonials: [
          { name: "Amaka O.", rating: 5, text: "Ordering was so easy — just a few taps and I was chatting with them on WhatsApp!" },
          { name: "Tunde A.", rating: 5, text: "Fast delivery and great communication throughout." },
        ],
      },
    });
    console.log("✅ Homepage settings created");
  }

  // ---- Categories ----
  const categoriesData = [
    { name: "Footwear", slug: "footwear", description: "Sneakers, sandals, and formal shoes" },
    { name: "Apparel", slug: "apparel", description: "Shirts, trousers, and outerwear" },
    { name: "Accessories", slug: "accessories", description: "Bags, watches, and jewelry" },
    { name: "Electronics", slug: "electronics", description: "Gadgets and accessories" },
  ];

  const categories = [];
  for (const cat of categoriesData) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categories.push(category);
  }
  console.log(`✅ ${categories.length} categories ready`);

  // ---- Sample products ----
  const productsData = [
    {
      name: "Nike Air Max 2025",
      slug: "nike-air-max-2025",
      sku: "NK-2025-001",
      brand: "Nike",
      categorySlug: "footwear",
      description:
        "The Nike Air Max 2025 combines classic style with modern comfort, featuring a responsive Air cushioning unit and breathable mesh upper for all-day wear.",
      shortDescription: "Classic comfort meets modern style.",
      price: 45000,
      salePrice: 39000,
      featuredImage: "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
      images: ["https://res.cloudinary.com/demo/image/upload/v1/sample.jpg"],
      stock: 25,
      colors: ["Black", "White", "Red"],
      sizes: ["40", "41", "42", "43", "44"],
      tags: ["sneakers", "running", "nike"],
      isFeatured: true,
      isTrending: true,
      status: "PUBLISHED" as const,
      variants: [
        { color: "Black", size: "42", sku: "NK-2025-001-BLK-42", quantity: 8, priceAdjustment: 0 },
        { color: "White", size: "42", sku: "NK-2025-001-WHT-42", quantity: 6, priceAdjustment: 0 },
        { color: "Red", size: "43", sku: "NK-2025-001-RED-43", quantity: 4, priceAdjustment: 2000 },
      ],
    },
    {
      name: "Classic Leather Belt",
      slug: "classic-leather-belt",
      sku: "ACC-BELT-001",
      brand: "Generic",
      categorySlug: "accessories",
      description:
        "Genuine leather belt with a polished buckle, suitable for both formal and casual wear. Durable stitching ensures long-lasting use.",
      shortDescription: "Genuine leather, timeless design.",
      price: 12000,
      featuredImage: "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
      images: ["https://res.cloudinary.com/demo/image/upload/v1/sample.jpg"],
      stock: 40,
      colors: ["Brown", "Black"],
      sizes: ["S", "M", "L", "XL"],
      tags: ["belt", "leather", "accessories"],
      isNewArrival: true,
      status: "PUBLISHED" as const,
      variants: [
        { color: "Brown", size: "M", sku: "ACC-BELT-001-BRN-M", quantity: 15, priceAdjustment: 0 },
        { color: "Black", size: "L", sku: "ACC-BELT-001-BLK-L", quantity: 15, priceAdjustment: 0 },
      ],
    },
    {
      name: "Wireless Bluetooth Earbuds",
      slug: "wireless-bluetooth-earbuds",
      sku: "ELEC-EARBUD-001",
      brand: "SoundPro",
      categorySlug: "electronics",
      description:
        "True wireless earbuds with active noise cancellation, 30-hour battery life via charging case, and IPX5 water resistance.",
      shortDescription: "Immersive sound, all-day battery.",
      price: 28000,
      salePrice: 24500,
      featuredImage: "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
      images: ["https://res.cloudinary.com/demo/image/upload/v1/sample.jpg"],
      stock: 3,
      lowStockThreshold: 5,
      colors: ["Black", "White"],
      tags: ["electronics", "audio", "wireless"],
      isTrending: true,
      isFeatured: true,
      status: "PUBLISHED" as const,
      variants: [
        { color: "Black", sku: "ELEC-EARBUD-001-BLK", quantity: 2, priceAdjustment: 0 },
        { color: "White", sku: "ELEC-EARBUD-001-WHT", quantity: 1, priceAdjustment: 0 },
      ],
    },
  ];

  for (const p of productsData) {
    const category = categories.find((c) => c.slug === p.categorySlug)!;
    const { categorySlug, variants, ...productFields } = p;

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        ...productFields,
        categoryId: category.id,
        variants: { create: variants },
      },
    });
    console.log(`✅ Product ready: ${product.name}`);
  }

  console.log("🌱 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
