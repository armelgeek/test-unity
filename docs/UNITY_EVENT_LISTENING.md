# Unity Event Listening Guide

## Overview

This guide explains how to listen to Unity events from game phases and how to test that the system is working correctly.

## How It Works

### 1. Message Flow

Unity → `window.onUnityMessage` → UnityBridge → AbstractBridge → Phase Handler

```
Unity sends: "set value 123"
↓
window.onUnityMessage("set value 123")
↓
UnityBridge parses and creates: { type: 'SetValue', data: 123, timestamp: ... }
↓
AbstractBridge dispatches to registered handlers
↓
Your handler receives: 123
```

### 2. Listening to Events in a Phase

Use the `onUnityEvent` method in your phase to register a handler:

```typescript
import { PhaseBase } from "../../core/phases/abstract-phase";

export class MyPhase extends PhaseBase {
    constructor() {
        super('my-phase', 'My Phase');
        
        // Register handler for SetValue messages from Unity
        this.onUnityEvent('SetValue', (data) => {
            console.log('Unity sent SetValue:', data);
            // data will be the numeric value (e.g., 123)
        });
    }
    
    execute(): void {
        // Send a message to Unity
        this.sendToUnity('SetValue', 5);
        
        // Unity will process this and may send back a confirmation
        // If it sends "set value 5", your handler above will be called
    }
}
```

### 3. Message Types

The system recognizes these message types:

- **SetValue**: When Unity sends "set value X", parsed as `{ type: 'SetValue', data: X }`
- **UnityMessage**: All string messages are also sent as raw `{ type: 'UnityMessage', data: "original message" }`
- **JSON Messages**: If Unity sends JSON like `{"type":"Custom","data":...}`, it's parsed directly

You can register handlers for any message type:

```typescript
// Listen for SetValue
this.onUnityEvent('SetValue', (value: number) => {
    console.log('Number:', value);
});

// Listen for any raw Unity message
this.onUnityEvent('UnityMessage', (message: string) => {
    console.log('Raw message:', message);
});

// Listen for custom JSON messages
this.onUnityEvent('Custom', (data: any) => {
    console.log('Custom data:', data);
});
```

## Testing

### Option 1: Browser Console

When the app is running, you can simulate Unity messages from the browser console:

```javascript
// Simulate Unity sending "set value 123"
window.simulateUnityMessage('set value 123');

// Simulate Unity sending a JSON message
window.simulateUnityMessage('{"type":"SetValue","data":456}');

// Or directly call window.onUnityMessage
if (typeof window.onUnityMessage === 'function') {
    window.onUnityMessage('set value 789');
}
```

### Option 2: Test HTML Page

Open `test-unity-messages.html` in your browser (when running `npm run dev`):

```
http://localhost:5173/test-unity-messages.html
```

This page provides buttons to:
- Simulate "set value 123" messages
- Simulate JSON messages
- Check if window.onUnityMessage is defined

### Option 3: Debug Logs

With the enhanced logging, you can track the entire message flow in the browser console:

1. **When phase starts**:
   ```
   [IntroPhase] Constructor - registering Unity event handler for SetValue
   [Phase:interactive] onUnityEvent('SetValue') - queued (stateManager not ready)
   ```

2. **When phase executes**:
   ```
   [Phase:interactive] onUnityEvent('SetValue') - registering handler
   [Bridge] Handler registered for message type: SetValue
   [IntroPhase] execute() called
   [IntroPhase] Sending SetValue 5 to Unity
   ```

3. **When Unity sends a message**:
   ```
   [UnityBridge] window.onUnityMessage appelé avec: set value 123
   [Bridge] Received: {type: "UnityMessage", data: "set value 123", ...}
   [Bridge] Calling 0 handler(s) for UnityMessage
   [UnityBridge] Parsed 'set value' message with value: 123
   [Bridge] Received: {type: "SetValue", data: 123, ...}
   [Bridge] Calling 1 handler(s) for SetValue
   [IntroPhase] Unity Click: 123
   ```

## Troubleshooting

### Handler Not Called

If your handler is not being called, check:

1. **Is the phase actually running?**
   - Look for `[IntroPhase] execute() called` in the console
   - Make sure you clicked "Lancer le jeu" to start the game

2. **Is the handler registered?**
   - Look for `[Bridge] Handler registered for message type: SetValue`
   - Should appear after the phase starts

3. **Is Unity sending messages?**
   - Look for `[UnityBridge] window.onUnityMessage appelé avec:`
   - If you don't see this, Unity isn't sending messages

4. **Is the message format correct?**
   - Unity should send "set value 123" (lowercase, with space)
   - Check the parse logs: `[UnityBridge] Parsed 'set value' message`

### Multiple Handlers Issue

If you see warnings about multiple `window.onUnityMessage` handlers, check:

- Only one component should set up the bridge
- Currently, the UnityBridge in `bridge.ts` sets it up
- Don't override `window.onUnityMessage` elsewhere

## Message Registry

Available message types are defined in `src/games/counting/config/message.ts`:

```typescript
export const MESSAGE_REGISTRY: MessageRegistry = {
    'SetValue': {
        type: 'SetValue',
        direction: 'fromUnity',  // Unity sends this to JS
    },
    'ChangeList': {
        type: 'ChangeList',
        direction: 'toUnity',    // JS sends this to Unity
    },
    // ... more types
};
```

To add a new message type:

1. Add it to the registry with the correct direction
2. Update the parsing logic in `bridge.ts` if needed (for string-based messages)
3. Register a handler in your phase using `onUnityEvent`

## Best Practices

1. **Always use onUnityEvent in phases**
   - Don't register handlers directly on the bridge
   - The phase system handles cleanup automatically

2. **Register handlers in constructor**
   - They'll be queued and registered when the phase starts
   - This ensures they're ready before `execute()` runs

3. **Check message direction**
   - 'fromUnity': Unity sends to JS (use onUnityEvent)
   - 'toUnity': JS sends to Unity (use sendToUnity)
   - 'bidirectional': Both directions allowed

4. **Use debug mode**
   - The bridge is created with `debug: true`
   - All message flow is logged to console
   - Makes debugging much easier

## Example: Complete Phase

```typescript
import { PhaseBase } from "../../core/phases/abstract-phase";

export class CountingPhase extends PhaseBase {
    private targetValue: number = 0;
    
    constructor() {
        super('counting', 'Counting Phase');
        
        // Listen for value changes from Unity
        this.onUnityEvent('SetValue', (value: number) => {
            console.log('Unity value changed to:', value);
            
            if (value === this.targetValue) {
                console.log('Correct! Moving to next phase...');
                this.complete();
            }
        });
    }
    
    execute(): void {
        // Set a random target
        this.targetValue = Math.floor(Math.random() * 100);
        
        console.log('Find the value:', this.targetValue);
        
        // Optional: Set initial value in Unity
        this.sendToUnity('SetValue', 0);
    }
}
```

## Summary

The Unity event system allows bidirectional communication between Unity and your game phases:

- **From Unity to JS**: Unity calls `window.onUnityMessage` → Bridge parses → Your handler called
- **From JS to Unity**: Call `this.sendToUnity()` → Bridge formats → Unity receives via WebBridge

With the comprehensive logging in place, you can now trace every step of this flow and debug any issues that arise.
