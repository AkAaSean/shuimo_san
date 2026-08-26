import { processAITurn, advanceTime } from './src/engine/gameLogic.ts';
import { initGame } from './src/engine/gameLogic.ts';

const state = initGame(0, '曹操');

let currentState = state;
for(let i=0; i<6; i++) {
  currentState = advanceTime(currentState);
}

console.log("After 6 months: ", currentState.provincesData[3]);
