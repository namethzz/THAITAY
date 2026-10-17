import React from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Inline Button Component (scoped to this template's dark surface)
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "gradient";
  size?: "default" | "sm" | "lg";
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "default", className = "", children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9c3a0] focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950 disabled:pointer-events-none disabled:opacity-50";

    const variants = {
      default: "bg-[#f6efe3] text-stone-950 hover:bg-white",
      secondary: "bg-stone-800 text-white hover:bg-stone-700",
      ghost: "hover:bg-stone-800/60 text-white",
      gradient: "bg-gradient-to-b from-[#fffaf2] via-[#f6efe3]/95 to-[#d9c3a0]/80 text-stone-950 motion-safe:hover:scale-105 motion-safe:active:scale-95",
    };

    const sizes = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-10 px-5 text-sm",
      lg: "h-12 px-8 text-base",
    };

    return (
      <button ref={ref} className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export interface SaaSNavLink {
  label: string;
  href: string;
}

export interface SaaSAction {
  label: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}

export interface SaaSTemplateProps {
  brand?: React.ReactNode;
  brandHref?: string;
  navLinks?: SaaSNavLink[];
  secondaryAction?: SaaSAction;
  primaryAction?: SaaSAction;
  announcement?: { text: React.ReactNode; linkLabel: string; href: string };
  title?: React.ReactNode;
  description?: React.ReactNode;
  cta?: SaaSAction;
  previewImage?: { src: string; alt: string; width?: number; height?: number };
  /** Rendered below the hero (extra sections, footer, ...). */
  children?: React.ReactNode;
}

const defaultNavLinks: SaaSNavLink[] = [
  { label: "Getting started", href: "#getting-started" },
  { label: "Components", href: "#components" },
  { label: "Documentation", href: "#documentation" },
];

// Navigation Component
const Navigation = React.memo(({ brand = "Logo", brandHref = "#", navLinks = defaultNavLinks, secondaryAction = { label: "Sign in" }, primaryAction = { label: "Sign Up" } }: Pick<SaaSTemplateProps, "brand" | "brandHref" | "navLinks" | "secondaryAction" | "primaryAction">) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

  const runAction = (action: SaaSAction) => { setMobileMenuOpen(false); action.onClick?.(); };

  return (
    <header className="fixed top-0 w-full z-50 border-b border-stone-800/60 bg-stone-950/80 backdrop-blur-md">
      <nav className="max-w-7xl mx-auto px-6 py-4" aria-label="เมนูหลัก">
        {/* Flex (not absolute centering) so longer Thai labels never overlap the actions. */}
        <div className="flex items-center justify-between gap-6">
          <a href={brandHref} className="shrink-0 text-xl font-semibold text-white">{brand}</a>

          <div className="hidden lg:flex flex-1 items-center justify-center gap-8">
            {navLinks.map(link => (
              <a key={link.href} href={link.href} className="text-sm text-white/60 hover:text-white transition-colors">
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden lg:flex shrink-0 items-center gap-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => runAction(secondaryAction)} aria-label={secondaryAction.ariaLabel}>
              {secondaryAction.label}
            </Button>
            <Button type="button" variant="default" size="sm" onClick={() => runAction(primaryAction)} aria-label={primaryAction.ariaLabel}>
              {primaryAction.label}
            </Button>
          </div>

          <button
            type="button"
            className="lg:hidden grid size-10 place-items-center rounded-md text-white hover:bg-stone-800/60"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "ปิดเมนู" : "เปิดเมนู"}
            aria-expanded={mobileMenuOpen}
            aria-controls="saas-mobile-menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div id="saas-mobile-menu" className="lg:hidden bg-stone-950/95 backdrop-blur-md border-t border-stone-800/60 animate-in fade-in slide-in-from-top-2 duration-300 motion-reduce:animate-none">
          <div className="px-6 py-4 flex flex-col gap-2">
            {navLinks.map(link => (
              <a key={link.href} href={link.href} className="text-sm text-white/70 hover:text-white transition-colors py-2.5" onClick={() => setMobileMenuOpen(false)}>
                {link.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-stone-800/60">
              <Button type="button" variant="ghost" size="sm" onClick={() => runAction(secondaryAction)} aria-label={secondaryAction.ariaLabel}>
                {secondaryAction.label}
              </Button>
              <Button type="button" variant="default" size="sm" onClick={() => runAction(primaryAction)} aria-label={primaryAction.ariaLabel}>
                {primaryAction.label}
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
});

Navigation.displayName = "Navigation";

// Hero Component
const Hero = React.memo(({
  announcement = { text: "New version of template is out!", linkLabel: "Read more", href: "#new-version" },
  title = <>Give your big idea <br />the website it deserves</>,
  description = <>Landing page kit template with React, Shadcn/ui and Tailwind <br className="hidden md:block" />that you can copy/paste into your project.</>,
  cta = { label: "Get started" },
  previewImage = { src: `${import.meta.env.BASE_URL}images/construction-architecture.jpg`, alt: "Preview image" },
}: Pick<SaaSTemplateProps, "announcement" | "title" | "description" | "cta" | "previewImage">) => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-start px-6 pt-28 pb-12 md:pt-32 animate-in fade-in slide-in-from-bottom-2 duration-700 motion-reduce:animate-none">
      <aside className="mb-8 inline-flex flex-wrap items-center justify-center gap-2 px-4 py-2 rounded-full border border-stone-700 bg-stone-800/50 backdrop-blur-sm max-w-full">
        <span className="text-xs text-center text-stone-400">{announcement.text}</span>
        <a href={announcement.href} className="flex items-center gap-1 text-xs text-[#d9c3a0] hover:text-white transition-all active:scale-95 whitespace-nowrap">
          {announcement.linkLabel}
          <ArrowRight size={12} aria-hidden="true" />
        </a>
      </aside>

      {/* Generous line-height + padding: background-clip:text only paints inside the line box,
          so tight leading would clip Thai upper/lower vowel marks. */}
      <h1
        className="text-4xl md:text-5xl lg:text-6xl font-medium text-center max-w-4xl px-2 py-1 leading-[1.3] tracking-[-0.02em] mb-6 text-balance"
        style={{
          background: "linear-gradient(to bottom, #ffffff, #fffaf2 45%, rgba(217, 195, 160, 0.75))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {title}
      </h1>

      <p className="text-sm md:text-base leading-relaxed text-center max-w-2xl px-2 mb-10 text-stone-400">{description}</p>

      <div className="flex items-center gap-4 relative z-10 mb-16">
        <Button type="button" variant="gradient" size="lg" className="rounded-lg" onClick={cta.onClick} aria-label={cta.ariaLabel}>
          {cta.label}
        </Button>
      </div>

      <div className="w-full max-w-5xl relative">
        {/* Glow replaces the remote decorative image from the original template. */}
        <div
          className="absolute left-1/2 -top-24 h-72 w-[90%] -translate-x-1/2 rounded-full pointer-events-none z-0 blur-3xl bg-[radial-gradient(ellipse_at_center,rgba(217,195,160,0.35),rgba(165,112,63,0.18)_45%,transparent_72%)]"
          aria-hidden="true"
        />
        <div className="relative z-10 rounded-xl border border-white/10 bg-white/5 p-1.5 md:p-2 shadow-2xl shadow-black/60">
          <img
            src={previewImage.src}
            alt={previewImage.alt}
            width={previewImage.width}
            height={previewImage.height}
            className="w-full h-auto rounded-lg"
            loading="eager"
          />
        </div>
      </div>
    </section>
  );
});

Hero.displayName = "Hero";

// Main Component
export default function Component({ children, ...props }: SaaSTemplateProps) {
  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <Navigation brand={props.brand} brandHref={props.brandHref} navLinks={props.navLinks} secondaryAction={props.secondaryAction} primaryAction={props.primaryAction} />
      <Hero announcement={props.announcement} title={props.title} description={props.description} cta={props.cta} previewImage={props.previewImage} />
      {children}
    </main>
  );
}

export { Navigation, Hero };
