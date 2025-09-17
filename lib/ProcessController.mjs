import { fork } from 'child_process'
import DefaultLogger from './DefaultLogger.mjs'
import ProcessCom from './ProcessCom.mjs'

export default class ProcessController {
  constructor(log = new DefaultLogger()) {
    this._processCom = null
    this._process = null
    this._controller = null
    this._processScript = null
    this._log = log
  }

  get com() {
    return this._processCom
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
    this._processCom = new ProcessCom(workerProcess)

    return new Promise((resolve) => {
      // @TODO add error handling for sub process

      this._processCom.once('ready', () => {
        this._log.debug(`${processScript} worker says its ready`)
        resolve()
      })
    })
  }

  waitForCompletion() {
    return new Promise((resolve) => {
      // for now we'll ignore the error event
      this._processCom.once('exit', (code, signal) => resolve(code, signal))
    })
  }

  killChild() {
    if (this._controller) {
      this._processCom = undefined
      this._controller.abort()
      this._controller = undefined
    }
  }

  stopChild() {
    if (this._processCom) {
      this._processCom.sendMessage('stop')
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
