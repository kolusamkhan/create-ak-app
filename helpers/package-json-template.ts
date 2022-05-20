export const createPackageJson = async (name: string) => ({
    name,
    version: "0.1.0",
    private: true,
    scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint'
    }
    });

export default createPackageJson;
