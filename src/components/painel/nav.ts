import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  type LucideIcon,
  MapPin,
  Target,
  Trophy,
  Users,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/painel", label: "Visão geral", icon: LayoutDashboard },
  { href: "/painel/selecoes", label: "Seleções", icon: Users },
  { href: "/painel/jogos", label: "Jogos", icon: CalendarDays },
  { href: "/painel/grupos", label: "Grupos", icon: Trophy },
  { href: "/painel/artilheiros", label: "Artilheiros", icon: Target },
  { href: "/painel/estatisticas", label: "Estatísticas", icon: BarChart3 },
  { href: "/painel/sedes", label: "Sedes", icon: MapPin },
];
