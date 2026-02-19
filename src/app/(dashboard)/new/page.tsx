import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import ChatInterface from "@/components/chat-interface";
import prisma from "@/lib/db";

export default async function NewChatPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getAuthSession();
  const params = await searchParams;

  if (!session?.user?.email) {
    const redirectUrl = params.q 
      ? `/login?callbackUrl=${encodeURIComponent(`/new?q=${params.q}`)}`
      : "/login";
    return redirect(redirectUrl);
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) return redirect("/login");

  return (
    <ChatInterface 
      key="new-chat"
      initialInput={params.q} 
      userData={{
        email: user.email,
        plan: user.plan,
        role: user.role,
      }}
    />
  );
}
