import { Request, Response, NextFunction } from 'express';
// SQLite deployment contract: one server process, one persistent volume.
// Serialize mutating requests, including document line edits, through response finish.
let tail: Promise<void> = Promise.resolve();
export async function writeQueue(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const previous = tail;
  let release!: () => void;
  tail = new Promise<void>(resolve => { release = resolve; });
  await previous;
  if (res.destroyed) { release(); return; }
  res.once('finish', release);
  const end = res.end;
  res.end = function (this: Response, ...args: any[]) {
    try { return (end as any).apply(this, args); } finally { release(); }
  } as typeof res.end;
  // The handler may still be running after a disconnect; never release early.
  next();
}
