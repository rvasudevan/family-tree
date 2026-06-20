const NAMAM_ASPECT = 209 / 300
export const THENKALAI_NAMAM_HEIGHT = 26
export const THENKALAI_NAMAM_WIDTH = THENKALAI_NAMAM_HEIGHT * NAMAM_ASPECT

/** Thenkalai namam image between Krishnamachari and Kanakavalli. */
export function ThenkalaiNamamMark({
  width = THENKALAI_NAMAM_WIDTH,
  height = THENKALAI_NAMAM_HEIGHT,
}: {
  width?: number
  height?: number
}) {
  return (
    <image
      href="/symbols/thenkalai-namam.png"
      x={-width / 2}
      y={-height / 2}
      width={width}
      height={height}
      className="thenkalai-namam-mark"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    />
  )
}
