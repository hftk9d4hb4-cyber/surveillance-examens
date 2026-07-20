"use server";

import { redirect } from "next/navigation";
import { resendBootstrapActivation } from "@/lib/bootstrap";

export async function resendSetupLink() {
  const result = await resendBootstrapActivation();
  redirect(`/setup?sent=${result.sent ? "1" : "0"}&message=${encodeURIComponent(result.message)}`);
}
