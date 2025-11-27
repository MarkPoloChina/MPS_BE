require('fs').writeFileSync('build-info.ts', 'export const BUILD_TIME = ' + JSON.stringify(new Date().toISOString()))
