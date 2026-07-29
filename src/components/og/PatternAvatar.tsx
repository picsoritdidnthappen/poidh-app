// boring-avatars' "bauhaus" palette/variant (https://boringavatars.com), the
// component itself can't be used here because every variant calls
// React.useId() internally and satori (the renderer behind ImageResponse)
// has no hooks dispatcher, so this reproduces its geometry as plain SVG.
const AVATAR_PALETTE = ['#0d0202', '#ffffff', '#ffd447', '#f15e5f', '#2a81d5'];

const BAUHAUS_SIZE = 80;
const BAUHAUS_PIECES = 4;

function hashSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function digitAt(value: number, position: number) {
  return Math.floor(value / Math.pow(10, position)) % 10;
}

function isEvenDigit(value: number, position: number) {
  return digitAt(value, position) % 2 === 0;
}

function signedOffset(value: number, range: number, digitPosition?: number) {
  const magnitude = value % range;
  return digitPosition !== undefined && isEvenDigit(value, digitPosition)
    ? -magnitude
    : magnitude;
}

function pickColor(value: number, index: number) {
  return AVATAR_PALETTE[(value + index) % AVATAR_PALETTE.length];
}

function generateBauhausPieces(seed: string) {
  const hash = hashSeed(seed);
  const isSquare = digitAt(hash, 2) % 2 === 0;

  return Array.from({ length: BAUHAUS_PIECES }, (_, t) => ({
    color: pickColor(hash, t),
    translateX: signedOffset(hash * (t + 1), BAUHAUS_SIZE / 2 - (t + 17), 1),
    translateY: signedOffset(hash * (t + 1), BAUHAUS_SIZE / 2 - (t + 17), 2),
    rotate: signedOffset(hash * (t + 1), 360),
    isSquare,
  }));
}

export default function PatternAvatar({
  seed,
  size,
  marginRight,
}: {
  seed: string;
  size: number;
  marginRight: string;
}) {
  const pieces = generateBauhausPieces(seed);
  const center = BAUHAUS_SIZE / 2;

  return (
    <div
      style={{
        width: size,
        height: size,
        marginRight,
        flexShrink: 0,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'flex',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${BAUHAUS_SIZE} ${BAUHAUS_SIZE}`}
      >
        <rect
          width={BAUHAUS_SIZE}
          height={BAUHAUS_SIZE}
          fill={pieces[0].color}
        />
        <rect
          x={(BAUHAUS_SIZE - 60) / 2}
          y={(BAUHAUS_SIZE - 20) / 2}
          width={BAUHAUS_SIZE}
          height={pieces[1].isSquare ? BAUHAUS_SIZE : BAUHAUS_SIZE / 8}
          fill={pieces[1].color}
          transform={`translate(${pieces[1].translateX} ${pieces[1].translateY}) rotate(${pieces[1].rotate} ${center} ${center})`}
        />
        <circle
          cx={center}
          cy={center}
          r={BAUHAUS_SIZE / 5}
          fill={pieces[2].color}
          transform={`translate(${pieces[2].translateX} ${pieces[2].translateY})`}
        />
        <line
          x1={0}
          y1={center}
          x2={BAUHAUS_SIZE}
          y2={center}
          strokeWidth={2}
          stroke={pieces[3].color}
          transform={`translate(${pieces[3].translateX} ${pieces[3].translateY}) rotate(${pieces[3].rotate} ${center} ${center})`}
        />
      </svg>
    </div>
  );
}
