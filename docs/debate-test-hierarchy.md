# Debate Feature Test Hierarchy

This file separates the debate feature tests into the three levels requested for presentation.

## Acceptance Tests

File: `features/model-debate.feature`

Count: 3 tests

1. User enables Debate Mode and sees the debate model panel.
2. User selects multiple models, submits a debate question, and sees an Open Debate card.
3. User opens the debate thread and asks a follow-up inside that thread.

Command:

```bash
npm run test:debate:acceptance
```

## Integration Tests

File: `spec/debate_mode_integration_spec.js`

Count: 4 tests

1. Chat API routes `debateMode: true` requests into debate generation.
2. Debate mode creates a thread with selected models, context, messages, and verdict.
3. Debate follow-up requests append follow-up messages to an existing debate thread.
4. Debate context routing uses Rutgers/local/SOC/DuckDuckGo/none depending on the question.

Command:

```bash
npm run test:debate:integration
```

## Unit Tests

File: `spec/debate_mode_unit_spec.js`

Count: 5 tests

1. `getDebateDepthSettings('quick')` returns 3 max rounds.
2. `getDebateDepthSettings('deep')` returns 7 max rounds.
3. Custom max rounds clamp between 5 and 7.
4. `detectQuestionContext()` identifies Rutgers questions.
5. Debate model fallback ensures at least two models are used.

Command:

```bash
npm run test:debate:unit
```

## Full Debate Test Command

```bash
npm run test:debate
```

Total: 12 debate-only tests.
