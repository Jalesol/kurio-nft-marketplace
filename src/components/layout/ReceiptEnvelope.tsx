import type { ComponentProps } from 'react'

export default function ReceiptEnvelope(props: ComponentProps<'svg'>) {
  return (
    <svg
      {...props}
      viewBox="0 0 72 80"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m8 36 7-6m42 0 7 6M28 14l5-5a4 4 0 0 1 6 0l5 5" />
        <path d="M15 44V17a3 3 0 0 1 3-3h36a3 3 0 0 1 3 3v27" />
        <path d="M8 36v35a3 3 0 0 0 3 3h50a3 3 0 0 0 3-3V36L44 54M8 36l20 18" />
        <path d="m9 71 23-23a6 6 0 0 1 8 0l23 23" />
      </g>

      <text
        x="36"
        y="28"
        fill="currentColor"
        fontFamily="monospace"
        fontSize="9"
        fontWeight="700"
        textAnchor="middle"
      >
        <tspan x="36">THANK</tspan>
        <tspan x="36" dy="10">YOU</tspan>
      </text>

      <path
        fill="currentColor"
        d="M36 46l-3.3-3.1a2 2 0 0 1 2.8-2.8l.5.5.5-.5a2 2 0 0 1 2.8 2.8z"
      />
    </svg>
  )
}