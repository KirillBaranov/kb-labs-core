import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { configureLogger, configureFromEnv, addSink, getLogger, createRedactor, jsonSink, stdoutSink } from '..'

describe.sequential('configureFromEnv', () => {
  const orig = { ...process.env }
  afterEach(() => { process.env = { ...orig } })

  it('sets log level and category filter (array)', async () => {
    process.env.LOG_LEVEL = 'debug'
    process.env.LOG_CATEGORY_FILTER = 'a,b'
    configureLogger({ sinks: [], clock: () => new Date('2020-01-01T00:00:00.000Z') })
    configureFromEnv(process.env)
    const records: any[] = []
    addSink({ handle: r => { records.push(r) } })
    getLogger('a').debug('x')
    getLogger('c').debug('y')
    await new Promise(r => setTimeout(r, 0))
    expect(records.length).toBe(1)
    expect(records[0].level).toBe('debug')
    expect(records[0].category).toBe('a')
  })

  it('supports regex category filter', async () => {
    process.env.LOG_LEVEL = 'info'
    process.env.LOG_CATEGORY_FILTER = '/^api:/'
    configureLogger({ sinks: [], clock: () => new Date('2020-01-01T00:00:00.000Z') })
    configureFromEnv(process.env)
    const records: any[] = []
    addSink({ handle: r => { records.push(r) } })
    getLogger('api:get').info('pass')
    getLogger('db').info('skip')
    await new Promise(r => setTimeout(r, 0))
    expect(records.map(r => r.category)).toEqual(['api:get'])
  })
})

describe.sequential('redactor', () => {
  beforeEach(() => {
    configureLogger({ sinks: [], level: 'debug', categoryFilter: /.*/, clock: () => new Date('2020-01-01T00:00:00.000Z') })
  })

  it('applies redaction before fanout', async () => {
    const redact = createRedactor({
      keys: ['token'],
      mask: '***',
    })
    const seen: any[] = []
    configureLogger({ redactor: (r) => redact(r), sinks: [{ handle: r => { seen.push(r) } }] })
    getLogger('x').info('ok', { token: 'secret', keep: 1 })
    await Promise.resolve();
    await new Promise(r => setTimeout(r, 1))
    expect(seen[0].meta).toEqual({ token: '***', keep: 1 })
  })
})

describe.sequential('sinks', () => {
  beforeEach(() => {
    configureLogger({ sinks: [], level: 'debug', categoryFilter: /.*/, clock: () => new Date('2020-01-01T00:00:00.000Z') })
  })

  it('jsonSink writes stable JSON to stdout', async () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true as any)
    addSink(jsonSink)
    getLogger('cat').info('hello', { a: 1 })
    await Promise.resolve();
    await new Promise(r => setTimeout(r, 1))
    expect(spy).toHaveBeenCalled()
    const call = spy.mock.calls[0]?.[0] as string
    const obj = JSON.parse(call.trim())
    expect(obj).toEqual({ time: '2020-01-01T00:00:00.000Z', level: 'info', category: 'cat', msg: 'hello', meta: { a: 1 } })
    spy.mockRestore()
  })

  it('stdoutSink routes based on level and formats line', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
    const dbgSpy = vi.spyOn(console, 'debug').mockImplementation(() => { })

    configureLogger({ level: 'debug' })
    addSink(stdoutSink)

    const l = getLogger('svc')
    l.debug('d')
    l.info('i', { x: 1 })
    l.warn('w')
    l.error('e')
    await Promise.resolve();
    await new Promise(r => setTimeout(r, 1))

    expect(dbgSpy).toHaveBeenCalled()
    expect(logSpy).toHaveBeenCalledWith('[2020-01-01T00:00:00.000Z] INFO svc: i', { x: 1 })
    expect(warnSpy).toHaveBeenCalled()
    expect(errSpy).toHaveBeenCalled()

    logSpy.mockRestore(); warnSpy.mockRestore(); errSpy.mockRestore(); dbgSpy.mockRestore()
  })
})


