// eslint-disable-next-line import/no-extraneous-dependencies
//import validateProjectName from 'validate-npm-package-name';

function validateProjectName(name: string) {
  console.log(name);
  return { validForNewPackages: true, errors: [], warnings: [] }
}

export function validateNpmName(name: string): {
  valid: boolean
  problems?: string[]
} {
  const nameValidation = validateProjectName(name)
  if (nameValidation.validForNewPackages) {
    return { valid: true }
  }

  return {
    valid: false,
    problems: [
      ...(nameValidation.errors || []),
      ...(nameValidation.warnings || []),
    ],
  }
}

export default validateNpmName;
