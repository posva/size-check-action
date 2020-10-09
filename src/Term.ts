import { exec } from '@actions/exec'
import hasYarn from 'has-yarn'
import { readFileSizeSync } from './size'

const INSTALL_STEP = 'install'
const BUILD_STEP = 'build'

class Term {
  async execSizeLimit({
    branch,
    files,
    buildScript,
    directory,
  }: {
    branch?: string
    files: string[]
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
      cwd: directory,
    })

    const script = buildScript || 'build'
    await exec(`${manager} run ${script}`, [], {
      cwd: directory,
    })

    if (!files || !Array.isArray(files) || !files.length) {
      throw new Error(`"files" cannot be empty. Got ${JSON.stringify(files)}`)
    }

    return files.reduce((fileMap, filePath: string) => {
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
