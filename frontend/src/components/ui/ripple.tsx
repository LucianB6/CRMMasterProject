import React, { type ComponentPropsWithoutRef, type CSSProperties } from "react"

import { cn } from "@/lib/utils"

interface RippleProps extends ComponentPropsWithoutRef<"div"> {
  mainCircleSize?: number
  mainCircleOpacity?: number
  numCircles?: number
  centerTop?: string
  animated?: boolean
}

export const Ripple = React.memo(function Ripple({
  mainCircleSize = 210,
  mainCircleOpacity = 0.24,
  numCircles = 8,
  centerTop = "30%",
  animated = true,
  className,
  ...props
}: RippleProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 select-none",
        className
      )}
      {...props}
    >
      <div
        className="absolute left-1/2 top-[30%] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          top: centerTop,
          background: "radial-gradient(circle, rgba(56,189,248,0.24) 0%, rgba(56,189,248,0.08) 45%, rgba(56,189,248,0) 75%)",
        }}
      />
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * 70
        const opacity = Math.max(0.12, mainCircleOpacity - i * 0.03)
        const animationDelay = `${i * 0.4}s`

        return (
          <div
            key={i}
            className="absolute rounded-full border border-sky-500/50 bg-sky-300/5 motion-reduce:animate-none"
            style={
              {
                width: `${size}px`,
                height: `${size}px`,
                opacity,
                animationDelay,
                animationName: animated ? "ripplePulse" : "none",
                animationDuration: animated ? "10s" : undefined,
                animationTimingFunction: animated ? "ease-in-out" : undefined,
                animationIterationCount: animated ? "infinite" : undefined,
                top: centerTop,
                left: "50%",
                transform: "translate(-50%, -50%) scale(1)",
              } as CSSProperties
            }
          />
        )
      })}
    </div>
  )
})

Ripple.displayName = "Ripple"
