import { estimatedEndAt } from '../../application/timerExperience'
import type { TimerState } from '../../domain/timer'
import { appDependencies } from '../../app/dependencies'
import { useEffect, useState } from 'react'

export function EstimatedEnd({ timer }: { timer: TimerState }) {
  const [now, setNow] = useState(appDependencies.runtime.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(appDependencies.runtime.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const endAt = estimatedEndAt(timer, now)
  return (
    <p className="estimated-end">
      {endAt === null ? (
        '已暂停 · 继续后更新结束时间'
      ) : (
        <>
          预计{' '}
          <time dateTime={new Date(endAt).toISOString()}>
            {new Date(endAt).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })}
          </time>{' '}
          结束
        </>
      )}
    </p>
  )
}
