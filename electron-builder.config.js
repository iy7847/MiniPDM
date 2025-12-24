require('dotenv').config();

/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
module.exports = {
  appId: "com.minipdm.app",
  productName: "MiniPDM",
  directories: {
    output: "release"
  },
  files: [
    "dist/**/*",
    "dist-electron/**/*",
    "package.json"
  ],
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"]
      }
    ],
    icon: "resources/icon.ico"
  },
  nsis: {
    oneClick: false, // 사용자에게 설치 옵션 제공 (true면 묻지 않고 설치)
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    shortcutName: "MiniPDM",
    deleteAppDataOnUninstall: true
  },
  // [핵심] .env에서 읽어온 정보로 배포 설정 구성
  publish: [
    {
      provider: "github",
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      // releaseType: "release" // draft(초안) 상태로 올릴지, 바로 release할지 설정 가능
    }
  ]
};