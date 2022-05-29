import { exec, execSync } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { appendFileSync, unlinkSync, rmdirSync } from "fs";
import { dir } from "console";

const execPromise = promisify(exec);
export async function runShellCmd(command : string) {
  try {
    const { stdout, stderr } = await execPromise(command);
    console.log(stdout);
    console.log(stderr);
  } catch {
    (err: unknown) => {
      console.error(err);
    };
  }
}

export function runShellCmdSync(command : string, directory: string = process.cwd()) {
    try {
      console.log(`Executing command ${command} at directory ${directory}`);
      const stdout = execSync(command,
        {
          stdio: 'inherit',
          cwd: directory
        }
        );
      console.log(stdout);
      console.log("End:::");
    } catch {
      (err: unknown) => {
        console.error(err);
      };
    }
  }



export default runShellCmd;