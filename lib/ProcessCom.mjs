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
      this._log.debug(m, 'onMessage')
      this.emit('$$message', m)
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

  onRequest(event, handler) {
    this.on(event, ({ replyEvent, data }) => {
      if (!replyEvent) {
        throw new Error('must provide replyEvent for request/reply')
      }

      const resolve = (replyData) => this.sendMessage(replyEvent, { data: replyData })
      const reject = (error) => {
        if (error instanceof Error) {
          error = error.message
        }

        this.sendMessage(replyEvent, { error })
      }
      
      handler(data, resolve, reject)
    })
  }

  // @TODO not sure we can allow this
  // onceRequest(event, handler) {
  //   this.once(event, ({ replyEvent, data }) => {
  //     if (!replyEvent) {
  //       throw new Error('must provide replyEvent for request/reply')
  //     }
      
  //     handler(data, (replyData) => {
  //       this.sendMessage(replyEvent, replyData)
  //     })
  //   })
  // }

  sendMessage(event, data) {
    this._log.debug({ event, data }, 'sendMessage')

    if (this._targetProcess.send) {
      this._targetProcess.send(serialize({ event, data }))
    } else {
      console.warn('WARNING: no parent process, messages are sent to a blackhole', event, data)
    }
  }

  sendRequest(event, data) {
    return new Promise((resolve, reject) => {
      const replyEvent = `$$reply::${event}::${Date.now()}::${Math.random()}`
      
      this.once(replyEvent, ({ data, error }) => {
        if (error) {
          reject(new Error(error))
          return
        }

        resolve(data)
      })

      this.sendMessage(event, { data, replyEvent })
    })
  }

  sendReady() {
    this.sendMessage('ready')
  }

  sendKill() {
    this.sendMessage('kill')
  }
}
