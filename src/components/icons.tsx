export function ElectorIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M10 30H90V80C90 85.5228 85.5228 90 80 90H20C14.4772 90 10 85.5228 10 80V30Z" className="fill-primary" />
      <path d="M10 30H90" className="stroke-primary/80" strokeWidth="4" />
      <rect x="10" y="20" width="80" height="10" rx="2" className="fill-primary" />
      <path d="M35 55L48.5 68.5L70 45" stroke="hsl(var(--primary-foreground))" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="45" y="10" width="10" height="20" className="fill-primary/50" />
    </svg>
  );
}
