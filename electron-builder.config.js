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
    // [확인] 이 부분이 아이콘 경로입니다.
    icon: "resources/icon.ico" 
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    shortcutName: "MiniPDM",
    deleteAppDataOnUninstall: true,
    // [추가 가능] 설치 프로그램(Setup.exe) 자체의 아이콘도 바꾸고 싶다면 아래 줄 추가
    // installerIcon: "resources/icon.ico",
    // uninstallerIcon: "resources/icon.ico"
  },
  publish: [
    {
      provider: "github",
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
    }
  ]
};