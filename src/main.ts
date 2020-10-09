import { getInput, setFailed } from '@actions/core'
import { context, GitHub } from '@actions/github'
// @ts-ignore
import table from 'markdown-table'
import Term from './Term'
import SizeLimit from './SizeLimit'

const SIZE_LIMIT_URL = 'https://github.com/ai/size-limit'
const SIZE_LIMIT_HEADING = `## Size report`

async function fetchPreviousComment(
  octokit: GitHub,
  repo: { owner: string; repo: string },
  pr: { number: number }
) {
  // TODO: replace with octokit.issues.listComments when upgraded to v17
  const commentList = await octokit.paginate(
    'GET /repos/:owner/:repo/issues/:issue_number/comments',
    {
      ...repo,
      // eslint-disable-next-line camelcase
      issue_number: pr.number,
    }
  )

  const sizeLimitComment = commentList.find(comment =>
    comment.body.startsWith(SIZE_LIMIT_HEADING)
  )
  return !sizeLimitComment ? null : sizeLimitComment
}

async function run() {
  try {
    const { payload, repo } = context
    const pr = payload.pull_request

    if (!pr) {
      throw new Error('No PR found. Only pull_request workflows are supported.')
    }

    const token = getInput('github_token')
    const buildScript = getInput('build_script')
    const files = getInput('files').split(' ')
    const directory = getInput('directory') || process.cwd()
    getInput('windows_verbatim_arguments') === 'true' ? true : false
    const octokit = new GitHub(token)
    const term = new Term()
    const limit = new SizeLimit()

    const base = await term.execSizeLimit({
      branch: null,
      files,
      buildScript,
      directory,
    })

    const current = await term.execSizeLimit({
      branch: pr.base.ref,
      files,
      buildScript,
      directory,
    })

    const body = [
      SIZE_LIMIT_HEADING,
      table(limit.formatResults(base, current)),
    ].join('\r\n')

    const sizeLimitComment = await fetchPreviousComment(octokit, repo, pr)

    if (!sizeLimitComment) {
      try {
        await octokit.issues.createComment({
          ...repo,
          // eslint-disable-next-line camelcase
          issue_number: pr.number,
          body,
        })
      } catch (error) {
        console.log(
          "Error creating comment. This can happen for PR's originating from a fork without write permissions."
        )
      }
    } else {
      try {
        await octokit.issues.updateComment({
          ...repo,
          // eslint-disable-next-line camelcase
          comment_id: sizeLimitComment.id,
          body,
        })
      } catch (error) {
        console.log(
          "Error updating comment. This can happen for PR's originating from a fork without write permissions."
        )
      }
    }

    // if (status > 0) {
    //   setFailed('Size limit has been exceeded.')
    // }
  } catch (error) {
    setFailed(error.message)
  }
}

run()
