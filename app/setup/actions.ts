"use server";

import { redirect } from "next/navigation";
import { resendBootstrapActivation } from "@/lib/bootstrap";
import { setupTokenMatches } from "@/lib/env";

export async function resendSetupLink(formData: FormData) {
  const token = String(formData.get("setupToken") || "");
  if (!setupTokenMatches(token)) redirect("/login");
  const result = await resendBootstrapActivation();
  redirect(`/setup?token=${encodeURIComponent(token)}&sent=${result.sent ? "1" : "0"}&message=${encodeURIComponent(result.message)}`);
}
