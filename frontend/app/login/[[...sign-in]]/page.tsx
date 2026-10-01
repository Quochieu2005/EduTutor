import { ClerkCombinedSignIn } from "@/components/auth/ClerkCombinedSignIn";

function safeReturnTo(returnTo?: string): string | undefined {
  return returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : undefined;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  const destination = safeReturnTo(returnTo) ?? "/Home";
  return <ClerkCombinedSignIn returnTo={destination} />;
}
