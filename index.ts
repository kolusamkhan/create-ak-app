#!/usr/bin/env node
import {resolve, basename, dirname, delimiter, join, sep} from 'path';
import {fileURLToPath} from 'url';
import chalk from 'chalk';
import {program} from 'commander';
import prompts from 'prompts';
import updateCheck from 'update-check';
import {getPackageJson} from './helpers/get-package-json.js';
import { validateNpmName } from './helpers/validate-pkg.js';
import { getPkgManager } from './helpers/get-pkg-manager.js';
import {createApp} from './create-app.js';

//console.log(`Running version 1.0.50`, delimiter, sep);
//console.log(import.meta);
const filePath = fileURLToPath(import.meta.url);
const buildDir = dirname(filePath); //__dirname;

let packageJson: any;
let name:string = 'create-ak-app', version : string = '1.0.0';
try{
    packageJson = getPackageJson(buildDir);
    name = packageJson.name;
    version = packageJson.version;
}
catch(e) {
    console.error(e);
}
//console.log(packageJson, name, version);

let projectPath: string = '';
debugger;
program.name(name)
    .version(version)
    .arguments('<project-directory>')
    .usage(`<project-directory> [options]`)
    .action((name)=>{
        //console.log('name in action handler', name);
        projectPath = name
    })
    .option('-ts, --typescript',
     `
     Initialize as a Typescript project.
     `
     )
     .option('--use-npm', 
     `
     Explicitly tell the CLI to bootstrap the app using npm
     `
     )
     .option('--use-pnpm', 
     `
     Explicitly tell the CLI to bootstrap the app using pnpm
     `
     )
     .option('-e, --example [github-url]',
     `
      Tell to use github url to initialise the app by -e y or --example yes. 
     `
     )
     .option('--example-path [path-to-example]',
     `
      Github url to initialise the app from.
     `
     )
     .allowUnknownOption()
     .parse(process.argv);

      // utility to check the latest version of the package (create-ak-app)
      async function checkLatest() {
        try {
            const results =  await updateCheck(packageJson);
            return results;
        } catch (error) {
            if(error)
                console.log(`An error occured on checkLastest`, error);
                return null;
        } 
     }
     
     const notifyUpdate = async (): Promise<void> => {
         try {
           const packageManager = getPkgManager();

           const res = await checkLatest();
           if(!!res && res.latest){ //res!.latest res?.latest
               console.log();
               console.log(`${chalk.yellow.bold('A new version of node-experiments available.')}`)
               const packageUpdateMessage = packageManager === 'yarn'? 'yarn add -global create-ak-apps': `${packageManager} install create-ak-apps --global`
               console.log(`
               You can update by running 
               ${chalk.cyan(packageUpdateMessage)}
               `)
               console.log()
           }
           console.log(`Terminates the application normally.`)
           process.exit();
         }
         catch(e){
            console.log(`Terminates the application abnormally.`)
            process.exit(1);
         }
     }

     async function run(): Promise<void> {
       //Step 1. Get project directory  
        //validate directory name
        if(typeof projectPath === 'string')
            projectPath = projectPath.trim()
        
        if(!projectPath) {
            const res = await prompts({
                type: "text",
                name: "path",
                message: "What is your project named?",
                initial : "my-app",
                validate: (name)=>{
                    console.log('project name entered', name);
                    const validation = validateNpmName(name);
                    if(validation.valid)
                        return true;
                    return 'Invalid project name :' + validation.problems![0];
                }
            })

            if(typeof res.path === 'string')
                projectPath = res.path.trim()

            console.log('Prompts response', res);
        }

        if(!projectPath){
            console.log();
            console.log('Please specify the project directory:');
            console.log(` ${chalk.cyan(program.name())} ${chalk.green('my-next-app')} `)

            console.log()
            console.log(`Run ${chalk.cyan(`${program.name()} --help`)} to see all options.`)
            console.log();
            process.exit(1);
        }

        //Step 2. Validate project directory for naming conventions
        const resolvedProjectPath = resolve(projectPath);
        const projectName = basename(resolvedProjectPath);
        const {valid, problems} = validateNpmName(projectName);
        if(!valid) {
            console.error(`
            Could not create a project called ${chalk.red(`"${projectName}"`)}
             because of npm naming restrictions:
            `)

            problems!.forEach(error =>{
                console.error(`
                ${chalk.red.bold('*')} ${error}
                `)
            })
            process.exit(1);
        }

        //Step 3. Decide package manager to use
        const options = program.opts();
        const packageManager = !!options.useNpm?'npm': !!options.usePnpm?'pnpm': getPkgManager();
        const typescript : boolean = !!options.typescript;
        console.log(`
        ${chalk.cyan('Package Manager')} ${packageManager}
        `);

        //Step 4. is github url given for source app
       let examplePath;
       if(options.example) {
           if(!options.examplePath) {
            const res = await prompts({
                type: "text",
                name: "examplePath",
                message: "What is your example github url ?",
                initial : "",
                validate: (name)=>{
                    console.log('github url entered', name);
                    return true;
                    /*const validation = validateNpmName(name);
                    if(validation.valid)
                        return true;
                    return 'Invalid project name :' + validation.problems![0];
                    */
                }
            })

            if(typeof res.examplePath === 'string')
                examplePath = res.examplePath.trim()

            console.log('Prompts response for example', res.examplePath);
           }
           else {
                examplePath = options.examplePath.trim()
           }
       }
       //debug example, example path
       //console.info(options);
       const execContext = buildDir; 
       if(!!examplePath) {
        console.log(`download example from github location ${examplePath}`);
        await createApp({
            appName: projectName,
            packageManager,
            typescript, 
            execContext,
            example: options.example && options.example !== 'default'?options.example: undefined,
            examplePath
        });
       }
       else {
           await createApp({
                appName: projectName,
                packageManager,
                typescript, 
                execContext,
                example: options.example && options.example !== 'default'?options.example: undefined,
                examplePath
            });
       }
     }  

     run()
     .then(notifyUpdate)
     .catch(async(reason)=>{
        console.log();
        console.log('Aborting installation.')
        console.log(reason)
        console.log();
        await notifyUpdate();
        process.exit(1);
     });

     

