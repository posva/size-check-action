import { exec } from '@actions/exec'
import hasYarn from 'has-yarn'
import { readFileSizeSync } from './size'

const INSTALL_STEP = 'install'
const BUILD_STEP = 'build'

class Term {
  async execSizeLimit({
    branch,
    buildScript,
    directory
  }: {
    branch?: string
    buildScript: string
    directory?: string
  }) {
    const manager = hasYarn() ? 'yarn' : 'npm'

    if (branch) {
      try {
        await exec(`git fetch origin ${branch} --depth=1`)
      } catch (error) {
        console.log('Fetch failed', error.message)
      }

      await exec(`git checkout -f ${branch}`)
    }

    await exec(`${manager} install`, [], {
      cwd: directory
    })

    const script = buildScript || 'build'
    await exec(`${manager} run ${script}`, [], {
      cwd: directory
    })

    const pkg = require('./package.json')

    if (
      !pkg.sizeCheck ||
      !Array.isArray(pkg.sizeCheck) ||
      !pkg.sizeCheck.length
    ) {
      throw new Error(
        'You must specify "sizeCheck" as an array of file paths to check'
      )
    }

    return (pkg.sizeCheck as string[]).reduce((fileMap, filePath: string) => {
      const result = readFileSizeSync(filePath)
      fileMap[result.name] = result
      return fileMap
    }, {} as Record<string, ReturnType<typeof readFileSizeSync>>)

    // return {
    //   status,
    //   output
    // }
  }
}

export default Term
