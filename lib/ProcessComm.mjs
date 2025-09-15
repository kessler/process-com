import EventEmitter from 'events'
import { deserialize, serialize } from '@kessler/json'
import DefaultLogger from './DefaultLogger.mjs'

/**
 *	used for cp.fork process communication.
 * 	e.g:
 * 
 * 	mainProcess.js
 * 
 *  ```js
 * 	const child = cp.fork(...)
 * 	const comm = new ProcessComm(child, 'child')
 * 	comm.on('myChildEvent', ...)
 * 	comm.on('$$message', ...listen to all messages)	
 * 	comm.sendMessage('myMainEvent', { some: 'data' })
 * 	````
 * 	
 * 	childProcess.js
 * 	```js
 * 	const main = new ProcessComm(process, 'main')
 * 	main.on('myMainEvent', ...)
 * 	main.sendReady()
 * 	main.sendMessage('myChildEvent', someData)
 * 	```
 * 
 * 	consider just using ./lib/ProcessController though...
 */
 export default class ProcessComm extends EventEmitter {
  constructor(targetProcess, log = new DefaultLogger()) {
    super()

    this._targetProcess = targetProcess
    this._log = log

    targetProcess.on('message', m => {
      this.emit('$$message', m)
    })

    targetProcess.on('message', m => {
      this._log.debug(m, 'onMessage')
      const { event, data } = deserialize(m)
      this.emit(event, data)
    })

    this.on('stop', () => {
      // child should not try to kill parent process
      if (targetProcess === process) {
        this._log.debug('got shutdown event, exiting process')
        process.exit(0)
      }
    })
  }

  sendMessage(event, data) {
    this._log.debug({ event, data }, 'sendMessage')

    if (this._targetProcess.send) {
      this._targetProcess.send(serialize({ event, data }))
    } else {
      console.warn('WARNING: no parent process, messages are sent to a blackhole', event, data)
    }
  }

  sendReady() {
    this.sendMessage('ready')
  }

  sendKill() {
    this.sendMessage('kill')
  }
}
