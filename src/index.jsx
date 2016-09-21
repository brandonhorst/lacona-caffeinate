/** @jsx createElement */
import { createElement } from 'elliptical'
import { BooleanCommand, BooleanSetting } from 'lacona-phrases'
import { showNotification } from 'lacona-api'
import { spawn } from 'child_process'
import { join } from 'path'
import { tmpdir } from 'os'
import isRunning from 'is-running'
import fs from 'fs'

function getPIDPath () {
  return join(tmpdir(), '.lacona-caffeinate.pid')
}

function readFile (file) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf8', (err, contents) => {
      err ? reject(err) : resolve(contents)
    })
  })
}

function writeFile (file, content) {
  return new Promise((resolve, reject) => {
    fs.writeFile(file, content, (err) => {
      err ? reject(err) : resolve()
    })
  })
}

async function getCurrentPID () {
  // get the pid file path
  const pidFilePath = getPIDPath()

  // try to read it
  let existingPID = null
  try {
    existingPID = await readFile(pidFilePath)
  } catch (e) {}

  // if we got a pid, see if it actually exists
  if (existingPID && !isRunning(existingPID)) {
    existingPID = null
  }

  return existingPID
}

async function setCurrentPID (pid) {
  // get the pid file path
  const pidFilePath = getPIDPath()

  await writeFile(pidFilePath, pid.toString())
}

async function setCaffeinate (enabled) {
  try {
    const existingPID = await getCurrentPID()

    if (enabled) {
      // if it's already running, we don't need to do anything
      if (existingPID) {
        await showNotification({title: 'Caffeinate', subtitle: 'Caffeinate was already enabled'})
        return
      }

      const proc = spawn('/usr/bin/caffeinate')
      const pid = proc.pid

      await setCurrentPID(pid)
      await showNotification({title: 'Caffeinate', subtitle: 'Enabling Caffeinate'})
    } else {
      if (existingPID) {
        process.kill(existingPID, 'SIGINT')
        await showNotification({title: 'Caffeinate', subtitle: 'Disabling Caffeinate'})
      } else {
        await showNotification({title: 'Caffeinate', subtitle: 'Caffeinate was not enabled'})
      }
    }
  } catch (e) {
    console.error(e)
    await showNotification({title: 'Caffeinate', subtitle: 'An error occurred with Caffeinate'})
  }
}

async function isCaffeinated () {
  const existingPID = await getCurrentPID()

  return !!existingPID
}

function wrapSetting (element, props) {
  return <placeholder argument='setting' suppressEmpty={props.suppressEmpty}>{element}</placeholder>
}

export const CaffeinateSetting = {
  extends: [BooleanSetting],

  setSetting: setCaffeinate,

  getSetting: isCaffeinated,

  describe ({props}) {
    return wrapSetting(<literal text='caffeinate'/>, props)
  }
}

export const CaffeinateCommand = {
  extends: [BooleanCommand],

  execute: setCaffeinate,

  describe ({props}) {
    return <list limit={2} items={[
      {text: 'caffeinate', value: true},
      {text: 'uncaffeinate', value: false},
      {text: 'decaffeinate', value: false},
      {text: 'stop sleep', value: true},
      {text: 'prevent sleep', value: true},
      {text: 'allow sleep', value: false},
      {text: 'permit sleep', value: false}
    ]} />
  }
}

export const extensions = [CaffeinateCommand, CaffeinateSetting]
