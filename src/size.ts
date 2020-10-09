const fs = require('fs')
const path = require('path')
const { gzipSync } = require('zlib')
const { compress } = require('brotli')

export function readFileSizeSync(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return
  }
  const file = fs.readFileSync(filePath)
  // const minSize = (file.length / 1024).toFixed(2) + 'kb'
  const gzipped = gzipSync(file)
  // const gzippedSize = (gzipped.length / 1024).toFixed(2) + 'kb'
  const compressed = compress(file)
  // const compressedSize = (compressed.length / 1024).toFixed(2) + 'kb'

  // process.stderr.write(
  //   `${chalk.gray(
  //     chalk.bold(path.basename(filePath))
  //   )} min:${minSize} / gzip:${gzippedSize} / brotli:${compressedSize}\n`
  // )

  return {
    name: path.basename(filePath),
    size: gzipped.length,
    brotli: compressed.length,
    minSize: file.length
  }
}

// checkFileSize(path.resolve(__dirname, '../size-checks/dist/webRouter.js'))
// checkFileSize(path.resolve(__dirname, '../dist/vue-router.global.prod.js'))

// console.log(JSON.stringify(sizeReports))
