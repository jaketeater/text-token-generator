import { booleans, primitives, transforms } from '@jscad/modeling'

import { create3mfPackage } from './create3mfPackage'
import { createModelXml, type ModelPart } from './createModelXml'
import { meshToTriangles } from './meshToTriangles'

const EXPORT_FILE_NAME = 'coin-compatibility-test.3mf'

export const createCompatibilityTest3mf = (): Uint8Array => {
  const height = 3
  const body = primitives.cylinder({ radius: 20, height, segments: 96 })
  const borderRing = booleans.subtract(
    primitives.cylinder({ radius: 22, height: height + 0.35, segments: 96 }),
    primitives.cylinder({ radius: 18.5, height: height + 0.7, segments: 96 }),
  )
  const topInsert = transforms.translate(
    [0, 7.25, height / 2 + 0.35],
    primitives.cuboid({ size: [22, 5, 0.7] }),
  )
  const bottomInsert = transforms.translate(
    [0, -7.25, height / 2 + 0.35],
    primitives.cuboid({ size: [22, 5, 0.7] }),
  )

  const parts: ModelPart[] = [
    { id: 1, name: 'Center Cylinder', color: '#2f80ed', mesh: meshToTriangles(body) },
    { id: 2, name: 'Border Ring', color: '#f2994a', mesh: meshToTriangles(borderRing) },
    { id: 3, name: 'Top Rectangular Insert', color: '#27ae60', mesh: meshToTriangles(topInsert) },
    { id: 4, name: 'Bottom Rectangular Insert', color: '#eb5757', mesh: meshToTriangles(bottomInsert) },
  ]

  return create3mfPackage(createModelXml(parts))
}

export const downloadCompatibilityTest3mf = (): void => {
  const packageData = createCompatibilityTest3mf()
  const blob = new Blob([packageData], { type: 'model/3mf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = EXPORT_FILE_NAME
  link.click()
  URL.revokeObjectURL(url)
}
