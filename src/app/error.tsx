"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="h-14 w-14 text-destructive" />
      <h1 className="font-display text-4xl">Something went wrong</h1>
      <p className="max-w-sm text-muted-foreground">
        We hit an unexpected error. Please try again — if this keeps
        happening, let us know.
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
