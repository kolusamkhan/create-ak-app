import { resolve, basename, dirname, join } from 'path';
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
export async function createApp({ appName, packageManager, typescript }: { appName: string, packageManager: PackageManager, typescript: boolean }): Promise<void> {

    //step 1. decide project template
    const projectTemplate = typescript ? 'typescript' : 'default';

    //step 2. validate the location 
    const projectPath = resolve(appName); //including application folder.
    const rootDir = dirname(projectPath); // parent path

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
    const useYarn = packageManager === 'yarn';
    const isOnline = packageManager !== 'yarn' || await getOnline();
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
    console.log('copying to', projectPath);
    await cpy('**', projectPath, {
        parents: true,
        cwd: join(rootDir, 'templates', projectTemplate),
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