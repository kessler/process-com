import { ProcessController } from '../../index.mjs'
import { join } from 'node:path'

const controller = await ProcessController.start(join(import.meta.dirname, 'subProcessTest.mjs'))

setTimeout(() => {
  controller.stopChild()
}, 10000)

//marker--
  console.log('file changed at 1760975325994')
  //--marker