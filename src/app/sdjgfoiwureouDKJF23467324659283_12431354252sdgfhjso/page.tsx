import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SecretPricingClient } from "./secret-pricing-client";

export default async function SecretPage() {
  const session = await getAuthSession();

  if (!session?.user?.email) {
    return redirect("/login");
  }

  return <SecretPricingClient />;
}
