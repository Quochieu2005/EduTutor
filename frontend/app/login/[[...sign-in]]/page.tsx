import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { ClerkMissingNotice } from "@/components/ClerkMissingNotice";
import { isClerkConfigured } from "@/lib/clerk-config";

function getSafeReturnTo(returnTo?: string): string | undefined {
  if (!returnTo) return undefined;
  // Ensure the returnTo path is an internal relative path to prevent open redirects
  if (returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("://")) {
    return returnTo;
  }
  return undefined;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  if (!isClerkConfigured) return <ClerkMissingNotice />;
  const { returnTo } = await searchParams;
  const safeReturnTo = getSafeReturnTo(returnTo);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <SignIn
          routing="path"
          path="/login"
          signUpUrl="/register"
          fallbackRedirectUrl="/Home"
          forceRedirectUrl={safeReturnTo}
          appearance={{
            elements: {
              rootBox: "w-full mx-auto",
              card: "shadow-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8",
              headerTitle: "text-2xl font-bold text-slate-900 tracking-tight",
              headerSubtitle: "text-sm text-slate-600 mt-1",
              formButtonPrimary:
                "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl text-sm py-3 transition-colors shadow-sm shadow-blue-600/20",
              socialButtonsBlockButton:
                "border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-medium py-2.5 transition-colors",
              formFieldInput:
                "rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all",
              footerActionLink: "text-blue-600 hover:text-blue-700 font-semibold transition-colors",
              identityPreviewText: "text-slate-800 font-semibold",
              identityPreviewEditButton: "text-blue-600 hover:text-blue-700",
            },
          }}
        />
        <Link href="/forgot-password" className="mt-4 block text-center text-sm font-semibold text-blue-600 hover:text-blue-700">
          Quên mật khẩu tài khoản EduTutor?
        </Link>
      </div>
    </main>
  );
}
