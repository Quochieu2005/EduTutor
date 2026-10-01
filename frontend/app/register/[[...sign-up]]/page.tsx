import { ApiCombinedSignUp } from "@/components/auth/ApiCombinedSignUp";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ redirect_url?: string }> }) {
  const { redirect_url } = await searchParams;
  const returnTo = redirect_url?.startsWith("/") ? redirect_url : "/Home";
  return <ApiCombinedSignUp returnTo={returnTo} />;
}
