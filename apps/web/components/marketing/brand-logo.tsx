import Image from "next/image";
import Link from "next/link";
import { BRAND_LOGO_FILES, BRAND_LOGO_INTRINSIC } from "@/lib/marketing/brand-assets";
import { cn } from "@/lib/utils";

type Props = {
  variant?: "default" | "onDark";
  className?: string;
  href?: string;
  priority?: boolean;
  layout?: "header" | "footer";
};

/** PNGs ship with solid black letterboxing; screen-blend on a light backdrop keys black to the page color. */
const knockoutShell =
  "isolate inline-flex rounded-md bg-background p-0.5 ring-1 ring-border/60 dark:bg-zinc-950 dark:ring-white/10";
const knockoutImg = "mix-blend-screen dark:mix-blend-normal";

export function BrandLogo({ variant = "default", className, href = "/", priority, layout = "header" }: Props) {
  const stacked = BRAND_LOGO_FILES.stacked;
  const horizontal = BRAND_LOGO_FILES.horizontal;
  const icon = BRAND_LOGO_FILES.icon;
  const ih = BRAND_LOGO_INTRINSIC.horizontal;
  const ii = BRAND_LOGO_INTRINSIC.icon;
  const is = BRAND_LOGO_INTRINSIC.stacked;

  const inner =
    layout === "footer" ? (
      <Image
        src={stacked}
        alt="Hestia Real Estate Development"
        width={is.width}
        height={is.height}
        priority={priority}
        className={cn(
          knockoutImg,
          "h-auto w-full max-w-[9.5rem] object-contain object-left sm:max-w-[11rem] md:max-w-[12rem]",
          className
        )}
        sizes="(max-width: 640px) 152px, (max-width: 1024px) 176px, 192px"
      />
    ) : (
      <>
        <span className={cn(knockoutShell, "sm:hidden")}>
          <Image
            src={icon}
            alt=""
            width={ii.width}
            height={ii.height}
            priority={priority}
            className={cn(knockoutImg, "h-11 w-11 shrink-0 object-contain")}
            sizes="44px"
            aria-hidden
          />
        </span>
        <span className={cn(knockoutShell, "hidden sm:inline-flex", "max-w-full")}>
          <Image
            src={horizontal}
            alt=""
            width={ih.width}
            height={ih.height}
            priority={priority}
            className={cn(
              knockoutImg,
              "h-auto w-full max-w-[11rem] object-contain object-left sm:max-w-[13rem] md:max-w-[14.5rem] lg:max-w-[16rem]",
              className
            )}
            sizes="(max-width: 640px) 176px, (max-width: 1024px) 208px, 256px"
            aria-hidden
          />
        </span>
      </>
    );

  const wrapped =
    variant === "onDark" && layout === "footer" ? (
      <span className="isolate inline-flex w-full max-w-full rounded-lg border border-white/10 bg-white p-2 shadow-sm ring-1 ring-black/5 sm:inline-block sm:w-fit sm:p-2.5">
        {inner}
      </span>
    ) : layout === "header" ? (
      <span className="inline-flex items-center gap-3">{inner}</span>
    ) : (
      inner
    );

  const wrapClass =
    "block w-full max-w-full leading-none no-underline sm:inline-flex sm:w-auto sm:max-w-none sm:shrink-0";

  if (href) {
    return (
      <Link
        href={href}
        className={wrapClass}
        aria-label={layout === "header" ? "Hestia Real Estate Development" : undefined}
      >
        {wrapped}
      </Link>
    );
  }

  return <span className={cn("block w-full sm:inline-flex sm:w-auto", "leading-none")}>{wrapped}</span>;
}
