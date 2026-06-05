import { useId } from "react"
import { cn } from "@/lib/utils"

type PoolShapeFigureProps = {
  usedPercent: number
  title: string
  className?: string
}

const poolPath =
  "M52 61C68 22 128 18 161 46C185 66 204 62 232 72C274 87 292 131 270 166C249 201 202 196 170 184C138 172 116 197 78 186C38 175 20 137 39 105C48 90 44 80 52 61Z"
const waterPathA =
  "M57 64C73 30 126 26 158 52C183 72 202 66 230 77C268 92 285 130 264 161C244 190 201 188 171 177C140 166 118 190 82 181C45 171 29 137 46 108C55 93 49 81 57 64Z"
const waterPathB =
  "M56 66C75 32 124 24 157 51C181 70 205 68 231 79C266 94 283 129 265 160C246 190 204 186 172 176C139 165 119 188 83 180C47 171 30 136 47 109C56 94 48 82 56 66Z"
const waterPathC =
  "M58 63C76 31 128 28 160 53C184 72 203 65 229 76C267 91 286 131 263 162C243 189 202 187 170 178C141 169 117 191 81 181C46 172 28 138 45 107C54 91 50 80 58 63Z"
const waterCenter = { x: 156, y: 116 }

export function PoolShapeFigure({
  usedPercent,
  title,
  className,
}: PoolShapeFigureProps) {
  const id = useId().replace(/:/g, "")
  const used = clamp(usedPercent, 0, 100)
  const fullPercent = 100 - used
  const waterScale = fullPercent > 0 ? Math.sqrt(fullPercent / 100) * 1.08 : 0.01
  const waterTransform = `translate(${waterCenter.x} ${waterCenter.y}) scale(${waterScale.toFixed(3)}) translate(${-waterCenter.x} ${-waterCenter.y})`
  const fullLabel = `${Math.round(fullPercent)} percent full`

  return (
    <figure
      className={cn(
        "m-0 grid aspect-[338/224] w-full min-h-0 min-w-0 place-items-center overflow-visible",
        className
      )}
    >
      <svg
        role="img"
        aria-label={`${title}: ${fullLabel}`}
        className="block h-full max-h-full w-full max-w-full overflow-visible"
        viewBox="-14 -4 338 224"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <clipPath id={`${id}-pool-clip`}>
            <path d={poolPath} />
          </clipPath>
          <radialGradient id={`${id}-water`} cx="50%" cy="50%" r="64%">
            <stop offset="0%" stopColor="#086174" stopOpacity="0.96" />
            <stop offset="56%" stopColor="#22b8ca" stopOpacity="0.78" />
            <stop offset="100%" stopColor="#b9ead1" stopOpacity="0.42" />
          </radialGradient>
          <linearGradient id={`${id}-floor`} x1="68" y1="36" x2="232" y2="194" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#060f0c" />
            <stop offset="55%" stopColor="#06120e" />
            <stop offset="100%" stopColor="#3f5947" />
          </linearGradient>
          <clipPath id={`${id}-water-clip`}>
            <path d={waterPathA} transform={waterTransform}>
              <animate
                attributeName="d"
                dur="8s"
                repeatCount="indefinite"
                values={`${waterPathA};${waterPathB};${waterPathC};${waterPathA}`}
              />
            </path>
          </clipPath>
          <filter id={`${id}-soft-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#06100c" floodOpacity="0.3" />
          </filter>
        </defs>

        <path
          d={poolPath}
          fill={`url(#${id}-floor)`}
          opacity="0.86"
          stroke="#b6c6ae"
          strokeWidth="3"
          strokeLinejoin="round"
          filter={`url(#${id}-soft-shadow)`}
        />
        <g clipPath={`url(#${id}-pool-clip)`}>
          <path
            data-testid="cursor-pool-water-shape"
            d={waterPathA}
            transform={waterTransform}
            fill={`url(#${id}-water)`}
            opacity={fullPercent > 0 ? 1 : 0}
            className="transition-all duration-500 ease-out"
          >
            <animate
              attributeName="d"
              dur="8s"
              repeatCount="indefinite"
              values={`${waterPathA};${waterPathB};${waterPathC};${waterPathA}`}
            />
          </path>
          <g clipPath={`url(#${id}-water-clip)`}>
            <path
              d="M38 104C76 84 112 91 151 110C190 129 226 126 277 106M29 135C76 117 121 121 162 139C201 156 241 157 286 139M47 166C87 150 119 154 159 170C200 186 238 183 270 166"
              fill="none"
              stroke="#eafcff"
              strokeLinecap="round"
              strokeWidth="2.5"
              opacity={fullPercent > 8 ? 0.16 : 0}
            />
            <g
              data-testid="cursor-pool-water-floaters"
              fill="none"
              stroke="#f4fffb"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={fullPercent > 8 ? 0.26 : 0}
            >
              <path d="M78 91C88 86 99 87 108 92" strokeWidth="1.5" />
              <path d="M121 73C131 69 142 70 151 76" strokeWidth="1.35" opacity="0.72" />
              <path d="M187 91C198 86 211 88 221 94" strokeWidth="1.45" opacity="0.76" />
              <path d="M222 124C232 119 243 120 252 126" strokeWidth="1.35" opacity="0.68" />
              <path d="M75 147C88 142 101 143 112 150" strokeWidth="1.45" opacity="0.72" />
              <path d="M138 158C150 153 162 154 173 161" strokeWidth="1.35" opacity="0.66" />
              <path d="M198 154C211 149 225 151 235 158" strokeWidth="1.4" opacity="0.72" />
              <path d="M103 118C111 114 121 115 129 120" strokeWidth="1.2" opacity="0.58" />
              <path d="M161 130C171 126 182 127 190 133" strokeWidth="1.2" opacity="0.6" />
              <path d="M239 99C247 96 257 97 264 102" strokeWidth="1.15" opacity="0.55" />
              <animateTransform
                attributeName="transform"
                type="translate"
                dur="7s"
                repeatCount="indefinite"
                values="0 0; 2 -1; -1 1; 0 0"
              />
            </g>
          </g>
        </g>
      </svg>
    </figure>
  )
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}
