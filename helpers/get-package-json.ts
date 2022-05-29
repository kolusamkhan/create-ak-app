import {JsonValue, loadJsonFileSync} from "load-json-file";
import {resolve, normalize, join} from 'path';

export function getPackageJson( packageJsonPath: string) {
    console.log('getPackageJson:: package.json path',join(packageJsonPath, 'package.json'));
    const result: {[Key in string]?: JsonValue} = loadJsonFileSync(join(packageJsonPath, 'package.json'));
    console.log('package.json result', result);
    return result;
}


export default getPackageJson;