// Context lifecycle only: every settled visibility operation reconciles against the latest visibility.
// This also handles a slow suspend finishing after the tab has already become visible again.
export function createAudioSession({ createContext, build, isHidden, onState = () => {}, onError = () => {} }) {
  let ctx = null, graph = null, error = null, disposed = false;
  function publish() { onState({ state: ctx?.state ?? 'none', ready: !!graph, error }); }
  async function sync() {
    const active = ctx;
    if (!active || active.state === 'closed' || disposed) { publish(); return false; }
    const hidden = isHidden(), target = hidden ? 'suspended' : 'running';
    try {
      if (active.state !== target) await active[hidden ? 'suspend' : 'resume']();
      if (ctx !== active || disposed) return false;
      error = null;
      if (hidden !== isHidden()) return sync();
      publish(); return active.state === target;
    } catch (e) {
      if (ctx === active) { error = String(e?.message ?? e); onError(e); publish(); }
      return false;
    }
  }
  function reset() {
    const old = ctx; ctx = null; graph = null; error = null;
    if (old) { old.onstatechange = null; old.close().catch(() => {}); }
    publish();
  }
  function start() {
    if (disposed) return Promise.resolve(false);
    if (ctx?.state === 'closed') reset();
    if (!ctx || !graph) {
      reset();
      try {
        ctx = createContext(); ctx.onstatechange = publish;
        // Unlock inside the initiating gesture, before generating buffers or connecting the graph.
        const unlocked = sync();
        graph = build(ctx);
        publish(); return unlocked;
      } catch (e) {
        reset(); error = String(e?.message ?? e); onError(e); publish();
        return Promise.resolve(false);
      }
    }
    return sync();
  }
  return {
    start, sync, reset,
    get ctx() { return ctx; }, get graph() { return graph; }, get error() { return error; },
    dispose() { disposed = true; reset(); },
  };
}
