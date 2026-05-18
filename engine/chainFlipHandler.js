export class ChainFlipHandler {
  constructor(board, flipRule) {
    this.board = board;
    this.flipRule = flipRule;
    this.player = 0;
    this.availableTriggers = [];
    this.selectedTrigger = null;
    this.availableGroups = [];
  }

  startChainFlip(player) {
    this.player = player;
    this.availableTriggers = this.flipRule.getTriggers(player);
    this.selectedTrigger = null;
    this.availableGroups = [];
    return this.availableTriggers.length > 0;
  }

  getTriggers() {
    return this.availableTriggers;
  }

  selectTrigger(pos) {
    const index = this.availableTriggers.findIndex(t => t[0] === pos[0] && t[1] === pos[1]);
    if (index === -1) return;
    this.selectedTrigger = pos;
    this.availableGroups = this.flipRule.getFlipGroupsForTrigger(this.player, pos);
  }

  getAvailableGroups() {
    return this.availableGroups;
  }

  chooseGroupByPosition(pos) {
    for (let i = 0; i < this.availableGroups.length; i++) {
      for (const [groupPos] of this.availableGroups[i].flips) {
        if (groupPos[0] === pos[0] && groupPos[1] === pos[1]) {
          return i;
        }
      }
    }
    return null;
  }
}
