import { describe, it, expect } from 'vitest'
import { createRedactor } from '..'

describe('createRedactor', () => {
  it('masks default keys recursively in objects and arrays', () => {
    const redactor = createRedactor()
    const rec = {
      time: 't', level: 'info' as const, msg: 'm',
      meta: {
        token: 'secret',
        apiKey: 'k',
        Authorization: 'hdr',
        nested: { Token: 's2', keep: 1 },
        arr: [{ token: 'a' }, { keep: 2 }],
      }
    }
    const out = redactor(rec as any)
    expect(out.meta).toEqual({
      token: '****', apiKey: '****', Authorization: '****',
      nested: { Token: '****', keep: 1 },
      arr: [{ token: '****' }, { keep: 2 }],
    })
  })

  it('uses custom key list and mask', () => {
    const redactor = createRedactor({ keys: ['password', 'ssn'], mask: '***' })
    const out = redactor({ time: 't', level: 'info', msg: 'm', meta: { password: 'p', SSN: '123', other: 'ok' } } as any)
    expect(out.meta).toEqual({ password: '***', SSN: '***', other: 'ok' })
  })

  it('returns same record when no meta present', () => {
    const redactor = createRedactor()
    const rec = { time: 't', level: 'info' as const, msg: 'm' }
    expect(redactor(rec as any)).toBe(rec)
  })
})


