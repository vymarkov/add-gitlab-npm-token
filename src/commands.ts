import * as execa from 'execa'
import * as readPkg from 'read-pkg'
import * as url from 'url'
import { Gitlab } from '@gitbeaker/node'
// @ts-ignore
import * as getAuthToken from 'registry-auth-token'

export const genAccessTokenForGitlabNpmRegistry = async (token: string) => {
    const client = new Gitlab({ token })

    // https://docs.gitlab.com/ee/api/deploy_tokens.html#create-a-group-deploy-token
    const resp = await client.GroupDeployTokens.add(
        'koyfin',
        'Read npm packages (generated by VSCode)',
        // @ts-ignore
        ['read_package_registry']) as { token: string, username: string }

    return resp.token
}

export const createAndSetTokenForGitlabNpmRegistry = async (gitlabHost: string, genAccessToken: () => Promise<string>) => {
    const accessToken = await genAccessToken()
    await execa.command(`npm config set //${gitlabHost}/api/v4/packages/npm/:_authToken=${accessToken}`);
}

const isGitlabNPMRegistry = (gitlabUrl: string, scope: string, cwd: string): boolean => {
    const { stdout: registryUrl } = execa.commandSync(`npm config get ${scope}:registry`, { cwd })
    if (!registryUrl) {
        return false
    }
    return registryUrl.search(gitlabUrl) !== -1
}

export const findPkgsWithGitlabNPMRegisty = async (gitlabUrl: string, cwd: string) => {
    const pkg = readPkg.sync({ cwd })

    const deps: Set<string> = Object.keys({
        ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies, ...pkg.optionalDependencies 
    }).filter((itm: string) => itm.startsWith('@'))
      .map(itm => itm.substring(0, itm.search('/')))
      .reduce((acc, itm) => acc.add(itm), new Set<string>())

    return ([...deps.values()])
        .filter(itm => isGitlabNPMRegistry(gitlabUrl, itm, cwd))
        .filter(() => !Boolean(getAuthToken(`//${url.parse(gitlabUrl).host}/api/v4/packages/npm/`)?.token))
}