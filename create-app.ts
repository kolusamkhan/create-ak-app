import { resolve, basename, dirname, join } from 'path';
import retry from 'async-retry';
import chalk from "chalk";
import cpy from 'cpy'
import { isWriteable } from './helpers/is-writeable.js';
import { makeDir } from './helpers/make-dir.js';
import { isFolderEmpty } from './helpers/is-folder-empty.js';
import { createPackageJson } from './helpers/package-json-template.js';
import fs, { cpSync, fstat } from 'fs';
import { EOL } from 'os';
import { install } from './helpers/install.js';
import { getOnline } from './helpers/is-online.js';
import type { PackageManager } from './helpers/get-pkg-manager.js';
import { tryGitInit } from './helpers/git.js';
import { getRepoInfo, hasRepo, RepoInfo, hasExample } from './helpers/examples.js';
import { downloadAndExtractRepo } from './helpers/examples.js';
import {DownloadError} from './helpers/download-error.js';

export async function createApp({ appName, packageManager, typescript, execContext, example, examplePath }: { appName: string, packageManager: PackageManager, typescript: boolean, execContext:string, example: string, examplePath: string | undefined }): Promise<void> {

    //step to validate git url provided

    let repoUrl : URL | undefined;
    let repoInfo: RepoInfo| undefined;
    const useYarn = packageManager === 'yarn';
    const isOnline = packageManager !== 'yarn' || await getOnline();
    if(example) {
        //validate url
        try {
            repoUrl = new URL(example);

        } catch (error:any) {
            if(error.code !== 'ERR_INVALID_URL') {
                console.error(error);
                process.exit(1);
            }
            console.log();
            console.error(error);
            console.log();
        }
    }

    if(repoUrl) {
        //validate only to support github.com hosted repo
        if(repoUrl.origin!== 'https://github.com') {
            console.error(`
            We found invalid Github url ${chalk.cyan(`${repoUrl}`)}. 
            Please fix the URL and try again.
            `)
            process.exit(1);
        }

        // is it valid repo
        repoInfo = await getRepoInfo(repoUrl, examplePath);
        if(!repoInfo) {
            console.error(`
            We found invalid Github url ${chalk.cyan(`${repoUrl}`)}. 
            Please fix the URL and try again.
            `)
            process.exit(1);
        }

        const found = await hasRepo(repoInfo);
        if(!found) {
            console.error(`
            We are not able to get the repository for ${chalk.cyan(`${examplePath}`)}. 
            Please check that whether repository exists and then try again.
            `)
            process.exit(1);
        }

    }


    //step 1. decide project template
    const projectTemplate = typescript ? 'typescript' : 'default';

    //step 2. validate the location 
    const projectPath = resolve(appName); //including application folder.
    const rootDir = dirname(projectPath); // parent path

    console.log(`create-app projectpath = ${projectPath}, rootDir = ${rootDir}`);

    //step 3. check whether project path is writable
    if (!isWriteable(rootDir)) {
        console.log('The application path is not writtable, please check the folder permission and try again.')
        process.exit(1);
    }

    //step 4. create directory 
    await makeDir(projectPath);
    if (!isFolderEmpty(projectPath, appName)) {
        console.log('Application folder is not empty.');
        process.exit(1);
    }

    //step 5. change to root directory
    const currentDirectory = process.cwd();
    process.chdir(projectPath);

    const getRepoInfoDetails = (repoInfo : RepoInfo)=>JSON.stringify(repoInfo);

    if(repoInfo) {
        const repoInfo2 = repoInfo;
        console.log(`
        Downloading files from rep`, chalk.cyan(getRepoInfoDetails(repoInfo)));
        try {
            await retry(()=>downloadAndExtractRepo(projectPath, repoInfo2), {})
        } catch (error) {
            function isErrorLike(err: unknown): err is { message: string } {
                return (
                  typeof err === 'object' &&
                  err !== null &&
                  typeof (err as { message?: unknown }).message === 'string'
                )
              }
              throw new DownloadError(
                isErrorLike(error) ? error.message : error + ''
              ) 
        }
        // Copy our default `.gitignore` if the application did not provide one
        const ignorePath = join(projectPath, '.gitignore')
        if (!fs.existsSync(ignorePath)) {
        fs.copyFileSync(
            join(execContext, 'templates', projectTemplate, 'gitignore'),
            ignorePath
        )
        }

        // Copy default `next-env.d.ts` to any example that is typescript
        const tsconfigPath = join(projectPath, 'tsconfig.json')
        if (fs.existsSync(tsconfigPath)) {
        fs.copyFileSync(
            join(execContext, 'templates', 'typescript', 'next-env.d.ts'),
            join(execContext, 'next-env.d.ts')
        )
        }

        console.log('Installing packages. This might take a couple of minutes.')
        console.log()

        await install(projectPath, null, { packageManager, isOnline })
        console.log()
    }
    else {
        //step 6. Initialise project by creating package.json
        const packageJson = await createPackageJson(appName);
        fs.writeFileSync(join(projectPath, 'package.json'), JSON.stringify(packageJson, null, 2) + EOL)
    
        //step 7. install dependencies
    
        //dependency
        const dependencies = ['react', 'react-dom', 'next'];
    
        //dev dependency
        const devDependencies = ['eslint'] //, 'es-lint-config-next'];
    
        //typescript dependencies
        if (typescript) {
            devDependencies.push(
                'typescript',
                '@types/react',
                '@types/react-dom',
                '@types/node'
            )
        }
    
    
    
        // install Flags
       
        const installFlags = { packageManager, isOnline }
        // install dependencies
    
        if (dependencies) {
            console.log('Installing dependencies...');
            for (const dependency of dependencies) {
                console.log(`- ${chalk.cyan(dependency)}`)
            }
            console.log()
    
            await install(projectPath, dependencies, installFlags);
        }
    
        //install devDependencies
        if (devDependencies) {
            console.log('Installing devDependencies');
            for (const devDependency of devDependencies) {
                console.log(`- ${chalk.cyan(devDependency)}`);
            }
            console.log();
            await install(projectPath, devDependencies, { ...installFlags, devDependencies: true });
        }
        console.log();
    
        //Copy project files from local folder
        const sourcePath = join(execContext, 'templates', projectTemplate);
        console.log(`From ${sourcePath}, copying to ${projectPath}`);
    
        await cpy('**', projectPath, {
            parents: true,
            cwd: join(execContext, 'templates', projectTemplate),
            rename: (name) => {
                switch (name) {
                    case 'gitignore':
                    case 'eslintrc.json': {
                        return '.'.concat(name)
                    }
                    case 'README-template.md': {
                        return 'README.md'
                    }
                    default: {
                        return name
                    }
                }
            },
        })
    }

    const gitStatus = tryGitInit(projectPath);
    if (gitStatus) {
        console.log('Initialised a git repository');
        console.log();
    }

    console.log(`${chalk.green('Success!')} Created ${appName} at ${projectPath}`)
    console.log('Inside that directory, you can run several commands:')
    console.log()
    console.log(chalk.cyan(`  ${packageManager} ${useYarn ? '' : 'run '}dev`))
    console.log('    Starts the development server.')
    console.log()
    console.log(chalk.cyan(`  ${packageManager} ${useYarn ? '' : 'run '}build`))
    console.log('    Builds the app for production.')
    console.log()
    console.log(chalk.cyan(`  ${packageManager} start`))
    console.log('    Runs the built app in production mode.')
    console.log()
    console.log('We suggest that you begin by typing:')
    console.log()
    console.log(chalk.cyan('  cd'), projectPath)
    console.log(
        `  ${chalk.cyan(`${packageManager} ${useYarn ? '' : 'run '}dev`)}`
    )
    console.log()
}

export default createApp;