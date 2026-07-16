import { prisma } from "@/lib/prisma";

export const metadata = { title: "FAQ" };

export default async function FaqPage() {
  const homepage = await prisma.homepageSettings.findFirst();
  const faqs = (homepage?.faqs as { question: string; answer: string }[] | null) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="mb-8 font-display text-4xl">Frequently asked questions</h1>

      {faqs.length === 0 ? (
        <p className="text-muted-foreground">No questions have been added yet.</p>
      ) : (
        <div className="space-y-4">
          {faqs.map((f, i) => (
            <details key={i} className="group rounded-xl border border-border bg-card p-5">
              <summary className="cursor-pointer list-none font-medium">
                {f.question}
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{f.answer}</p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
