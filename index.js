const { Toolkit } = require('actions-toolkit')
const { execSync } = require('child_process')

// Run your GitHub Action!
Toolkit.run(async tools => {
  console.log('context:', tools.context)

  const pkg = tools.getPackageJSON()
  const event = tools.context.payload
  console.log('event:', event)

  const messages = event.commits.map(commit => commit.message + '\n' + commit.body)

  const commitMessage = 'version bump to'
  const isVersionBump = messages.map(message => message.toLowerCase().includes(commitMessage)).includes(true)
  if (isVersionBump) {
    tools.exit.neutral('No _action_ necessary!')
    return
  }

  let version = 'patch'
  if (messages.map(message => message.includes('BREAKING CHANGE')).includes(true)) {
    version = 'major'
  } else if (messages.map(message => message.toLowerCase().startsWith('feat')).includes(true)) {
    version = 'minor'
  }

  const exec = str => {
    return process.stdout.write(execSync(str))
  }

  try {
    const current = pkg.version.toString()
    exec('git checkout master')
    exec(`npm version --allow-same-version=true --git-tag-version=false ${current} `)
    console.log('current:', current, '/', 'version:', version)
    const newVersion = execSync(`npm version --git-tag-version=false ${version}`).toString()
    console.log('new version:', newVersion)
    exec(`git commit -a -m 'ci: ${commitMessage} ${newVersion}'`)

    const remoteRepo = `https://${process.env.GITHUB_ACTOR}:${process.env.GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git`
    console.log('remoteRepo:', remoteRepo)

    exec(`git tag ${newVersion}`)
    exec(`git push "${remoteRepo}" --follow-tags`)
    exec(`git push "${remoteRepo}" --tags`)
  } catch (e) {
    tools.exit.failure(`Failed: ${e.toString()}`)
  }
  tools.exit.success('Version bumped!')
})