"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/admin/image-uploader";
import { updateHomepageSettings } from "@/actions/settings";

interface FormValues {
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  heroCtaText: string;
  heroCtaLink: string;
  bannerImages: string[];
  showFeatured: boolean;
  showTrending: boolean;
  showNewArrival: boolean;
  faqs: { question: string; answer: string }[];
  testimonials: { name: string; rating: number; text: string }[];
}

export function HomepageSettingsForm({ defaultValues }: { defaultValues: FormValues }) {
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, control, watch, setValue } = useForm<FormValues>({
    defaultValues,
  });

  const faqArray = useFieldArray({ control, name: "faqs" });
  const testimonialArray = useFieldArray({ control, name: "testimonials" });
  const bannerImages = watch("bannerImages");
  const heroImage = watch("heroImage");

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const result = await updateHomepageSettings(values);
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error ?? "Failed to save settings.");
      return;
    }
    toast.success("Homepage settings saved.");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-medium">Hero section</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="heroTitle">Title</Label>
            <Input id="heroTitle" {...register("heroTitle")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="heroCtaText">Button text</Label>
            <Input id="heroCtaText" {...register("heroCtaText")} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="heroSubtitle">Subtitle</Label>
          <Textarea id="heroSubtitle" rows={2} {...register("heroSubtitle")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="heroCtaLink">Button link</Label>
          <Input id="heroCtaLink" {...register("heroCtaLink")} placeholder="/shop" />
        </div>
        <div className="space-y-1.5">
          <Label>Hero image</Label>
          <ImageUploader
            images={heroImage ? [heroImage] : []}
            onChange={(imgs) => setValue("heroImage", imgs[0] ?? "")}
            maxImages={1}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-medium">Banners</h2>
        <ImageUploader
          images={bannerImages}
          onChange={(imgs) => setValue("bannerImages", imgs)}
          maxImages={6}
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-medium">Section visibility</h2>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("showFeatured")} className="h-4 w-4 rounded border-input" />
            Featured products
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("showTrending")} className="h-4 w-4 rounded border-input" />
            Trending products
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("showNewArrival")} className="h-4 w-4 rounded border-input" />
            New arrivals
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">FAQs</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => faqArray.append({ question: "", answer: "" })}
          >
            <Plus className="h-4 w-4" /> Add FAQ
          </Button>
        </div>
        {faqArray.fields.map((field, i) => (
          <div key={field.id} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Input placeholder="Question" {...register(`faqs.${i}.question`)} />
              <Button type="button" variant="ghost" size="icon" onClick={() => faqArray.remove(i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <Textarea placeholder="Answer" rows={2} {...register(`faqs.${i}.answer`)} />
          </div>
        ))}
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Testimonials</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => testimonialArray.append({ name: "", rating: 5, text: "" })}
          >
            <Plus className="h-4 w-4" /> Add testimonial
          </Button>
        </div>
        {testimonialArray.fields.map((field, i) => (
          <div key={field.id} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Input placeholder="Customer name" {...register(`testimonials.${i}.name`)} />
              <Input
                type="number"
                min={1}
                max={5}
                className="w-20"
                placeholder="Rating"
                {...register(`testimonials.${i}.rating`, { valueAsNumber: true })}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => testimonialArray.remove(i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <Textarea placeholder="Testimonial text" rows={2} {...register(`testimonials.${i}.text`)} />
          </div>
        ))}
      </section>

      <Button type="submit" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Save settings
      </Button>
    </form>
  );
}
