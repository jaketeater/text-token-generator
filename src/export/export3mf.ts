import type { CoinPartKey, GeneratedCoin } from '../model/generatedCoin'
import type { CoinParameters } from '../model/coinParameters'
import { generateCoin } from '../geometry/createCoin'
import { create3mfPackage } from './create3mfPackage'
import { createModelXml, type ModelPart } from './createModelXml'
import { meshToTriangles } from './meshToTriangles'

const EXPORT_FILE_NAME = 'text-token.3mf'
const PART_ORDER: CoinPartKey[] = ['body', 'borderRing', 'topText', 'bottomText']

const coinToModelParts = (coin: GeneratedCoin): ModelPart[] =>
  PART_ORDER.map((key, index) => {
    const part = coin.parts[key]

    return {
      id: index + 1,
      name: part.name,
      color: part.color,
      mesh: meshToTriangles(part.geometry),
    }
  })

export const createCoin3mf = (parameters: CoinParameters): Uint8Array => {
  const coin = generateCoin(parameters)
  return create3mfPackage(createModelXml(coinToModelParts(coin)))
}

export const downloadCoin3mf = (parameters: CoinParameters): void => {
  const packageData = createCoin3mf(parameters)
  const blob = new Blob([packageData], { type: 'model/3mf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = EXPORT_FILE_NAME
  link.click()
  URL.revokeObjectURL(url)
}
