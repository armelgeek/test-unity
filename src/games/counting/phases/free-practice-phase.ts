import { PhaseBase } from "../../core/phases/abstract-phase";

/**
 * Phase 3: Exercices libres
 * L'utilisateur s'entraîne librement avec des nombres aléatoires
 * Guidage pas à pas pour chaque chiffre (unité, dizaine, centaine, millième)
 */
export class FreePracticePhase extends PhaseBase {
  private readonly positionNames = ['Unité', 'Dizaine', 'Centaine', 'Millième'];
  private readonly lockCommands = ['LockUnit:', 'LockTen:', 'LockHundred:', 'LockThousand:'];
  
  // Délais en millisecondes pour les transitions
  private readonly INTRO_DELAY_MS = 2000;
  private readonly COLUMN_TRANSITION_DELAY_MS = 1000;
  private readonly AUTO_ADVANCE_DELAY_MS = 800;
  private readonly EXERCISE_COMPLETION_DELAY_MS = 2000;
  
  private currentTarget = '';
  private successCount = 0;
  private currentValue = '0000';
  private currentPosition = 0; // Position actuelle en cours de remplissage (0=unité, 1=dizaine, etc.)
  
  /** Flag pour éviter les validations en double lors de l'avancement automatique */
  private validationHandled = false;
  
  /** Flag pour s'assurer que le gestionnaire de validation n'est enregistré qu'une seule fois */
  private validateHandlerRegistered = false;

  constructor() {
    super('free-practice', 'Exercices libres');
  }

  async execute(): Promise<void> {
    console.log('🔄 Phase 3: Exercices libres');

    // Bloquer tous les rouleaux au départ
    this.lockAll();

    // Message vocal d'introduction
    await this.speak('Bravo ! Maintenant, c\'est l\'heure de t\'entraîner librement ! Je vais te donner des nombres à former, et tu utiliseras tout ce que tu as appris.');
    await this.speak('Prends ton temps, et amuse-toi bien !');

    // Afficher l'interface
    this.updateGameState({
      message: 'Entraînez-vous librement !',
      successCount: 0,
      showValidateButton: false,
      showQuitButton: true
    });

    // Reset validate handler registration state
    this.validateHandlerRegistered = false;

    // Écouter les changements de valeur pour tracker la valeur actuelle
    this.onUnityEvent('SetValueUpdate', (data: { value?: string }) => {
      const valueStr = data.value || '0';
      this.currentValue = valueStr.padStart(4, '0');
      console.log('Current value updated:', this.currentValue);
    });

    // CorrectValue from Unity should automatically validate and advance to next column
    this.onUnityEvent('CorrectValue', () => {
      this.checkProgress(true);
    });

    // WrongValue may result in an error message or re-checking progress (no auto-advance)
    this.onUnityEvent('WrongValue', () => {
      this.checkProgress(false);
    });

    // Écouter le clic sur Quitter
    this.onEvent('quitClick', () => {
      this.exitTutorial();
    });

    // Commencer le premier exercice
    setTimeout(() => {
      this.startNewExercise();
    }, this.INTRO_DELAY_MS);
  }

  private lockAll(): void {
    this.sendToUnity('LockThousand:', 1);
    this.sendToUnity('LockHundred:', 1);
    this.sendToUnity('LockTen:', 1);
    this.sendToUnity('LockUnit:', 1);
  }

  private async startColumn(): Promise<void> {
    // Déterminer quelle est la position maximale non-nulle (le dernier chiffre significatif)
    let maxPosition = 0;
    for (let i = 3; i >= 0; i--) {
      if (this.currentTarget[i] !== '0') {
        maxPosition = 3 - i;
        break;
      }
    }

    if (this.currentPosition > maxPosition) {
      // Toutes les colonnes nécessaires sont remplies
      await this.completeNumber();
      return;
    }

    const positionName = this.positionNames[this.currentPosition];
    const targetDigit = this.currentTarget[3 - this.currentPosition];

    console.log(`Démarrage colonne: ${positionName}, chiffre cible: ${targetDigit}`);

    // Reset validation flag
    this.validationHandled = false;

    // Bloquer tout, puis débloquer les colonnes jusqu'à la position actuelle
    this.lockAll();
    for (let i = 0; i <= this.currentPosition; i++) {
      this.sendToUnity(this.lockCommands[i], 0);
    }

    // Instruction pour cette colonne
    this.updateGameState({
      message: `Colonne: ${positionName} → ${targetDigit}`,
      currentDigit: positionName,
      instruction: `Remplis la colonne des ${positionName} avec le chiffre ${targetDigit}. Utilise les boutons ↑ et ↓ pour ajuster la valeur.`,
      showValidateButton: false
    });
  }

  private checkProgress(autoAdvance = false): void {
    // Vérifier si toutes les colonnes précédentes sont correctes
    for (let i = 0; i < this.currentPosition; i++) {
      const targetDigit = this.currentTarget[3 - i];
      const currentDigit = this.currentValue[3 - i];
      if (currentDigit !== targetDigit) {
        // Une colonne précédente a été modifiée incorrectement
        this.handlePreviousColumnError(i);
        return;
      }
    }

    // Vérifier la colonne actuelle
    const targetDigit = this.currentTarget[3 - this.currentPosition];
    const currentDigit = this.currentValue[3 - this.currentPosition];

    if (currentDigit === targetDigit) {
      // Colonne correcte !
      this.handleColumnCorrect(autoAdvance);
    }
  }

