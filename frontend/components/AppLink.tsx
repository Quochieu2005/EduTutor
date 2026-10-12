import NextLink from "next/link";
import type { ComponentProps } from "react";

type AppLinkProps = ComponentProps<typeof NextLink>;

/**
 * Navigation link for the public site.
 *
 * Route data is loaded when a visitor chooses a destination instead of
 * preloading every visible card and navigation item in the background.
 */
export default function AppLink({ prefetch = false, ...props }: AppLinkProps) {
  return <NextLink {...props} prefetch={prefetch} />;
}
