/** Pure Live turn coordinator: one request at a time, no stale speech after cancellation. */
export type LiveState = "idle" | "listening" | "thinking" | "speaking";
export type LiveImage = {
  data: string;
  media_type: "image/jpeg" | "image/png" | "image/webp";
};
export type LiveMessage = {
  role: "user" | "assistant";
  content:
    | string
    | (
        | { type: "text"; text: string }
        | { type: "image"; source: LiveImage & { type: "base64" } }
      )[];
};
export type LiveSnapshot = {
  state: LiveState;
  step: number;
  subtitle: string;
  error: boolean;
};

export function clampStep(step: number, total: number) {
  return Math.min(
    Math.max(0, Number.isFinite(step) ? Math.floor(step) : 0),
    Math.max(0, total - 1),
  );
}

export function stepCommand(
  text: string,
  current: number,
  total: number,
): number | null {
  const s = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.!?,]/g, "")
    .trim();
  // Exact commands only: “ne passe pas à l’étape suivante” must not advance.
  if (
    /^(?:etape suivante|prochaine etape|next step|suivant|next)(?: s'il te plait| please)?$/.test(
      s,
    )
  )
    return clampStep(current + 1, total);
  if (
    /^(?:etape precedente|previous step|go back|reviens)(?: s'il te plait| please)?$/.test(
      s,
    )
  )
    return clampStep(current - 1, total);
  if (
    /^(?:repete|relis|repeat|repeat step|repete l'etape)(?: s'il te plait| please)?$/.test(
      s,
    )
  )
    return current;
  return null;
}

export function textOnly(message: LiveMessage): LiveMessage {
  return {
    ...message,
    content:
      typeof message.content === "string"
        ? message.content
        : message.content
            .filter((b) => b.type === "text")
            .map((b) => b.text)
            .join("\n"),
  };
}

type Dependencies = {
  steps: string[];
  initialStep: number;
  ask: (
    messages: LiveMessage[],
    step: number,
    signal: AbortSignal,
  ) => Promise<string>;
  speak: (text: string, signal: AbortSignal) => Promise<void>;
  change: (state: LiveSnapshot) => void;
  errorText: (error: unknown) => string;
};

export class LiveSession {
  snapshot: LiveSnapshot;
  history: LiveMessage[] = [];
  private turn = 0;
  private controller: AbortController | null = null;
  private busy = false;
  private deps: Dependencies;
  constructor(deps: Dependencies) {
    this.deps = deps;
    this.snapshot = {
      state: "idle",
      step: clampStep(deps.initialStep, deps.steps.length),
      subtitle: "",
      error: false,
    };
  }
  private update(value: Partial<LiveSnapshot>) {
    this.snapshot = { ...this.snapshot, ...value };
    this.deps.change(this.snapshot);
  }
  listen() {
    if (this.busy && this.snapshot.state !== "speaking") return false;
    this.cancel();
    this.update({ state: "listening", subtitle: "", error: false });
    return true;
  }
  preparing() {
    if (this.snapshot.state === "listening") this.update({ state: "thinking" });
  }
  notice(text: string) {
    this.update({ subtitle: text, error: true });
  }
  cancel(message = "") {
    this.turn++;
    this.controller?.abort();
    this.controller = null;
    this.busy = false;
    this.update({ state: "idle", subtitle: message, error: false });
  }
  async submit(text: string, image?: LiveImage): Promise<boolean> {
    if (this.busy) return false;
    text = text.trim().slice(0, 2000);
    if (!text) {
      this.update({ state: "idle" });
      return false;
    }
    this.controller?.abort();
    const ctrl = new AbortController();
    this.controller = ctrl;
    const turn = ++this.turn;
    this.busy = true;
    const command = image
      ? null
      : stepCommand(text, this.snapshot.step, this.deps.steps.length);
    const fresh = () => turn === this.turn && !ctrl.signal.aborted;
    this.update({ state: "thinking", subtitle: "", error: false });
    try {
      let answer: string;
      if (command !== null) {
        this.update({ step: command });
        answer = this.deps.steps[command] ?? "";
      } else {
        const user: LiveMessage = {
          role: "user",
          content: image
            ? [
                { type: "text", text },
                { type: "image", source: { type: "base64", ...image } },
              ]
            : text,
        };
        // Three full turns, text only. Past photos are never resent or retained.
        const context = [...this.history.slice(-6).map(textOnly), user];
        answer = (
          await this.deps.ask(context, this.snapshot.step, ctrl.signal)
        ).trim();
        if (!fresh()) return false;
        if (!answer) throw new Error("empty-response");
        this.history = [
          ...context.map(textOnly),
          { role: "assistant" as const, content: answer },
        ].slice(-20);
      }
      if (!fresh()) return false;
      this.update({ state: "speaking", subtitle: answer });
      await this.deps.speak(answer, ctrl.signal);
      if (fresh()) this.update({ state: "idle" }); // Keep the answer visible after TTS.
      return true;
    } catch (error) {
      if (fresh())
        this.update({
          state: "idle",
          subtitle: this.deps.errorText(error),
          error: true,
        });
      return false;
    } finally {
      if (fresh()) {
        this.busy = false;
        this.controller = null;
      }
    }
  }
  goToStep(step: number) {
    this.cancel();
    this.update({ step: clampStep(step, this.deps.steps.length) });
  }
}

/** Handles interim → final ordering and cumulative vs segmented native transcripts. */
export class SpeechTranscript {
  private final = "";
  private interim = "";
  reset() {
    this.final = "";
    this.interim = "";
  }
  result(text: string, isFinal: boolean) {
    text = text.trim();
    if (!text) return;
    if (!isFinal) {
      this.interim = text;
      return;
    }
    this.final = this.join(this.final, text);
    this.interim = "";
  }
  private join(a: string, b: string) {
    if (!a || b.startsWith(a)) return b;
    if (!b || a.endsWith(b)) return a;
    return `${a} ${b}`;
  }
  value() {
    return this.join(this.final, this.interim).slice(0, 2000);
  }
}
