"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SingleImageUploader } from "@/components/admin/single-image-uploader";
import { updateBusinessSettings } from "@/actions/settings";

interface BusinessSettingsFormProps {
  defaultValues: {
    businessName: string;
    logo: string | null;
    favicon: string | null;
    whatsappNumber: string;
    businessEmail: string | null;
    businessPhone: string | null;
    address: string | null;
    facebookUrl: string | null;
    instagramUrl: string | null;
    twitterUrl: string | null;
    tiktokUrl: string | null;
    currency: string;
    currencySymbol: string;
    timezone: string;
    primaryColor: string;
    secondaryColor: string;
  };
}

export function BusinessSettingsForm({ defaultValues }: BusinessSettingsFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const { register, control, handleSubmit } = useForm({ defaultValues });

  async function onSubmit(values: typeof defaultValues) {
    setSubmitting(true);
    const result = await updateBusinessSettings(values);
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error ?? "Failed to save settings.");
      return;
    }
    toast.success("Business settings saved.");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-medium">General</h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Logo</Label>
            <Controller
              name="logo"
              control={control}
              render={({ field }) => (
                <SingleImageUploader
                  label="Logo"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              Shown in the site header and footer. A wide, transparent PNG works best.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Favicon</Label>
            <Controller
              name="favicon"
              control={control}
              render={({ field }) => (
                <SingleImageUploader
                  label="Favicon"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              Shown in the browser tab. A square image works best.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="businessName">Business name</Label>
            <Input id="businessName" {...register("businessName")} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="whatsappNumber">WhatsApp number</Label>
            <Input id="whatsappNumber" {...register("whatsappNumber")} placeholder="2348012345678" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="businessEmail">Business email</Label>
            <Input id="businessEmail" type="email" {...register("businessEmail")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="businessPhone">Business phone</Label>
            <Input id="businessPhone" {...register("businessPhone")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register("address")} />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-medium">Social links</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="facebookUrl">Facebook</Label>
            <Input id="facebookUrl" {...register("facebookUrl")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="instagramUrl">Instagram</Label>
            <Input id="instagramUrl" {...register("instagramUrl")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="twitterUrl">Twitter / X</Label>
            <Input id="twitterUrl" {...register("twitterUrl")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tiktokUrl">TikTok</Label>
            <Input id="tiktokUrl" {...register("tiktokUrl")} />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-medium">Regional & theme</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency code</Label>
            <Input id="currency" {...register("currency")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currencySymbol">Currency symbol</Label>
            <Input id="currencySymbol" {...register("currencySymbol")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timezone">Timezone</Label>
            <Input id="timezone" {...register("timezone")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="primaryColor">Primary color</Label>
            <Input id="primaryColor" type="color" {...register("primaryColor")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="secondaryColor">Secondary color</Label>
            <Input id="secondaryColor" type="color" {...register("secondaryColor")} />
          </div>
        </div>
      </section>

      <Button type="submit" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Save settings
      </Button>
    </form>
  );
}