  private async handlePreviousColumnError(columnIndex: number): Promise<void> {
    const columnName = this.positionNames[columnIndex];
    const targetDigit = this.currentTarget[3 - columnIndex];

    this.updateGameState({
      instruction: `⚠️ Attention : Tu as modifié une colonne précédente (${columnName}). Elle doit rester à ${targetDigit}. Corrige-la avant de continuer.`
    });
  }

  private handleColumnCorrect(autoAdvance = false): void {
    // Prevent duplicate event handlers
    if (this.validationHandled) {
      return;
    }
    this.validationHandled = true;

    const positionName = this.positionNames[this.currentPosition];
    const targetDigit = this.currentTarget[3 - this.currentPosition];

    console.log(`✓ Colonne ${positionName} correcte: ${targetDigit}`);

    this.updateGameState({
      message: `✓ ${positionName} : ${targetDigit} - Correct !`,
      instruction: `Excellent ! La colonne des ${positionName} est correcte.`,
      showValidateButton: !autoAdvance
    });

    // If autoAdvance is requested (Unity signaled correctness), move directly to next column
    if (autoAdvance) {
      // Slight delay for UX so user sees feedback
      setTimeout(() => {
        this.nextColumn();
      }, this.AUTO_ADVANCE_DELAY_MS);
      return;
    }

    // Register a single validateClick handler for the whole phase that honors validationHandled
    if (!this.validateHandlerRegistered) {
      this.validateHandlerRegistered = true;
      this.onEvent('validateClick', () => {
        console.log('validateClick received in FreePracticePhase. validationHandled=', this.validationHandled);
        // Only advance if the column is currently validated
        if (this.validationHandled) {
          this.nextColumn();
        }
      });
    }
  }

  private async nextColumn(): Promise<void> {
    this.updateGameState({
      showValidateButton: false
    });

    this.currentPosition++;

    // Déterminer quelle est la position maximale non-nulle
    let maxPosition = 0;
    for (let i = 3; i >= 0; i--) {
      if (this.currentTarget[i] !== '0') {
        maxPosition = 3 - i;
        break;
      }
    }

    if (this.currentPosition > maxPosition) {
      // Toutes les colonnes nécessaires sont remplies
      await this.completeNumber();
    } else {
      // Passer à la colonne suivante
      setTimeout(() => {
        this.startColumn();
      }, this.COLUMN_TRANSITION_DELAY_MS);
    }
  }

  private async completeNumber(): Promise<void> {
    this.successCount++;
    console.log(`✓ Bravo! Succès: ${this.successCount}`);

    // Messages vocaux variés selon le nombre de succès (non-bloquant)
    if (this.successCount === 1) {
      this.speakNonBlocking('Bravo ! Tu as réussi ton premier exercice !');
    } else if (this.successCount === 3) {
      this.speakNonBlocking('Excellent ! Trois exercices de suite ! Tu es en pleine forme !');
    } else if (this.successCount === 5) {
      this.speakNonBlocking('Incroyable ! Cinq exercices ! Tu es vraiment doué !');
    } else if (this.successCount % 5 === 0) {
      this.speakNonBlocking(`Fantastique ! ${this.successCount} exercices réussis ! Continue comme ça !`);
    } else {
      this.speakNonBlocking('Parfait !');
    }

    this.updateGameState({
      message: `✓ Bravo ! Nombre ${this.successCount} complété !`,
      instruction: `Excellent ! Tu as réussi à former le nombre ${this.currentTarget}.`,
      successCount: this.successCount,
      showValidateButton: false,
      showQuitButton: true
    });

    // Attendre 2 secondes puis nouveau nombre
    setTimeout(() => {
      this.startNewExercise();
    }, this.EXERCISE_COMPLETION_DELAY_MS);
  }

  private startNewExercise(): void {
    // Générer un nombre aléatoire entre 1 et 9999
    const randomNum = Math.floor(Math.random() * 9999) + 1;
    this.currentTarget = randomNum.toString().padStart(4, '0');
    this.currentPosition = 0; // Recommencer à l'unité

    console.log(`Nouvel exercice: ${this.currentTarget}`);

    // Créer la liste avec ce nombre
    this.sendToUnity('ChangeList', this.currentTarget);

    // Réinitialiser la valeur
    this.sendToUnity('SetValue', '0000');
    this.currentValue = '0000';

    // Afficher l'objectif
    this.updateGameState({
      message: `Formez le nombre : ${this.currentTarget}`,
      targetNumber: this.currentTarget,
      instruction: `Nombre à former : ${this.currentTarget}. Commence par la colonne des Unités.`,
      showValidateButton: false,
      showQuitButton: true
    });

    // Commencer par la première colonne (unités)
    setTimeout(() => {
      this.startColumn();
    }, this.INTRO_DELAY_MS);
  }

  private async exitTutorial(): Promise<void> {
    console.log(`Fin du tutoriel. Exercices réussis: ${this.successCount}`);

    await this.speak(`Félicitations ! Tu as réussi ${this.successCount} exercice${this.successCount > 1 ? 's' : ''} ! Tu as fait un excellent travail ! À bientôt pour de nouvelles aventures !`);

    this.updateGameState({
      message: `Félicitations ! Vous avez réussi ${this.successCount} exercice(s).`,
      showValidateButton: false,
      showQuitButton: false
    });

    // Débloquer tous les rouleaux
    this.sendToUnity('LockThousand:', 0);
    this.sendToUnity('LockHundred:', 0);
    this.sendToUnity('LockTen:', 0);
    this.sendToUnity('LockUnit:', 0);

    // Compléter la phase après 3 secondes
    setTimeout(() => {
      this.complete();
    }, 3000);
  }
}
