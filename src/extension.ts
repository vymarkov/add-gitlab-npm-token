// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as url from 'url'
import { findPkgsWithGitlabNPMRegisty, createAndSetTokenForGitlabNpmRegistry, genAccessTokenForGitlabNpmRegistry } from './commands'
import { logger } from './logger'
import { getFolders, getGitlabAccessToken, getGitlabGroupID } from './utils'

// @ts-ignore
// import tokenInput = require('@vymarkov/gitlab-workflow/out/src/token_input')
import { tokenService } from './tokenService'
import { showInput } from './tokenInput'

const updatePageUrl = (instanceUrl: string, pageUrl: string): vscode.Uri => {
  if (instanceUrl.search('gitlab.com')) {
    return vscode.Uri.parse(pageUrl)
  }
  const link = url.parse(pageUrl)
  link.host = url.parse(instanceUrl).host
  return vscode.Uri.parse(url.format(link))
}

const createLinkToGitlabDocs = (instanceUrl: string, docsLink: string): vscode.Uri => {
  if (instanceUrl.search('gitlab.com')) {
    return vscode.Uri.parse('https://docs.gitlab.com/ce/user/packages/npm_registry/index.html#authenticating-to-the-gitlab-npm-registry')
  }
  const link = url.parse(docsLink)
  link.host = url.parse(instanceUrl).host
  return vscode.Uri.parse(url.format(link))
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  tokenService.init(context)

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  logger.log('Congratulations, your extension "add-gitlab-npm-token" is now active!');

  const authenticateToGitLabNPMRegistry = async (instanceUrl: string = 'https://gitlab.com') => {
    const domain = url.parse(instanceUrl).host!

    const folders = await getFolders()
    const pkgs = (await Promise.all(folders.map(folder => findPkgsWithGitlabNPMRegisty(instanceUrl, folder.uri))))
      .reduce((acc, itm) => acc.concat(itm), [])

    if (pkgs.length) {
      pkgs.map(async ({ scope, cwd: folder }: { scope: string, cwd: vscode.Uri }) => {
        const answer = await vscode.window.showInformationMessage(
          `We found that packages at ${scope} use Gitlab NPM Registry, but didn't found any access tokens.
				 Would you like to generate an access token to authenticate to the GitLab NPM Registry?
        `, 'Yes', 'Learn more')

        if (answer === 'Yes' && !getGitlabAccessToken(instanceUrl)) {
          return vscode.window.showWarningMessage(
            'Unable to find Gitlab Personal Access Token with required permissions, you have to create one',
            'Open User Settings',
            'Learn more'
          )
        }

        if (answer === 'Yes') {
          try {
            const token = getGitlabAccessToken(instanceUrl)!
            const groupID = await getGitlabGroupID(domain, folder)
            if (!groupID) {
              logger.log(`Unable to determine GitLab group's name, but it's required in order to generate token (${folder.fsPath})`)
              return vscode.window.showWarningMessage(
                'Unable to determine GitLab group\'s name, but it required in order to generate token'
              )
            }
            const _token = await genAccessTokenForGitlabNpmRegistry(token, groupID)
            await createAndSetTokenForGitlabNpmRegistry(domain, _token!, folder.fsPath)
            vscode.window.showInformationMessage('Successfully added a npm token for GitLab NPM Registry')
          } catch (err) {
            if (err.code === 'gitlab/action-forbidden') {
              const answer = await vscode.window.showInformationMessage(
                `Unable to create an access token in order to install packages from Gitlab NPM Registry.
								You have to create a Personal Access Token`,
                'Learn more'
              )
              if (answer === 'Learn more') {
                vscode.env.openExternal(
                  createLinkToGitlabDocs(
                    instanceUrl,
                    'https://docs.gitlab.com/ce/user/packages/npm_registry/index.html#authenticating-with-a-personal-access-token-or-deploy-token'
                  )
                )
              }
            } else if (err.message) {
              vscode.window.showWarningMessage(err.message)
            }
          }
        }
        if (answer === 'Learn more') {
          vscode.env.openExternal(
            createLinkToGitlabDocs(
              instanceUrl,
              'https://docs.gitlab.com/ce/user/packages/npm_registry/index.html#authenticating-to-the-gitlab-npm-registry'
            )
          )
        }
      })
    } else {
      vscode.window.showInformationMessage('Looks like, you\'ve configured all NPM registries, great job 👍')
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('add-gitlab-npm-token.find-pkg-scope-with-gitlab-npm-registry', authenticateToGitLabNPMRegistry)
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('add-gitlab-npm-token.setToken', showInput)
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('add-gitlab-npm-token.openUserSettings', (instanceUrl: string = 'https://gitlab.com') => {
      vscode.env.openExternal(
        updatePageUrl(
          instanceUrl,
          'https://gitlab.com/-/profile/personal_access_tokens'
        )
      )
    })
  )
}

// this method is called when your extension is deactivated
export function deactivate() { }
