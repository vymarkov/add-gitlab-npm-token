import { Gitlab } from "@gitbeaker/node"
import isEmpty = require("lodash.isempty")
import { ILogger } from "../types"
import pTimeout from 'p-timeout'

type GitlabToken = string | null

type GitlabNPMToken = string | null

type GitlabInstanceUrl = string

/**
 * Validates that the token is valid for given GitLab instance.
 *
 * @param instanceUrl
 * @param token
 */
export const validateGitlabAccessToken = async (logger: ILogger, instanceUrl: string, token: GitlabToken): Promise<boolean> => {
  if (isEmpty(token) || isEmpty(instanceUrl)) {
    return false
  }
  const requestTimeout = 1500
  const client = new Gitlab({ host: instanceUrl, token, requestTimeout })
  try {
    await pTimeout(client.Users.current(), requestTimeout)
  } catch (err) {
    logger.warn(err ?? err.message)
    logger.warn('The provided token could not used for given Gitlab instance')
    return false
  }
  return true
}

/**
 * Personal access token with api or read_api scope (it's preffered).
 * Currently we don't have ability to validate token to ensure that token can be used to fetch npm packages.
 * So if token is not valid, you fill face with issue during installing npm packages.
 *
 * @see https://docs.gitlab.com/ee/user/packages/npm_registry/#authenticate-with-a-personal-access-token-or-deploy-token
 * @see https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html#creating-a-personal-access-token
 * @see https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html
 */
export const getGitlabNPMToken = async (): Promise<GitlabNPMToken> => {
  const token = process.env.GITLAB_NPM_TOKEN || process.env.GL_NPM_TOKEN || null
  return token
}

// it doesn't work as expected cause gilab client doesn't provide api to fetch packages by group id
export const validateGitlabNPMToken = async (logger: ILogger, host: GitlabInstanceUrl, token: GitlabToken, groupID: number): Promise<{ token: GitlabNPMToken; isValid: boolean }> => {
  const requestTimeout = 1500
  try {
    const client = new Gitlab({ host, token, requestTimeout })
    await client.Packages.all(groupID, { packageType: 'npm', includeVersionless: true })
  } catch (err) {
    logger.warn(err?.description)
    return { token, isValid: false }
  }

  return { token, isValid: true }
}
