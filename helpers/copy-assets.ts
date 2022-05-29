import cpy from 'cpy';
import { truncate } from 'fs';
import { format, join } from 'path';

/**
 * 
 * @param {*} source = '**' -- to copy all 
 * @param {*} destination 
 * @param {*} execContext 
 */
export const copyStaticAssets = async (source = '**', destination:string, execContext:string)=>{
    console.log(`Copying Files from ${source}, to ${destination}, with context ${execContext}`);
    await cpy(source, destination, {
        parents: true,
        cwd: join(execContext),
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
        }
    }).on('progress', (progress)=>{
        const {completedFiles, totalFiles, completedSize, percent} = progress;
        let completed = Math.fround(percent * 100).toFixed(2);
        //console.log(completedFiles, totalFiles, completedSize, percent)
        console.log(`Copying1 Files ${completed} % completed `);
    })
}
export default copyStaticAssets;
