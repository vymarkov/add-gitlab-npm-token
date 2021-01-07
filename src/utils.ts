import * as vscode from 'vscode'
import { GitExtension } from './git'
import * as parseGitURL from 'git-url-parse'
import gitUrlParse = require('git-url-parse')
import * as url from 'url'

import { tokenService } from './tokenService'
import { Gitlab } from '@gitbeaker/node'
import { logger } from './logger'
const isEmpty = require('lodash.isempty')

export type GitlabDomain = string

export type GitlabToken = string | null

export const getFolders = async (): Promise<vscode.WorkspaceFolder[]> => {
  const folders = [...(vscode.workspace.workspaceFolders ?? [])]

  if (folders?.length > 1) {
    const folderName = await vscode.window.showQuickPick(folders.map(itm => itm.name), {
      placeHolder: folders[0].name,
      ignoreFocusOut: true,
      matchOnDescription: true
    })

    if (folderName) {
      return [folders.find(itm => itm.name === folderName)!]
    }
  }

  return folders
}

const getGitlabAccessTokenFromGitlabPipelineMonitor = (domain: GitlabDomain) => {
  const conf = vscode.workspace.getConfiguration('gitlabPipelineMonitor')

  if (conf[domain]?.token) {
    return (conf[domain] as { token: string })?.token || null
  }
  return null
}


/**
 * It's very useful in case when you use editor like Gitpod or Code Server that runs on Docker environment
 */
const getGitlabTokenFromEnvironmentVariables = (): GitlabToken => {
  const token = process.env.GITLAB_TOKEN || process.env.GL_TOKEN || null
  return token
}

export const getGitlabAccessToken = (instanceUrl: string): GitlabToken => {
  const domain = url.parse(instanceUrl).host!

  const token = tokenService.getToken(instanceUrl)
    || getGitlabTokenFromEnvironmentVariables()
    || getGitlabAccessTokenFromGitlabPipelineMonitor(domain) || null
  return token
}

export const getGitOriginURL = async (folder: vscode.Uri, domain: GitlabDomain): Promise<string | null> => {
  const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')!.exports
  if (gitExtension) {
    const repo = gitExtension.getAPI(1).repositories.find(itm => itm.rootUri.fsPath === folder.fsPath)
    if (repo?.state?.remotes?.filter(itm => itm.fetchUrl).some(itm => gitUrlParse(itm.fetchUrl!).source === domain)) {
      const origin = repo?.state.remotes?.find(itm => itm.name === 'origin')
      return origin?.fetchUrl || null
    }
  }
  return null
}

export const getGitLabGroupNameFromGitUrl = (gitUrl: string) => {
  const repo = parseGitURL(gitUrl)
  return repo.owner
}

export const getGitLabGroupIDFromGitLabPipelineMonitorSettings = (domain: GitlabDomain): string | null => {
  const conf = vscode.workspace.getConfiguration('gitlabPipelineMonitor')

  if (conf[domain]?.group) {
    return (conf[domain] as { group: string })?.group || null
  }
  return null
}

export const getGitlabGroupID = async (domain: GitlabDomain, gitFolder: vscode.Uri): Promise<string | number | null> => {
  const originUrl = await getGitOriginURL(gitFolder, domain)
  if (originUrl) {
    return getGitLabGroupNameFromGitUrl(originUrl)
  }
  return getGitLabGroupIDFromGitLabPipelineMonitorSettings(domain)
}
