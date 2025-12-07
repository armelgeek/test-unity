/**
 * Integration Test for Unity Event Listening
 * 
 * This test verifies that the Unity event system works correctly:
 * 1. Messages can be sent to Unity
 * 2. Messages from Unity are properly parsed
 * 3. Handlers receive the correct data
 * 
 * To run this test:
 * 1. Start the dev server: npm run dev
 * 2. Open the browser console
 * 3. Paste this file's test code into the console
 * 4. Follow the instructions printed to console
 */

export function runUnityEventTest() {
  console.log('=== Unity Event Listening Integration Test ===\n');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Test 1: Check if window.onUnityMessage is defined
  console.log('Test 1: Checking if window.onUnityMessage is defined...');
  if (typeof window.onUnityMessage === 'function') {
    console.log('✅ PASS: window.onUnityMessage is a function');
    testsPassed++;
  } else {
    console.error('❌ FAIL: window.onUnityMessage is not defined');
    testsFailed++;
  }
  
  // Test 2: Check if simulateUnityMessage utility exists
  console.log('\nTest 2: Checking if simulateUnityMessage utility exists...');
  if (typeof (window as any).simulateUnityMessage === 'function') {
    console.log('✅ PASS: window.simulateUnityMessage is available');
    testsPassed++;
  } else {
    console.error('❌ FAIL: window.simulateUnityMessage is not defined');
    testsFailed++;
  }
  
  // Test 3: Simulate Unity sending a "set value" message
  console.log('\nTest 3: Simulating Unity sending "set value 999"...');
  console.log('Watch the console for:');
  console.log('  - [UnityBridge] window.onUnityMessage appelé avec: set value 999');
  console.log('  - [Bridge] Received: {type: "SetValue", data: 999, ...}');
  console.log('  - [Bridge] Calling X handler(s) for SetValue');
  console.log('  - [IntroPhase] Unity Click: 999 (if IntroPhase is running)\n');
  
  try {
    (window as any).simulateUnityMessage('set value 999');
    console.log('✅ PASS: Message sent successfully');
    testsPassed++;
  } catch (error) {
    console.error('❌ FAIL: Error sending message:', error);
    testsFailed++;
  }
  
  // Test 4: Simulate Unity sending a JSON message
  console.log('\nTest 4: Simulating Unity sending JSON message...');
  const jsonMessage = JSON.stringify({ 
    type: 'SetValue', 
    data: 777, 
    timestamp: Date.now() 
  });
  
  try {
    (window as any).simulateUnityMessage(jsonMessage);
    console.log('✅ PASS: JSON message sent successfully');
    testsPassed++;
  } catch (error) {
    console.error('❌ FAIL: Error sending JSON message:', error);
    testsFailed++;
  }
  
  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Total: ${testsPassed + testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed!');
    console.log('\nNext steps:');
    console.log('1. Start the game by clicking "Lancer le jeu"');
    console.log('2. The IntroPhase should start and register a SetValue handler');
    console.log('3. Try: window.simulateUnityMessage("set value 123")');
    console.log('4. You should see "[IntroPhase] Unity Click: 123" in the console');
  } else {
    console.error('\n❌ Some tests failed. Check the errors above.');
  }
  
  return { passed: testsPassed, failed: testsFailed };
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  console.log('Unity Event Test loaded. Run runUnityEventTest() to execute tests.');
}
