import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import DeploymentsClient from "./deployments-client";

export default async function DeploymentsPage() {
  const session = await getAuthSession();
  
  if (!session?.user?.email) {
    redirect("/login");
  }
  
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, plan: true },
  });
  
  if (!user) {
    redirect("/login");
  }
  
  const deployments = await prisma.deployment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      projectName: true,
      url: true,
      customDomain: true,
      status: true,
      createdAt: true,
      chatId: true,
    },
  });
  
  return <DeploymentsClient deployments={deployments} />;
}
