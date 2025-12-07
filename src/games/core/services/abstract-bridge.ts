import type {
  TypedMessage,
  MessageHandler,
  MessagePayload,
  MessageRegistry
} from '../types/bridge-messages.types';

export abstract class AbstractBridge {
  protected messageHandlers: Map<string, Set<MessageHandler<any>>> = new Map();
  protected messageQueue: TypedMessage[] = [];
  protected ready: boolean = false;
  protected registry: MessageRegistry;
  protected debug: boolean = false;

  constructor(registry: MessageRegistry, debug: boolean = false) {
    this.registry = registry;
    this.debug = debug;
  }

  protected abstract sendRaw(message: TypedMessage): void;
  protected abstract setupReceiver(): void;
  public abstract isReady(): boolean;

  on<T extends string, P = MessagePayload>(
    messageType: T,
    handler: MessageHandler<P>
  ): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }

    this.messageHandlers.get(messageType)!.add(handler as MessageHandler<any>);
    
    if (this.debug) {
      console.log(`[Bridge] Handler registered for message type: ${messageType}`);
    }

    // Retourner fonction de nettoyage
    return () => {
      this.messageHandlers.get(messageType)?.delete(handler as MessageHandler<any>);
      if (this.debug) {
        console.log(`[Bridge] Handler unregistered for message type: ${messageType}`);
      }
    };
  }

  // === Enregistrement multiple de handlers ===
  onMany(handlers: Record<string, MessageHandler<any>>): () => void {
    const unsubscribers = Object.entries(handlers).map(([type, handler]) =>
      this.on(type, handler)
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }

  // === Envoi de messages ===
  send<T extends string, P = MessagePayload>(
    messageType: T,
    data: P
  ): void {
    // Vérifier que le message est enregistré
    if (!this.registry[messageType]) {
      console.warn(`[Bridge] Message type "${messageType}" not registered`);
    }

    // Vérifier la direction
    const config = this.registry[messageType];
    if (config && config.direction === 'fromUnity') {
      console.warn(`[Bridge] Message type "${messageType}" should only come from Unity`);
    }

    const message: TypedMessage<T, P> = {
      type: messageType,
      data,
      timestamp: Date.now(),
    };

    if (this.debug) {
      console.log('[Bridge] Sending:', message);
    }

    if (!this.ready) {
      this.messageQueue.push(message as TypedMessage);
      return;
    }

    this.sendRaw(message as TypedMessage);
  }

  // === Envoi batch de messages ===
  sendBatch(messages: Array<{ type: string; data: any }>): void {
    messages.forEach(({ type, data }) => this.send(type, data));
  }

  // === Réception de messages ===
  protected receiveMessage(message: TypedMessage): void {
    if (this.debug) {
      console.log('[Bridge] Received:', message);
    }

    // Vérifier que le message est enregistré
    if (!this.registry[message.type]) {
      console.warn(`[Bridge] Received unregistered message type: ${message.type}`);
    }

    // Vérifier la direction
    const config = this.registry[message.type];
    if (config && config.direction === 'toUnity') {
      console.warn(`[Bridge] Message type "${message.type}" should only go to Unity`);
    }

    // Appeler tous les handlers enregistrés
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      if (this.debug) {
        console.log(`[Bridge] Calling ${handlers.size} handler(s) for ${message.type}`);
      }
      handlers.forEach(handler => {
        try {
          handler(message.data);
        } catch (error) {
          console.error(`[Bridge] Error in handler for ${message.type}:`, error);
        }
      });
    } else {
      if (this.debug) {
        console.log(`[Bridge] No handlers registered for ${message.type}`);
      }
    }
  }

  // === Gestion de la file d'attente ===
  protected flushQueue(): void {
    if (this.debug) {
      console.log(`[Bridge] Flushing ${this.messageQueue.length} queued messages`);
    }

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.sendRaw(message);
    }
  }

  protected setReady(ready: boolean): void {
    this.ready = ready;
    if (ready) {
      this.flushQueue();
    }
  }

  // === Utilitaires ===
  clearHandlers(messageType?: string): void {
    if (messageType) {
      this.messageHandlers.delete(messageType);
    } else {
      this.messageHandlers.clear();
    }
  }

  clearQueue(): void {
    this.messageQueue = [];
  }

  getQueueSize(): number {
    return this.messageQueue.length;
  }

  getRegisteredMessages(): string[] {
    return Object.keys(this.registry);
  }

  // === Debug ===
  setDebug(debug: boolean): void {
    this.debug = debug;
  }

  getStats(): {
    ready: boolean;
    queueSize: number;
    handlersCount: number;
    registeredMessages: number;
  } {
    return {
      ready: this.ready,
      queueSize: this.messageQueue.length,
      handlersCount: Array.from(this.messageHandlers.values())
        .reduce((sum, set) => sum + set.size, 0),
      registeredMessages: Object.keys(this.registry).length,
    };
  }
}