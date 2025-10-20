import ProcessController from '../lib/ProcessController.mjs'
import { join } from 'path'
import test from 'ava'
import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'

const __dirname = import.meta.dirname
const fixtureDir = join(__dirname, 'fixture')

test('ProcessController starts and stops a child process', async t => {
  t.timeout(5000)
  
  const controller = await ProcessController.start(join(fixtureDir, 'subProcessTest.mjs'), [1, 2, 3])
  
  return new Promise((resolve, reject) => {
    controller.com.on('myChildEvent', async data => {
      t.deepEqual(data, { some: 'child data', args: [ '1', '2', '3' ] })
      controller.stopChild()
      resolve()
    })
    
    controller.com.sendMessage('myMainEvent', { some: 'data' })
  })
})

test('Request/Reply between parent and child process', async t => {
  t.timeout(5000)
  
  const controller = await ProcessController.start(join(fixtureDir, 'subProcessTestRequestReply.mjs'), [1, 2, 3])
  const data = { foo: `${Date.now()}::${Math.random()}` }
  const reply = await controller.com.sendRequest('myApiCall', data)
  t.deepEqual(reply, data)
  controller.stopChild()
})

test('Request/Reply between parent and child process - error', async t => {
  t.timeout(5000)
  
  const controller = await ProcessController.start(join(fixtureDir, 'subProcessTestRequestReplyError.mjs'), [1, 2, 3])
  const data = { foo: `${Date.now()}::${Math.random()}` }
  
  await t.throwsAsync(async () => {
    await controller.com.sendRequest('myApiCallErrorString', data)
  }, { instanceOf: Error })

  await t.throwsAsync(async () => {
    await controller.com.sendRequest('myApiCallError', data)
  }, { instanceOf: Error })
  
  controller.stopChild()
})

test('multiple Request/Reply between parent and child process', async t => {
  t.timeout(5000)
  
  const controller = await ProcessController.start(join(fixtureDir, 'subProcessTestRequestReply.mjs'), [1, 2, 3])
  
  const requests = []
  const expectedResults = []
  for (let i = 0; i < 10; i++) {
    const data = { foo: `${Date.now()}::${Math.random()}` }
    expectedResults.push(data)
    requests.push(controller.com.sendRequest('myApiCall', data))
  }
  
  const replies = await Promise.all(requests)
  for (let i = 0; i < replies.length; i++) {
    t.deepEqual(expectedResults[i], replies[i])
  }
  
  controller.stopChild()
})

test('running node --watch sends watch messages to child process', async t => {
  t.timeout(15000)
  const mainProcessPath = join(fixtureDir, 'mainProcess.mjs')
  const source = await readFile(mainProcessPath, 'utf-8')
  
  const nodeProcess = spawn('node', ['--watch', mainProcessPath], { stdio: 'inherit'})
  
  await sleep(1000)

  const newSource = replaceBetweenMarkers(source, 'marker', `console.log('file changed at ${Date.now()}')`)

  await writeFile(mainProcessPath, newSource, 'utf-8')
  
  await sleep(1000)

  nodeProcess.kill()
  t.pass()
})

test.skip('worker process throws error on initialization', async t => {
  // @TODO: figure out how to catch this error properly
  t.timeout(5000)
  
  try {
    await ProcessController.start(join(fixtureDir, 'subProcessErrorTest.mjs'), [1, 2, 3])
    t.fail('Expected error was not thrown')
  } catch (error) {
    console.error(error)
  }
})

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function replaceBetweenMarkers(source, marker, replacement) {
  const startMarker = `//${marker}--`
  const endMarker = `//--${marker}`
  
  const startIndex = source.indexOf(startMarker)
  const endIndex = source.indexOf(endMarker)
  
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error('Markers not found or invalid in source')
  }
  
  return `${source.slice(0, startIndex + startMarker.length)}
  ${replacement}
  ${source.slice(endIndex)}`
}