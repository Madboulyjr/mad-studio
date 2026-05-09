import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'f4pxr4lu',
    dataset: 'production',
  },
  studioHost: 'madboulyjr-studio',
  // Pinning the appId avoids the "which app?" prompt on every `sanity deploy`.
  // Issued by Sanity when the Studio was first registered as a Manage app.
  deployment: {
    appId: 'kh56d2w5voaetfx49qlclub6',
  },
})
