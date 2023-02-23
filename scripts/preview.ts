import { readdir, unlink, writeFile } from 'fs/promises'
import { filename } from 'pathe/utils'
import { join, resolve } from 'pathe'
import { splitByCase } from 'scule'
import { ensureDir, remove } from 'fs-extra'
import { type Variants, variants } from '@catppuccin/palette'
import { launch } from 'puppeteer'

import { catppuccinFlavors } from './colors'

const THEMES = resolve('themes')
const PREVIEWS = resolve('previews')

const generateHtml = (files: string[], folders: string[], flavor: keyof Variants<any>) => {
  const fileTags = files.map(icon => `
    <div style="display: flex; align-items: center;">
      <img style="width: 25px; margin: 2px;" src="../themes/${flavor}/icons/${icon}" />
      <span style="color: ${variants[flavor].text.hex}; margin-left: 10px; text-transform: capitalize;">
        ${splitByCase(filename(icon), ['_']).join(' ')}
      </span>
    </div>
  `).reduce((a, c) => a + c, '')
  const folderTags = folders.map(icon => `
    <div style="display: flex; align-items: center;">
      <img style="width: 25px; padding: 2px;" src="../themes/${flavor}/icons/${icon}" />
      <span style="color: ${variants[flavor].text.hex}; margin-left: 10px; text-transform: capitalize;">
        ${splitByCase(filename(icon), ['_']).join(' ')}
      </span>
    </div>
  `).reduce((a, c) => a + c, '')

  return `
    <html>
      <body style="background-color: ${variants[flavor].mantle.hex}; font-family: sans-serif; font-size: 14px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; width: 800px;">
          ${fileTags}
        </div>
        <div style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px; width: 600px;">
          ${folderTags}
        </div>
      </body>
    </html>
  `
}

await remove(PREVIEWS)
await ensureDir(PREVIEWS)
const icons = await readdir(join(THEMES, 'mocha', 'icons'))

const [folderIcons, fileIcons] = icons.reduce(
  (acc, cur) =>
    cur.startsWith('folder')
      ? (cur.endsWith('open.svg') || cur.endsWith('root.svg'))
          ? acc
          : [[...acc[0], cur], acc[1]]
      : [acc[0], [...acc[1], cur]],
  [[], []],
)

await Promise.all(catppuccinFlavors.map(async (flavor) => {
  const FILE_PREVIEW = join(PREVIEWS, `${flavor}.html`)
  await writeFile(FILE_PREVIEW, generateHtml(fileIcons, folderIcons, flavor))
  const browser = await launch()
  const page = await browser.newPage()
  await page.setViewport({ height: 10, width: 600 })
  await page.goto(join('file:', FILE_PREVIEW))
  await page.screenshot({ path: join(PREVIEWS, `${flavor}.png`), fullPage: true })
  await browser.close()
  await unlink(FILE_PREVIEW)
}))
