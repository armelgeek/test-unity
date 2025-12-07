import { MESSAGE_REGISTRY } from "./message";
import { AbstractBridge } from "../../core/services/abstract-bridge";

export class UnityBridge extends AbstractBridge {
  private sendMessageCallback: ((gameObjectName: string, methodName: string, parameter?: string | number | boolean) => void) | null = null;
  private unityMessageCallback: ((message: any) => void) | null = null;
  private checkReadyInterval: number | null = null;

  constructor(debug: boolean = false, unityMessageCallback?: (message: any) => void) {
    super(MESSAGE_REGISTRY, debug);
    if (unityMessageCallback) {
      this.unityMessageCallback = unityMessageCallback;
    }
    this.setupReceiver();
  }

  public setSendMessage(sendMessage: (gameObjectName: string, methodName: string, parameter?: string | number | boolean) => void) {
    this.sendMessageCallback = sendMessage;
    this.setReady(true);
  }

  public setUnityMessageCallback(callback: (message: any) => void) {
    this.unityMessageCallback = callback;
  }

  protected setupReceiver(): void {
    window.onUnityMessage = (message: any) => {
      console.log("[UnityBridge] window.onUnityMessage appelé avec:", message);
      
      if (this.unityMessageCallback) {
        try {
          this.unityMessageCallback(message);
        } catch (e) {
          console.error("[UnityBridge] unityMessageCallback error:", e);
        }
      }
      
      try {
        if (typeof message === 'string') {
          // Try to parse as JSON first
          try {
            const parsed = JSON.parse(message);
            if (parsed && typeof parsed === 'object') {
              console.log("[UnityBridge] Parsed JSON message:", parsed);
              this.receiveMessage(parsed);
              return;
            }
          } catch (_jsonParseError) {
            // Not JSON, continue with string parsing
          }

          // Always send raw message as UnityMessage type
          this.receiveMessage({
            type: 'UnityMessage',
            data: message as any,
            timestamp: Date.now()
          });

          // Parse specific message formats
          if (message.startsWith('set value ')) {
            const value = parseInt(message.replace('set value ', ''), 10);
            if (!isNaN(value)) {
              console.log(`[UnityBridge] Parsed 'set value' message with value:`, value);
              this.receiveMessage({
                type: 'SetValue',
                data: value as any,
                timestamp: Date.now()
              });
            }
          }
        } else {
          // Received non-string message
          console.log("[UnityBridge] Received non-string message:", message);
          this.receiveMessage(message);
        }
      } catch (e) {
        console.error("[UnityBridge] Failed to process message:", e);
      }
    };
    
    console.log("[UnityBridge] Message receiver registered on window.onUnityMessage");
  }

  protected sendRaw(message: { type: string; data: any }): void {
    if (!this.sendMessageCallback) {
      console.warn('[Unity Bridge] SendMessage callback not set, message queued');
      return;
    }
    try {
      // Unity expects format like "SetValue123" (type concatenated with data)
      // This matches the format used by existing Unity functions (e.g., SetValue322)
      this.sendMessageCallback('WebBridge', 'ReceiveStringMessageFromJs', message.type + message.data);
    } catch (error) {
      console.error('[Unity Bridge] Error sending to Unity:', error);
    }
  }

  public isReady(): boolean {
    return this.ready;
  }

  destroy(): void {
    if (this.checkReadyInterval) {
      clearInterval(this.checkReadyInterval);
    }
    this.clearHandlers();
    this.clearQueue();
    delete (window as any).receiveUnityMessage;
  }
}

export const unityBridge = new UnityBridge(
  true
);

// Global utility for testing - allows simulating Unity messages from browser console
if (typeof window !== 'undefined') {
  (window as any).simulateUnityMessage = (message: string): void => {
    console.log('[Test Utility] Simulating Unity message:', message);
    if (typeof window.onUnityMessage === 'function') {
      window.onUnityMessage(message);
    } else {
      console.error('[Test Utility] window.onUnityMessage is not defined!');
    }
  };
}