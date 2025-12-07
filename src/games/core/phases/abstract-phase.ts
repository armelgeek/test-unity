import { SpeechService } from "../services/speech-service";
import { StateManager } from "./state-manager";

export abstract class PhaseBase<TState = any> {
  public readonly id: string;
  public readonly title?: string;

  private _completed = false;
  private _resolve?: () => void;
  private _promise: Promise<void>;
  private _cleanups: Array<() => void> = [];
  private _orchestrator?: any; // Référence à l'orchestrateur

  protected stateManager!: StateManager<TState>;

  private _pendingEvents: Array<() => void> = [];

  constructor(id: string, title?: string) {
    this.id = id;
    this.title = title;
    this._promise = new Promise<void>((r) => { this._resolve = r; });
  }

  setOrchestrator(orchestrator: any) {
    this._orchestrator = orchestrator;
  }

  public start(stateManager: StateManager<TState>): void | Promise<void> {
    this.stateManager = stateManager;

    // Enregistrer les événements en attente
    this._pendingEvents.forEach(register => register());
    this._pendingEvents = [];

    return this.execute();
  }

  protected abstract execute(): void | Promise<void>;

  /** Nettoie la phase */
  stop() {
    this._cleanups.forEach(fn => fn());
    this._cleanups = [];
  }

  /** Marque la phase comme complète - déclenche auto l'avancement */
  protected complete() {
    if (this._completed) return;
    this._completed = true;
    this._resolve?.();
  }

  /** Attend la complétion de la phase */
  whenComplete(): Promise<void> {
    return this._promise;
  }

  isCompleted(): boolean {
    return this._completed;
  }

  /** Enregistre un cleanup à exécuter lors du stop */
  protected addCleanup(fn: () => void) {
    this._cleanups.push(fn);
  }

  /** Helper pour écouter un event et auto-cleanup */
  protected onEvent<T = any>(event: string, handler: (data: T) => void): void {
    if (!this.stateManager) {
      this._pendingEvents.push(() => this.onEvent(event, handler));
      return;
    }
    const off = this.stateManager.on(event, handler);
    this.addCleanup(off);
  }

  /** Helper pour écouter un event Unity et auto-cleanup */
  protected onUnityEvent<T extends string, P = any>(
    messageType: T,
    handler: (data: P) => void
  ): void {
    if (!this.stateManager) {
      console.log(`[Phase:${this.id}] onUnityEvent('${messageType}') - queued (stateManager not ready)`);
      this._pendingEvents.push(() => this.onUnityEvent(messageType, handler));
      return;
    }

    const bridge = this.ensureBridge('onUnityEvent');
    if (!bridge) return;

    console.log(`[Phase:${this.id}] onUnityEvent('${messageType}') - registering handler`);
    const off = bridge.on(messageType, handler);
    this.addCleanup(off);
  }

  /** Helper pour modifier le state global depuis une phase */
  protected setState(updates: Partial<TState>) {
    this.stateManager.setState(updates);
  }

  /** Helper pour obtenir le state global depuis une phase */
  protected getState(): TState {
    return this.stateManager.getState();
  }

  /** Helper pour émettre un événement depuis une phase */
  protected emit(event: string, data?: any) {
    this.stateManager.emit(event, data);
  }

  /** Helper pour faire parler le personnage */
  protected async speak(message: string): Promise<void> {
    await this.stateManager.speak(message);
  }


  /** Helper pour mettre à jour le game state depuis une phase */
  protected updateGameState<T = any>(updates: Partial<T>) {
    if (!this._orchestrator) {
      console.warn('updateGameState appelé sans orchestrateur');
      return;
    }
    this._orchestrator.updateGameState(updates);
  }

  /** Helper pour obtenir le game state depuis une phase */
  protected getGameState<T = any>(): T | undefined {
    if (!this._orchestrator) {
      console.warn('getGameState appelé sans orchestrateur');
      return undefined;
    }
    return this._orchestrator.getGameState();
  }

  /** Helper pour obtenir le Unity Bridge depuis une phase */
  protected getBridge() {
    return this.stateManager.bridge;
  }

  /** Vérifie si le bridge est disponible et log un warning si non */
  private ensureBridge(methodName: string) {
    const bridge = this.getBridge();
    if (!bridge) {
      console.warn(`${methodName} appelé sans bridge`);
    }
    return bridge;
  }

  /** Helper pour envoyer un message à Unity depuis une phase */
  protected sendToUnity<T extends string, P = any>(
    messageType: T,
    data: P
  ): void {
    const bridge = this.ensureBridge('sendToUnity');
    if (!bridge) return;
    bridge.send(messageType, data);
  }
}