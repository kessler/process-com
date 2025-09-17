# @kessler/process-com

A Node.js library providing simple inter-process communication and child process management utilities. Designed for event-driven messaging between parent and child processes with serialization support.

## Features

- **Event-driven IPC**: Simple EventEmitter-based communication between processes
- **Process Management**: High-level process controller for spawning and managing child processes
- **JSON Serialization**: Built-in serialization/deserialization of complex data structures
- **Graceful Shutdown**: Automatic process cleanup and termination handling
- **Logging**: Integrated logging with process identification
- **ESM Support**: Full ES module compatibility

## Installation

```bash
npm install @kessler/process-com
```

## API Reference

### ProcessCom

The main communication class that extends EventEmitter for bi-directional messaging.

#### Constructor

```js
new ProcessCom(targetProcess, log?)
```

- `targetProcess`: The process to communicate with (child process or `process` for current)
- `log`: Optional logger instance (defaults to `DefaultLogger`)

#### Methods

- `sendMessage(event, data)`: Send a message with event name and data
- `sendRequest(event, data)`: Send a request and return a Promise for the reply
- `onRequest(event, handler)`: Handle request/reply pattern with resolve/reject callbacks
- `sendReady()`: Send a 'ready' event (shorthand)
- `sendKill()`: Send a 'kill' event (shorthand)

#### Events

- Listen for any custom events sent from the other process
- `$$message`: Raw message events (before deserialization)
- `stop`: Automatic process exit handler

### ProcessController

High-level process management for spawning and controlling child processes.

#### Static Methods

```js
const controller = await ProcessController.start(scriptPath, args?, log?)
```

#### Instance Methods

- `start(scriptPath, args?)`: Start a child process and wait for ready signal
- `waitForCompletion()`: Wait for process to exit
- `stopChild()`: Send stop message to child
- `killChild()`: Force terminate the child process

#### Properties

- `comm`: Access to the ProcessCom instance
- `process`: Access to the underlying child process

### DefaultLogger

Simple logging utility with process identification.

```js
const logger = new DefaultLogger(name?)
logger.debug(...args)
logger.info(...args)
logger.warn(...args)
logger.error(...args)
```

## Usage Examples

### Basic Parent-Child Communication

#### Parent Process

```js
import { ProcessController } from '@kessler/process-com'

// Start worker and wait for it to be ready
const controller = await ProcessController.start('./worker.mjs', ['--verbose'])

// Send work to the process
controller.comm.sendMessage('process', {
  files: ['file1.txt', 'file2.txt']
})

// Listen for completion
controller.comm.on('complete', (result) => {
  console.log('Processing complete:', result)
  controller.stopChild()
})

// Wait for process to finish
await controller.waitForCompletion()
console.log('Worker has exited')
```

#### Child Process (worker.mjs)

```js
import { ProcessCom } from '@kessler/process-com'

const comm = new ProcessCom(process)

comm.on('task', async (task) => {
  try {
    // Process the task
    const result = await processTask(task)
    comm.sendMessage('result', { id: task.id, result })
  } catch (error) {
    comm.sendMessage('error', { id: task.id, error: error.message })
  }
})

// Signal that worker is ready
comm.sendReady()

async function processTask(task) {
  // Your task processing logic here
  return `Processed: ${task.data}`
}
```

#### Low level parent process

```js
import { fork } from 'child_process'
import { ProcessCom } from '@kessler/process-com'

const child = fork('./worker.mjs')
const comm = new ProcessCom(child)

comm.on('ready', () => {
  console.log('Worker is ready')
  comm.sendMessage('task', { id: 1, data: 'process this' })
})

comm.on('result', (data) => {
  console.log('Worker completed task:', data)
})

comm.on('error', (error) => {
  console.error('Worker error:', error)
})
```


### Request/Reply Pattern

ProcessCom supports a request/reply pattern for RPC-style communication:

#### Parent Process

```js
import { ProcessController } from '@kessler/process-com'

const controller = await ProcessController.start('./worker.mjs')

// Send a request and wait for reply
try {
  const result = await controller.comm.sendRequest('calculate', { x: 5, y: 3 })
  console.log('Calculation result:', result) // { sum: 8, product: 15 }
} catch (error) {
  console.error('Request failed:', error.message)
}

controller.stopChild()
```

#### Child Process (worker.mjs)

```js
import { ProcessCom } from '@kessler/process-com'

const comm = new ProcessCom(process)

// Handle requests with resolve/reject callbacks
comm.onRequest('calculate', (data, resolve, reject) => {
  try {
    const { x, y } = data
    resolve({
      sum: x + y,
      product: x * y
    })
  } catch (error) {
    reject(error) // Can pass Error object or string
  }
})

// Async handlers are also supported
comm.onRequest('fetchData', async (data, resolve, reject) => {
  try {
    const result = await someAsyncOperation(data)
    resolve(result)
  } catch (error) {
    reject(error)
  }
})

comm.sendReady()
```

### Graceful Shutdown

Child processes automatically handle the 'stop' event:

```js
// In child process
import { ProcessCom } from '@kessler/process-com'

const comm = new ProcessCom(process)

// This will automatically call process.exit(0) when 'stop' is received
// No additional handling needed - it's built into ProcessComm

// Or handle shutdown manually:
comm.on('stop', async () => {
  console.log('Shutting down...')
  await cleanup()
  process.exit(0)
})
```

## Error Handling

The library includes built-in error handling and warnings:

- Warns when trying to send messages to processes without IPC channels
- Handles process exit events automatically
- Provides debug logging for message flow

## Requirements

- Node.js with ES module support
- `@kessler/json` for serialization

## License

UNLICENSED