import { describe, expect, it, vi } from 'vitest'
import { WorkflowJobHandler } from '../../packages/workflow-engine/src/job-handler'
import type { StepExecutionRequest } from '@kb-labs/workflow-runtime'
import type { JobRunnerPresenterEvent } from '@kb-labs/plugin-runtime'

const loggerStub = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}

function createRequest(): StepExecutionRequest {
  return {
    spec: {} as any,
    context: {
      runId: 'run-123',
      jobId: 'job-abc',
      stepId: 'step-xyz',
      attempt: 2,
      env: {},
      secrets: {},
      logger: loggerStub,
      trace: { traceId: 'trace-1', spanId: 'span-1' },
    },
  } as StepExecutionRequest
}

describe('Workflow presenter events', () => {
  it('emits presenter envelope to Redis bridge', async () => {
    const emit = vi.fn().mockResolvedValue(undefined)
    const handler = new WorkflowJobHandler({
      logger: loggerStub as any,
      events: { publish: vi.fn() } as any,
      resolver: { resolve: vi.fn() } as any,
      options: {
        eventsBridge: {
          emit,
        } as any,
      },
    })

    const request = createRequest()
    const event: JobRunnerPresenterEvent = {
      type: 'message',
      text: 'Presenter message',
      timestamp: '2025-01-01T00:00:00.000Z',
      options: { level: 'info' },
    }

    ;(handler as any).forwardPresenterEvent(request, event)

    expect(emit).toHaveBeenCalledTimes(1)
    const [runId, envelope] = emit.mock.calls[0]!
    expect(runId).toBe('run-123')
    expect(envelope.type).toBe('workflow:presenter.message')
    expect(envelope.meta?.runId).toBe('run-123')
    expect(envelope.meta?.jobId).toBe('job-abc')
    expect(envelope.meta?.stepId).toBe('step-xyz')
    expect(envelope.payload).toMatchObject({
      text: 'Presenter message',
      level: 'info',
    })
  })
})


