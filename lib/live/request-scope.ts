/** Guards async work across cancel, navigation, new chat and native pickers. */
export class RequestScope {
  private controller: AbortController | null = null;
  begin() {
    if (this.controller) return null;
    const controller = new AbortController();
    this.controller = controller;
    return {
      signal: controller.signal,
      current: () =>
        this.controller === controller && !controller.signal.aborted,
      finish: () => {
        if (this.controller === controller) this.controller = null;
      },
    };
  }
  cancel() {
    this.controller?.abort();
    this.controller = null;
  }
}
