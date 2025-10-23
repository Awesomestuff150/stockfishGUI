const SUPPORTED_EXTENSIONS = ['js', 'mjs', 'worker'];

function inferExtension(name) {
  const match = /\.([^.]+)$/.exec(name);
  return match ? match[1].toLowerCase() : '';
}

export class EngineController {
  constructor({ onMessage, onError } = {}) {
    this.onMessage = onMessage;
    this.onError = onError;
    this.engine = null;
    this.source = null;
    this._boundMessage = null;
    this._boundError = null;
  }

  useBundled(label = 'Bundled Stockfish.js') {
    if (typeof Stockfish !== 'function') {
      throw new Error('Bundled Stockfish engine is unavailable.');
    }
    const instance = Stockfish();
    this.#attach(instance, { type: 'bundled', label });
    return this.getCurrentSource();
  }

  async useCustomFile(file) {
    const extension = inferExtension(file.name);
    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      throw new Error(
        `Unsupported engine file type: ${file.name}. Provide a JavaScript Web Worker (.js, .mjs, .worker).`
      );
    }

    const buffer = await file.arrayBuffer();
    const blob = new Blob([buffer], { type: file.type || 'application/javascript' });
    const objectUrl = URL.createObjectURL(blob);

    let worker;
    try {
      worker = new Worker(objectUrl);
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      throw error;
    }

    this.#attach(worker, { type: 'custom', label: file.name, objectUrl });
    return this.getCurrentSource();
  }

  postMessage(message) {
    if (!this.engine) return;
    try {
      this.engine.postMessage(message);
    } catch (error) {
      console.error('Failed to post message to engine', error);
      this.onError?.(error);
    }
  }

  getCurrentSource() {
    return this.source;
  }

  dispose() {
    this.#teardown();
  }

  #attach(engine, source) {
    this.#teardown();
    this.engine = engine;
    this.source = source;

    this._boundMessage = (event) => {
      const payload = event?.data ?? event;
      this.onMessage?.(payload);
    };

    this._boundError = (event) => {
      console.error('Engine error', event);
      this.onError?.(event);
    };

    if (typeof engine.addEventListener === 'function') {
      engine.addEventListener('message', this._boundMessage);
      engine.addEventListener('error', this._boundError);
      engine.addEventListener('messageerror', this._boundError);
    } else {
      engine.onmessage = this._boundMessage;
      if ('onerror' in engine) {
        engine.onerror = this._boundError;
      }
    }
  }

  #teardown() {
    if (this.engine) {
      try {
        this.engine.postMessage?.('quit');
      } catch (error) {
        console.warn('Unable to send quit to engine', error);
      }

      if (typeof this.engine.removeEventListener === 'function') {
        if (this._boundMessage) {
          this.engine.removeEventListener('message', this._boundMessage);
        }
        if (this._boundError) {
          this.engine.removeEventListener('error', this._boundError);
          this.engine.removeEventListener('messageerror', this._boundError);
        }
      } else {
        if ('onmessage' in this.engine) {
          this.engine.onmessage = null;
        }
        if ('onerror' in this.engine) {
          this.engine.onerror = null;
        }
      }

      if (typeof this.engine.terminate === 'function') {
        this.engine.terminate();
      }
    }

    if (this.source?.objectUrl) {
      URL.revokeObjectURL(this.source.objectUrl);
    }

    this.engine = null;
    this.source = null;
    this._boundMessage = null;
    this._boundError = null;
  }
}
