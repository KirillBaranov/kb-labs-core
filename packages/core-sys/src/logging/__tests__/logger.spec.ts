import { describe, it, expect, beforeEach } from 'vitest'
import { configureLogger, setLogLevel, addSink, getLogger } from '..'

function makeRecord() {
  const records: any[] = []
  const sink = { handle: (r: any) => { records.push(r) } }
  return { records, sink }
}

describe.sequential('logging', () => {
  beforeEach(() => {
    configureLogger({ level: 'info', sinks: [], redactor: undefined, categoryFilter: /.*/, clock: () => new Date('2020-01-01T00:00:00.000Z') })
  })

  it('respects log level thresholds', async () => {
    const { records, sink } = makeRecord()
    addSink(sink as any)
    const log = getLogger('test')
    log.debug('d')
    log.info('i')
    log.warn('w')
    log.error('e')
    await Promise.resolve();
    await new Promise((r) => {
      setTimeout(r, 1);
    })
    expect(records.map(r => r.level)).toEqual(['info', 'warn', 'error'])
  })

  it('supports changing level at runtime', async () => {
    const { records, sink } = makeRecord()
    addSink(sink as any)
    setLogLevel('debug')
    const log = getLogger('cat')
    log.debug('ok')
    await Promise.resolve();
    await new Promise((r) => {
      setTimeout(r, 1);
    })
    expect(records[0].level).toBe('debug')
  })

  it('category filter prevents emission when not allowed', async () => {
    const { records, sink } = makeRecord()
    configureLogger({ categoryFilter: ['allowed'] })
    addSink(sink as any)
    getLogger('blocked').info('no')
    getLogger('allowed').info('yes')
    await new Promise((r) => {
      setTimeout(r, 0);
    })
    expect(records.length).toBe(1)
    expect(records[0].category).toBe('allowed')
  })

  it('child logger inherits category and merges meta', async () => {
    const { records, sink } = makeRecord()
    addSink(sink as any)
    const root = getLogger('root')
    const child = root.child({ meta: { a: 1 } })
    child.info('msg', { b: 2 })
    await new Promise((r) => {
      setTimeout(r, 0);
    })
    expect(records[0]).toBeDefined()
    expect(records[0].category).toBe('root')
    expect(records[0].meta).toEqual({ a: 1, b: 2 })
  })

  it('captures errors when Error instance provided', async () => {
    const { records, sink } = makeRecord()
    addSink(sink as any)
    const err = new Error('boom')
    getLogger('x').error('oops', err)
    await new Promise((r) => {
      setTimeout(r, 0);
    })
    expect(records[0]).toBeDefined()
    expect(records[0].err?.message).toBe('boom')
  })
})


