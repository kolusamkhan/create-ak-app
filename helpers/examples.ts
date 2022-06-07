/* eslint-disable import/no-extraneous-dependencies */
import got from 'got'
import tar from 'tar'
import { Stream } from 'stream'
import { promisify } from 'util'

const pipeline = promisify(Stream.pipeline)

export type RepoInfo = {
  username: string
  name: string
  branch: string
  filePath: string
}

export async function isUrlOk(url: string): Promise<boolean> {
  const res = await got.head(url).catch((e) => e)
  return res.statusCode === 200
}

export async function getRepoInfo(
  url: URL,
  examplePath?: string
): Promise<RepoInfo | undefined> {
  const [, username, name, t, _branch, ...file] = url.pathname.split('/')
  const filePath = examplePath ? examplePath.replace(/^\//, '') : file.join('/')

  // Support repos whose entire purpose is to be a NextJS example, e.g.
  // https://github.com/:username/:my-cool-nextjs-example-repo-name.
  if (t === undefined) {
    const infoResponse = await got(
      `https://api.github.com/repos/${username}/${name}`
    ).catch((e) => {
      console.log(`The call to ${`https://api.github.com/repos/${username}/${name}`} got failed with message`, e);
      return e;
    })
    if (infoResponse.statusCode !== 200) {
      console.log(`The call to ${`https://api.github.com/repos/${username}/${name}`} got failed with message`);
      return
    }
    const info = JSON.parse(infoResponse.body)
    return { username, name, branch: info['default_branch'], filePath }
  }

  // If examplePath is available, the branch name takes the entire path
  const branch = examplePath
    ? `${_branch}/${file.join('/')}`.replace(new RegExp(`/${filePath}|/$`), '')
    : _branch

  if (username && name && branch && t === 'tree') {
    return { username, name, branch, filePath }
  }
}

export function hasRepo({
  username,
  name,
  branch,
  filePath,
}: RepoInfo): Promise<boolean> {
  const contentsUrl = `https://api.github.com/repos/${username}/${name}/contents`
  const packagePath = `${filePath ? `/${filePath}` : ''}/package.json`

  return isUrlOk(contentsUrl + packagePath + `?ref=${branch}`)
}

export function downloadAndExtractRepo(
  root: string,
  { username, name, branch, filePath }: RepoInfo
): Promise<void> {
  const sourceLocation = `https://codeload.github.com/${username}/${name}/tar.gz/${branch}`;
  const extractOptions = {
    options: { cwd: root, strip: filePath ? filePath.split('/').length + 1 : 1 },
    fileList: [`${name}-${branch}${filePath ? `/${filePath}` : ''}`]
  };
  console.info(`Downloading tar file from ${sourceLocation}, with options ${JSON.stringify(extractOptions)}`);
  
  return pipeline(
    got.stream(
      sourceLocation
    ),
    tar.extract(
      { cwd: root, strip: filePath ? filePath.split('/').length + 1 : 1 },
      [`${name}-${branch}${filePath ? `/${filePath}` : ''}`]
    )
  )
}

