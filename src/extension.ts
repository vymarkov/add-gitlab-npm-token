// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as url from 'url'
import { findPkgsWithGitlabNPMRegisty, createAndSetTokenForGitlabNpmRegistry, genAccessTokenForGitlabNpmRegistry } from './commands'

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "add-gitlab-npm-token" is now active!');

	const getGitlabAccessToken = (domain: string): string | null => {
		const conf = vscode.workspace.getConfiguration('gitlabPipelineMonitor')

		if (conf[domain]?.token) {
			return (conf[domain] as { token: string })?.token || null
		}
		return null
	}

	const authenticateToGitLabNPMRegistry = async (gitlabBaseUrl: string = 'https://gitlab.com', onExtStart: boolean = false) => {
		const domain = url.parse(gitlabBaseUrl).host!

		const folders = [...(vscode.workspace.workspaceFolders ?? [])]
		const pkgs = (await Promise.all(folders.map(folder => findPkgsWithGitlabNPMRegisty(gitlabBaseUrl, folder.uri.fsPath))))
				.flatMap((acc) => acc, [])

		if (pkgs.length) {
			pkgs.map(async (scope: string) => {
				const answer = await vscode.window.showInformationMessage(
				`We found that packages at ${scope} use Gitlab NPM Registry, but didn't found any access tokens.
				 Would you like to generate an access token to authenticate to the GitLab NPM Registry?
				`, 'Yes', 'Learn more')
	
				if (answer === 'Yes' && getGitlabAccessToken(domain)) {
					await createAndSetTokenForGitlabNpmRegistry(domain, async () => {
						const token = getGitlabAccessToken(domain)
						await genAccessTokenForGitlabNpmRegistry(token!)
						return token!
					})
					vscode.window.showInformationMessage('Successfully added a npm token for GitLab NPM Registry')
				}
				if (answer === 'Learn more') {
					if (gitlabBaseUrl.search('gitlab.com')) {
						vscode.env.openExternal(
							vscode.Uri.parse(`https://docs.gitlab.com/ce/user/packages/npm_registry/index.html#authenticating-to-the-gitlab-npm-registry`)
						)
					} else {
						vscode.Uri.parse(`${gitlabBaseUrl}/ce/user/packages/npm_registry/index.html#authenticating-to-the-gitlab-npm-registry`)
					}
				}
			})
		} else if (!onExtStart) {
			vscode.window.showInformationMessage('Looks like, you\'ve configured all NPM registries, great job 👍')
		}
	};

	context.subscriptions.push(
		vscode.commands.registerCommand('add-gitlab-npm-token.find-pkg-scope-with-gitlab-npm-registry', authenticateToGitLabNPMRegistry)
	);

	context.subscriptions.push(
		// The command has been defined in the package.json file
		// Now provide the implementation of the command with registerCommand
		// The commandId parameter must match the command field in package.json
		vscode.commands.registerCommand('add-gitlab-npm-token.helloWorld', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from Add-gitlab-npm-token!');
	}));

	await authenticateToGitLabNPMRegistry('https://gitlab.com', true)
}

// this method is called when your extension is deactivated
export function deactivate() {}