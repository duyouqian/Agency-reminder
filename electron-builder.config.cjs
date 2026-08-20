const branding = require('./branding.json')

module.exports = {
  appId: 'com.duyouqian.agency-reminder',
  productName: branding.displayName,
  icon: 'favicon.ico',
  directories: {
    output: 'release'
  },
  win: {
    icon: 'favicon.ico',
    target: [
      {
        target: 'portable',
        arch: ['x64']
      }
    ],
    signAndEditExecutable: false
  },
  portable: {
    artifactName: branding.artifactName
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true
  },
  files: [
    'dist/**/*',
    'dist-electron/**/*',
    'favicon.ico'
  ]
}
