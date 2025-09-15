import { basename } from 'node:path'

export default class DefaultLogger {
  #name

  constructor(name) {
    const filename = basename(process.argv[1])
    this.#name = `${name || filename}-${process.pid}:`
  }

  debug(...args) {
    console.debug(this.#name, ...args)
  }
  info(...args) {
    console.info(this.#name, ...args)
  }
  warn(...args) {
    console.warn(this.#name, ...args)
  }
  error(...args) {
    console.error(this.#name, ...args)
  }
}
