import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { SidebarClient } from "./sidebar-client";

export const dynamic = "force-dynamic";

export async function Sidebar() {
  const session = await getAuthSession();
  
  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      chats: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) return null;

  return <SidebarClient user={user} />;
}
