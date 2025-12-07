import { PhaseBase } from "../../core/phases/abstract-phase";

/**
 * Phase d'introduction du quiz
 */
export class IntroPhase extends PhaseBase {

    constructor() {
        super('interactive', 'Phase Interactive');
        console.log('[IntroPhase] Constructor - registering Unity event handler for SetValue');
        this.onUnityEvent('SetValue', (data) => {
            console.log('[IntroPhase] Unity Click:', data);
        });
    }
    execute(): void | Promise<void> {
        console.log('[IntroPhase] execute() called');
        console.log('[IntroPhase] state manager', this.getState());
        
        console.log('[IntroPhase] Sending SetValue 5 to Unity');
        this.sendToUnity('SetValue', 5)
        //this.speak('Bonjour, bienvenue dans ce jeu de comptage')

        // this.whenComplete();
        // this.complete();
    }

}