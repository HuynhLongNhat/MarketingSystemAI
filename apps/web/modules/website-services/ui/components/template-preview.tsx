import type { WebsiteProject, WebsiteTemplate } from "@/lib/website-services-api";

type PreviewProps = {
  templateId: WebsiteTemplate["id"];
  project?: Pick<WebsiteProject, "name" | "description">;
  compact?: boolean;
};

const copy = {
  "business-corporate": { eyebrow: "BUSINESS SOLUTIONS", title: "Build trust. Move business forward.", body: "A clear, dependable online presence for your company.", action: "Talk to our team" },
  "real-estate-landing": { eyebrow: "PREMIUM PROPERTY", title: "Find a place that feels like home.", body: "Thoughtful spaces in exceptional locations.", action: "Explore projects" },
  "digital-agency-landing": { eyebrow: "DIGITAL GROWTH", title: "Make every digital moment count.", body: "Strategy, design and growth services for ambitious brands.", action: "Start a project" },
} as const;

export function TemplatePreview({ templateId, project, compact = false }: PreviewProps) {
  const content = copy[templateId];
  const title = project?.name || content.title;
  const description = project?.description || content.body;
  const palette = templateId === "real-estate-landing"
    ? "from-amber-100 via-orange-50 to-white text-stone-900"
    : templateId === "digital-agency-landing"
      ? "from-indigo-950 via-violet-900 to-fuchsia-700 text-white"
      : "from-slate-950 via-slate-800 to-cyan-900 text-white";

  return (
    <article className={`overflow-hidden rounded-xl bg-gradient-to-br ${palette} ${compact ? "min-h-52 p-5" : "min-h-[440px] p-7 sm:p-12"}`}>
      <nav className="flex items-center justify-between text-[10px] font-semibold tracking-[0.16em] opacity-80"><span>{templateId === "digital-agency-landing" ? "ORBIT" : templateId === "real-estate-landing" ? "NEST" : "NORTHSTAR"}</span><span>MENU</span></nav>
      <div className={compact ? "mt-12 max-w-[85%]" : "mt-24 max-w-2xl"}>
        <p className="text-[10px] font-bold tracking-[0.18em] opacity-75">{content.eyebrow}</p>
        <h2 className={`${compact ? "mt-3 text-2xl" : "mt-5 text-4xl sm:text-6xl"} font-semibold leading-[0.96] tracking-tight`}>{title}</h2>
        <p className={`${compact ? "mt-3 text-xs" : "mt-6 text-base sm:text-lg"} max-w-lg opacity-80`}>{description}</p>
        <span className={`${compact ? "mt-5 px-3 py-2 text-[10px]" : "mt-8 px-5 py-3 text-sm"} inline-flex rounded-full bg-white font-semibold text-slate-900`}>{content.action}</span>
      </div>
      {!compact && <div className="mt-16 grid grid-cols-3 gap-3 border-t border-current/15 pt-5 text-xs opacity-70"><span>Strategy</span><span>Creative</span><span>Growth</span></div>}
    </article>
  );
}
