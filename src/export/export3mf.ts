import { booleans, primitives, transforms } from '@jscad/modeling'

import { create3mfPackage } from './create3mfPackage'
import { createModelXml, type ModelPart } from './createModelXml'
import { meshToTriangles } from './meshToTriangles'
import type { CoinParameters } from '../model/coinParameters'
import type { GeneratedCoin } from '../model/generatedCoin'
import { createCoin } from '../geometry/createCoin'

const COMPATIBILITY_EXPORT_FILE_NAME = 'coin-compatibility-test.3mf'
const DEFAULT_EXPORT_FILE_NAME = 'coin.3mf'

const isGeneratedCoin = (coinOrParameters: GeneratedCoin | CoinParameters): coinOrParameters is GeneratedCoin =>
  'parts' in coinOrParameters

export const generateCoin = (parameters: CoinParameters): GeneratedCoin => createCoin(parameters)

export const createCoinModelParts = (coin: GeneratedCoin): ModelPart[] => [
  {
    id: 1,
    name: coin.parts.body.name,
    color: coin.parts.body.color,
    mesh: meshToTriangles(coin.parts.body.geometry),
  },
  {
    id: 2,
    name: coin.parts.borderRing.name,
    color: coin.parts.borderRing.color,
    mesh: meshToTriangles(coin.parts.borderRing.geometry),
  },
  {
    id: 3,
    name: coin.parts.topText.name,
    color: coin.parts.topText.color,
    mesh: meshToTriangles(coin.parts.topText.geometry),
  },
  {
    id: 4,
    name: coin.parts.bottomText.name,
    color: coin.parts.bottomText.color,
    mesh: meshToTriangles(coin.parts.bottomText.geometry),
  },
]

export const createCoin3mf = (coinOrParameters: GeneratedCoin | CoinParameters): Uint8Array => {
  const coin = isGeneratedCoin(coinOrParameters) ? coinOrParameters : generateCoin(coinOrParameters)

  return create3mfPackage(createModelXml(createCoinModelParts(coin)))
}

const sanitizeFilenamePart = (value: string): string => {
  const sanitized = value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/[-_.]+$/g, '')

  return sanitized || 'blank'
}

export const createCoin3mfFilename = (parameters: CoinParameters): string => {
  const topText = sanitizeFilenamePart(parameters.topFace.text)
  const bottomText = sanitizeFilenamePart(parameters.bottomFace.text)
  const fileName = `coin-${topText}-${bottomText}.3mf`

  return fileName === 'coin-blank-blank.3mf' ? DEFAULT_EXPORT_FILE_NAME : fileName
}

export const downloadCoin3mf = (parameters: CoinParameters): void => {
  const packageData = createCoin3mf(parameters)
  const blob = new Blob([packageData], { type: 'model/3mf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = createCoin3mfFilename(parameters)
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Developer-only acceptance artifact for validating slicer multipart/color handling
 * independently from the production coin generator.
 */
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
  link.download = COMPATIBILITY_EXPORT_FILE_NAME
  link.click()
  URL.revokeObjectURL(url)
}
