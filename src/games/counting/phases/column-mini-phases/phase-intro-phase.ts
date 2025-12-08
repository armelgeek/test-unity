import { PhaseBase } from "../../../core/phases/abstract-phase";

/**
 * Mini-phase: Introduction générale de la phase
 */
export class PhaseIntroductionPhase extends PhaseBase {
  constructor() {
    super('phase-intro', 'Introduction Phase 2');
  }

  async execute(): Promise<void> {
    console.log('📊 Phase 2: Compréhension des colonnes - Introduction');

    this.sendToUnity('LockThousand:', 1);
    this.sendToUnity('LockHundred:', 1);
    this.sendToUnity('LockTen:', 1);
    this.sendToUnity('LockUnit:', 1);

    await this.speak('Bravo pour avoir maîtrisé les boutons !');
    await this.speak('Maintenant, nous allons apprendre à former des nombres, colonne par colonne.');
    await this.speak('Un nombre est composé de quatre positions');
    await this.speak('les unités');
    this.sendToUnity('LockUnit:', 0);
    await this.speak('les dizaines');
    this.sendToUnity('LockTen:', 0);
    await this.speak('les centaines');
    this.sendToUnity('LockHundred:', 0);
    await this.speak('les millièmes');
    this.sendToUnity('LockThousand:', 0);
    await this.speak('Je vais te guider étape par étape. Pour chaque nombre, je vais débloquer les colonnes progressivement, une par une. Les colonnes validées resteront accessibles. Commençons doucement avec les Unités, puis nous ajouterons progressivement les autres colonnes.');

    this.updateGameState({
      message: 'Découvrons les positions ensemble !',
      instruction: 'Je vais te guider étape par étape. Pour chaque nombre, je débloque les colonnes progressivement, une par une. D\'abord les Unités, puis les Dizaines, ensuite les Centaines, et enfin les Millièmes. Les colonnes validées resteront accessibles.',
      showValidateButton: false
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    this.complete();
  }
}
