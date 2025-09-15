import ProcessController from '../lib/ProcessController.mjs'
import { join } from 'path'
import test from 'ava'

const __dirname = import.meta.dirname
const fixtureDir = join(__dirname, 'fixture')

test('ProcessController starts and stops a child process', async t => {
  t.timeout(5000)
  
  const controller = await ProcessController.start(join(fixtureDir, 'subProcessTest.mjs'), [1, 2, 3])
  
  return new Promise((resolve, reject) => {
    controller.comm.on('myChildEvent', async data => {
      t.deepEqual(data, { some: 'child data', args: [ '1', '2', '3' ] })
      controller.stopChild()
      resolve()
    })
    
    controller.comm.sendMessage('myMainEvent', { some: 'data' })
  })
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