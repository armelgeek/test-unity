# Testing Unity Event Listening

This directory contains tests and utilities for verifying that Unity event listening works correctly.

## Quick Test

### Method 1: Browser Console

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:5173 in your browser

3. Open the browser console (F12)

4. Run this command:
   ```javascript
   window.simulateUnityMessage('set value 123')
   ```

5. You should see console logs showing the message flow:
   ```
   [Test Utility] Simulating Unity message: set value 123
   [UnityBridge] window.onUnityMessage appelé avec: set value 123
   [Bridge] Received: {type: "UnityMessage", data: "set value 123", ...}
   [Bridge] Received: {type: "SetValue", data: 123, ...}
   ```

6. After clicking "Lancer le jeu" and starting IntroPhase, you should also see:
   ```
   [IntroPhase] Unity Click: 123
   ```

### Method 2: Test HTML Page

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:5173/test-unity-messages.html

3. Click the buttons to simulate Unity messages

4. Watch the log output on the page

### Method 3: Integration Test

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open the browser console

3. Import and run the test:
   ```javascript
   import { runUnityEventTest } from './src/tests/unity-event-test.ts';
   runUnityEventTest();
   ```

## What to Look For

### When the App Loads

You should see these console logs:

```
[UnityBridge] Message receiver registered on window.onUnityMessage
[Test Utility] simulateUnityMessage function is available
```

### When You Click "Lancer le jeu"

```
Orchestrateur initialisé
[IntroPhase] Constructor - registering Unity event handler for SetValue
[Phase:interactive] onUnityEvent('SetValue') - queued (stateManager not ready)
```

Then when the phase starts:

```
[Phase:interactive] onUnityEvent('SetValue') - registering handler
[Bridge] Handler registered for message type: SetValue
[IntroPhase] execute() called
[IntroPhase] Sending SetValue 5 to Unity
```

### When Unity Sends a Message (or You Simulate One)

```
[UnityBridge] window.onUnityMessage appelé avec: set value 123
[Bridge] Received: {type: "UnityMessage", data: "set value 123", timestamp: ...}
[Bridge] Calling 0 handler(s) for UnityMessage
[UnityBridge] Parsed 'set value' message with value: 123
[Bridge] Received: {type: "SetValue", data: 123, timestamp: ...}
[Bridge] Calling 1 handler(s) for SetValue
[IntroPhase] Unity Click: 123
```

## Troubleshooting

### No console logs at all

- Make sure you're looking at the correct browser tab
- Check that the dev server is running
- Try refreshing the page

### "window.onUnityMessage is not defined"

- The bridge module might not have loaded yet
- Try refreshing the page
- Check for JavaScript errors in the console

### "No handlers registered for SetValue"

- The phase might not be running yet
- Click "Lancer le jeu" to start the game
- Make sure IntroPhase is the current phase

### Handler not called

- Check that the phase has started (look for "execute() called")
- Verify the message format matches expectations ("set value 123")
- Check the handler is actually registered (look for "Handler registered")

## Understanding the Message Flow

```
Unity/Test
    ↓ (sends "set value 123")
window.onUnityMessage
    ↓ (receives string)
UnityBridge.setupReceiver
    ↓ (parses string)
AbstractBridge.receiveMessage
    ↓ (dispatches to handlers)
Phase Handler
    ↓ (receives data: 123)
Your Code
```

Each step is logged with [UnityBridge], [Bridge], or [Phase:X] prefix for easy tracking.

## Adding New Message Types

To add support for a new message type:

1. Add to MESSAGE_REGISTRY in `src/games/counting/config/message.ts`:
   ```typescript
   'CustomMessage': {
       type: 'CustomMessage',
       direction: 'fromUnity',
   }
   ```

2. Add parsing logic in `bridge.ts` if needed (for string-based messages):
   ```typescript
   if (message.startsWith('custom ')) {
       const value = message.replace('custom ', '');
       this.receiveMessage({
           type: 'CustomMessage',
           data: value,
           timestamp: Date.now()
       });
   }
   ```

3. Listen in your phase:
   ```typescript
   this.onUnityEvent('CustomMessage', (data) => {
       console.log('Custom message:', data);
   });
   ```

## See Also

- [Unity Event Listening Guide](../docs/UNITY_EVENT_LISTENING.md) - Complete developer guide
- [Bridge Implementation](../src/games/counting/config/bridge.ts) - Source code
- [IntroPhase Example](../src/games/counting/phases/intro-phase.ts) - Working example
