"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleUserActive } from "@/actions/user";

export function UserActiveToggle({
  userId,
  isActive,
  isSelf,
}: {
  userId: string;
  isActive: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    if (isSelf && isActive) {
      toast.error("You cannot deactivate your own account.");
      return;
    }
    startTransition(async () => {
      const result = await toggleUserActive(userId, !isActive);
      if (!result.success) {
        toast.error(result.error ?? "Failed to update user.");
        return;
      }
      toast.success(isActive ? "User deactivated." : "User activated.");
      router.refresh();
    });
  }

  return (
    <Button
      variant={isActive ? "outline" : "secondary"}
      size="sm"
      onClick={handleToggle}
      disabled={isPending || (isSelf && isActive)}
    >
      {isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}
