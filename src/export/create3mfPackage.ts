import { strToU8, zipSync } from 'fflate'

export interface PackageFile {
  path: string
  content: string
}

const MODEL_PATH = '3D/3dmodel.model'

export const create3mfPackage = (modelXml: string): Uint8Array => {
  const files: PackageFile[] = [
    {
      path: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
</Types>
`,
    },
    {
      path: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rel-0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" Target="/${MODEL_PATH}" />
</Relationships>
`,
    },
    {
      path: MODEL_PATH,
      content: modelXml,
    },
    {
      path: '3D/_rels/3dmodel.model.rels',
      content: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships" />
`,
    },
  ]

  return zipSync(
    Object.fromEntries(files.map((file) => [file.path, strToU8(file.content)])),
    { level: 9 },
  )
}
