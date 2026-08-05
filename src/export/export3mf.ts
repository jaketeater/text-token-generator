import { booleans, primitives, transforms } from '@jscad/modeling'

import { create3mfPackage } from './create3mfPackage'
import { createModelXml, type ModelPart } from './createModelXml'
import { meshToTriangles } from './meshToTriangles'
import { COIN_PART_NAMES, type CoinPartKey, type GeneratedCoin } from '../model/generatedCoin'

export interface Exported3mfPackage {
  filename: string
  data: Uint8Array
}

const PART_ORDER: CoinPartKey[] = ['body', 'borderRing', 'topText', 'bottomText']

const sanitizeFilenamePart = (value: string): string => {
  const sanitized = value
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\.+|\.+$/g, '')
    .replace(/^-+|-+$/g, '')

  return sanitized || 'TEXT'
}

export const create3mfFilename = (topText: string, bottomText: string): string =>
  `coin-${sanitizeFilenamePart(topText)}-${sanitizeFilenamePart(bottomText)}.3mf`

export const createCoin3mfPackage = (
  coin: GeneratedCoin,
  topText: string,
  bottomText: string,
): Exported3mfPackage => {
  const parts: ModelPart[] = PART_ORDER.map((partKey, index) => {
    const part = coin.parts[partKey]

    return {
      id: index + 1,
      name: part.name,
      color: part.color,
      mesh: meshToTriangles(part.geometry),
    }
  })

  return {
    filename: create3mfFilename(topText, bottomText),
    data: create3mfPackage(createModelXml(parts, 'Text Token')),
  }
}

export const downloadCoin3mf = (coin: GeneratedCoin, topText: string, bottomText: string): void => {
  const packageData = createCoin3mfPackage(coin, topText, bottomText)
  const blob = new Blob([packageData.data], { type: 'model/3mf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = packageData.filename
  link.click()
  URL.revokeObjectURL(url)
}

export const createCompatibilityGeneratedCoin = (): GeneratedCoin => {
  const height = 3
  const body = primitives.cylinder({ radius: 20, height, segments: 96 })
  const borderRing = booleans.subtract(
    primitives.cylinder({ radius: 22, height: height + 0.35, segments: 96 }),
    primitives.cylinder({ radius: 18.5, height: height + 0.7, segments: 96 }),
  )
  const topText = transforms.translate(
    [0, 7.25, height / 2 + 0.35],
    primitives.cuboid({ size: [22, 5, 0.7] }),
  )
  const bottomText = transforms.translate(
    [0, -7.25, height / 2 + 0.35],
    primitives.cuboid({ size: [22, 5, 0.7] }),
  )

  return {
    parts: {
      body: {
        id: 'coin-body',
        name: COIN_PART_NAMES.body,
        displayName: COIN_PART_NAMES.body,
        geometry: body,
        color: '#d1d5db',
        metadata: { id: 'coin-body', key: 'body', displayName: COIN_PART_NAMES.body },
      },
      borderRing: {
        id: 'border-ring',
        name: COIN_PART_NAMES.borderRing,
        displayName: COIN_PART_NAMES.borderRing,
        geometry: borderRing,
        color: '#9ca3af',
        metadata: { id: 'border-ring', key: 'borderRing', displayName: COIN_PART_NAMES.borderRing },
      },
      topText: {
        id: 'top-text',
        name: COIN_PART_NAMES.topText,
        displayName: COIN_PART_NAMES.topText,
        geometry: topText,
        color: '#111827',
        metadata: { id: 'top-text', key: 'topText', displayName: COIN_PART_NAMES.topText },
      },
      bottomText: {
        id: 'bottom-text',
        name: COIN_PART_NAMES.bottomText,
        displayName: COIN_PART_NAMES.bottomText,
        geometry: bottomText,
        color: '#111827',
        metadata: { id: 'bottom-text', key: 'bottomText', displayName: COIN_PART_NAMES.bottomText },
      },
    },
  }
}

export const createCompatibilityTest3mf = (): Uint8Array =>
  createCoin3mfPackage(createCompatibilityGeneratedCoin(), 'TOPTEXT', 'BOTTOMTEXT').data

export const downloadCompatibilityTest3mf = (): void => {
  downloadCoin3mf(createCompatibilityGeneratedCoin(), 'TOPTEXT', 'BOTTOMTEXT')
}
