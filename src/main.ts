import { getInput, setFailed } from '@actions/core'
import { context, GitHub } from '@actions/github'
// @ts-ignore
import table from 'markdown-table'
import Term from './Term'
import SizeLimit from './SizeLimit'
import { WebhookPayload } from '@actions/github/lib/interfaces'
import { Context } from '@actions/github/lib/context'

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

type GHRepo = Context['repo']
type GHPullRequest = WebhookPayload['pull_request']

function getOptions() {
  return {
    token: getInput('github_token'),
    buildScript: getInput('build_script'),
    files: getInput('files').split(' '),
    directory: getInput('directory') || process.cwd(),
  }
}

async function compareToRef(ref: string, pr?: GHPullRequest, repo?: GHRepo) {
  const { token, buildScript, files, directory } = getOptions()

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
    branch: ref,
    files,
    buildScript,
    directory,
  })

  const mdTable = table(limit.formatResults(base, current))

  console.log(mdTable)

  if (pr && repo) {
    const body = [SIZE_LIMIT_HEADING, mdTable].join('\r\n')

    const sizeLimitComment = await fetchPreviousComment(octokit, repo, pr)

    try {
      if (!sizeLimitComment) {
        await octokit.issues.createComment({
          ...repo,
          // eslint-disable-next-line camelcase
          issue_number: pr.number,
          body,
        })
      } else {
        await octokit.issues.updateComment({
          ...repo,
          // eslint-disable-next-line camelcase
          comment_id: sizeLimitComment.id,
          body,
        })
      }
    } catch (error) {
      console.log(
        "Error creating/updating comment. This can happen for PR's originating from a fork without write permissions."
      )
    }
  }
}

async function run() {
  const pr = context.payload.pull_request

  try {
    if (pr) {
      await compareToRef(pr.base.ref as string, pr, context.repo)
    } else {
      await compareToRef('HEAD^')
    }
  } catch (error) {
    setFailed(error.message)
  }
}

run()
