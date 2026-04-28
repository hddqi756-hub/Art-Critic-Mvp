import { useEffect, useMemo, useState } from 'react'
import { Arrow, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from 'react-konva'
import type { Annotation, RectPercent } from '../types'

type Props = {
  imageUrl: string
  width: number
  height: number
  annotations: Annotation[]
}

const toPx = (rect: RectPercent, width: number, height: number) => ({
  x: (rect.x / 100) * width,
  y: (rect.y / 100) * height,
  width: (rect.width / 100) * width,
  height: (rect.height / 100) * height,
})

export default function ArtworkCanvas({ imageUrl, width, height, annotations }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    const i = new window.Image()
    i.src = imageUrl
    i.onload = () => setImg(i)
  }, [imageUrl])

  const fit = useMemo(() => {
    if (!img) return { x: 0, y: 0, width, height }
    const scale = Math.min(width / img.width, height / img.height)
    const w = img.width * scale
    const h = img.height * scale
    return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h }
  }, [img, width, height])

  return (
    <Stage width={width} height={height}>
      <Layer>
        <Rect x={0} y={0} width={width} height={height} fill="#fcfaf7" />
        {img ? <KonvaImage image={img} x={fit.x} y={fit.y} width={fit.width} height={fit.height} /> : <Text x={12} y={12} text="正在加载作品..." />}
      </Layer>
      <Layer>
        {annotations.map((item) => {
          if (item.type === 'box' && item.rect) {
            const r = toPx(item.rect, fit.width, fit.height)
            return <Rect key={item.id} x={fit.x + r.x} y={fit.y + r.y} width={r.width} height={r.height} stroke={item.color ?? 'red'} strokeWidth={2} />
          }
          if (item.type === 'line' && item.points) return <Line key={item.id} points={item.points} stroke={item.color ?? 'red'} strokeWidth={2} />
          if (item.type === 'arrow' && item.points) return <Arrow key={item.id} points={item.points} stroke={item.color ?? 'red'} fill={item.color ?? 'red'} strokeWidth={2} />
          return null
        })}
      </Layer>
    </Stage>
  )
}
