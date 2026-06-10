import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  CornerUpRight,
  Crosshair,
  Flag,
  Goal,
  Handshake,
  type LucideIcon,
  Medal,
  RectangleVertical,
  ShieldCheck,
  Swords,
  Target,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  target: Target,
  crosshair: Crosshair,
  corner: CornerUpRight,
  card: RectangleVertical,
  "card-red": RectangleVertical,
  flag: Flag,
  tackle: ShieldCheck,
  foul: AlertTriangle,
  goalkick: Goal,
  scorer: Medal,
  assist: Handshake,
  clock: Clock,
  chart: BarChart3,
  swords: Swords,
};

export function DossieIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? Activity;
  return <Icon className={className} />;
}
