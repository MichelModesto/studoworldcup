import { Trophy } from "lucide-react";
import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 group">
      <span className="grid place-items-center h-9 w-9 rounded-xl btn-brand shadow-lg shadow-brand/20">
        <Trophy className="h-5 w-5" strokeWidth={2.4} />
      </span>
      <span className="font-semibold text-lg tracking-tight">
        Studo<span className="text-gradient">WorldCup</span>
      </span>
    </Link>
  );
}
