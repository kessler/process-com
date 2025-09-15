import { fork } from 'child_process'
import DefaultLogger from './DefaultLogger.mjs'
import ProcessComm from './ProcessComm.mjs'

export default class ProcessController {
  constructor(log = new DefaultLogger()) {
    this._processComm = null
    this._process = null
    this._controller = null
    this._processScript = null
    this._log = log
  }

  get comm() {
    return this._processComm
  }

  get process() {
    return this._process
  }

  async start(processScript, args = []) {
    if (processScript === undefined) {
      throw new Error('must specify process script')
    }

    this._processScript = processScript

    this._controller = new AbortController()

    const { signal } = this._controller

    const workerProcess = this._process = fork(processScript, args, { signal })
    this._processComm = new ProcessComm(workerProcess)

    return new Promise((resolve) => {
      // @TODO add error handling for sub process

      this._processComm.once('ready', () => {
        this._log.debug(`${processScript} worker says its ready`)
        resolve()
      })
    })
  }

  waitForCompletion() {
    return new Promise((resolve) => {
      // for now we'll ignore the error event
      this._processComm.once('exit', (code, signal) => resolve(code, signal))
    })
  }

  killChild() {
    if (this._controller) {
      this._processComm = undefined
      this._controller.abort()
      this._controller = undefined
    }
  }

  stopChild() {
    if (this._processComm) {
      this._processComm.sendMessage('stop')
    }
  }

  _bufferStream(streamSymbol) {
    return async function* (stream) {
      for await (const chunk of stream) {
        this[streamSymbol].push(chunk)
      }
    }.bind(this)
  }

  static async start(processScript, args, log) {
    const controller = new ProcessController(log)
    await controller.start(processScript, args)
    return controller
  }
}
