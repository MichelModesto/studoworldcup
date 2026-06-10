"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";

/** Conta de 0 até `value` quando entra na viewport. */
export function Counter({
  value,
  duration = 1.4,
  className,
  suffix = "",
  prefix = "",
}: {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {Math.round(display).toLocaleString("pt-BR")}
      {suffix}
    </span>
  );
}
