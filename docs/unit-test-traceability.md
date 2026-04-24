# Unit Test Traceability for Multi-LLM Chat

This document explains how each use case and scenario for the multi-LLM chat feature is implemented and verified through a series of Jasmine unit tests.

The goal is to show traceability from:

1. user story
2. concrete scenario
3. implementation logic
4. unit tests that verify that logic

## Scope

This document focuses on the multi-LLM compare feature and its related single-model fallback behavior.

Relevant implementation files:

- `src/app/chat/page.tsx`
- `src/app/api/chat/route.ts`
- `src/lib/chat-selection-logic.js`
- `src/lib/chat-api-logic.js`
- `src/lib/chat-logic.js`

Relevant Jasmine files:

- `spec/chat_selection_logic_spec.js`
- `spec/chat_api_logic_spec.js`
- `spec/chat_logic_spec.js`

## Test Strategy

The UI and API flows depend on browser state, user selections, and model routing. To make the behavior testable with Jasmine, the decision logic was separated into pure helper modules:

- `src/lib/chat-selection-logic.js`
  Handles single-model mode, compare-mode model selection, duplicate prevention, and mode normalization.

- `src/lib/chat-api-logic.js`
  Handles server-side model resolution, error-response formatting, and fallback response selection.

- `src/lib/chat-logic.js`
  Handles general chat validation, request normalization, and message sanitization.

This lets Jasmine verify the behavior deterministically without depending on a running Next.js server or live LLM providers.

## User Story 1

```text
As a user who wants to learn different concepts in unique different perspectives,
so that I can see how different LLMs think and solve the same problem,
I want to be able to ask one question and receive 3 or multiple different answers solving it in unique ways.
```

### Scenario 1.1

```text
The system should support compare mode by selecting multiple LLMs for one prompt.
```

Implementation responsibility:

- `src/app/chat/page.tsx` stores and uses compare-mode selections
- `src/lib/chat-selection-logic.js` builds and sanitizes the compare-model selection
- `src/app/api/chat/route.ts` routes one prompt to multiple selected models
- `src/lib/chat-api-logic.js` resolves the selected models on the API side

Unit tests that implement this scenario:

- `spec/chat_selection_logic_spec.js`
  - `builds the default three-model compare selection from the first available models`
  - `sanitizes compare selections by removing duplicates and invalid model ids`
  - `keeps compare selections capped at three models`
  - `updates one compare slot and keeps all selected models distinct`

- `spec/chat_api_logic_spec.js`
  - `returns up to three unique models from compare-mode selections`

What these tests prove:

- compare mode starts with a valid three-model default
- invalid and duplicate selections are cleaned before use
- the user cannot accidentally send duplicate models in the compare set
- the backend resolves one prompt into a valid list of unique target models

### Scenario 1.2

```text
The system should accept one prompt and prepare it for multiple model responses.
```

Implementation responsibility:

- `src/app/chat/page.tsx` sends `modelIds` in compare mode
- `src/app/api/chat/route.ts` prepares one prompt for all selected models
- `src/lib/chat-logic.js` validates the incoming chat request

Unit tests that support this scenario:

- `spec/chat_logic_spec.js`
  - `accepts a valid message and trims it`
  - `rejects empty messages`
  - `rejects messages above the max length`
  - `preserves an existing conversation id`
  - `creates a conversation id when one is missing`
  - `sanitizes malformed history messages`

What these tests prove:

- one prompt can be normalized before fan-out to multiple models
- invalid prompts are blocked early
- conversation tracking stays stable across repeated prompts
- chat history remains safe and normalized before being reused

## User Story 2

```text
As a user who may not know which LLM is best suited,
so that I can compare different LLMs to find the most accurate and relevant answer,
I want to be able to ask one question and receive those different outputs by 3 different LLMs.
```

### Scenario 2.1

```text
The user should be able to choose which specific three LLMs are used for comparison.
```

Implementation responsibility:

- `src/app/chat/page.tsx` stores individual model dropdown choices
- `src/lib/chat-selection-logic.js` updates the chosen slot while keeping the set valid
- `src/lib/chat-api-logic.js` resolves those chosen models on the server side

Unit tests that implement this scenario:

- `spec/chat_selection_logic_spec.js`
  - `updates one compare slot and keeps all selected models distinct`

- `spec/chat_api_logic_spec.js`
  - `returns up to three unique models from compare-mode selections`
  - `ignores invalid compare model ids and falls back to the valid ones`

What these tests prove:

- each compare dropdown choice can be updated independently
- model comparison remains meaningful because the chosen set stays distinct
- the server accepts valid selected models and rejects invalid IDs safely

### Scenario 2.2

```text
The system should still support single-model mode for users who only want one answer.
```

Implementation responsibility:

- `src/app/chat/page.tsx` supports `single` and `compare` modes
- `src/lib/chat-selection-logic.js` normalizes the current mode and single-model choice
- `src/lib/chat-api-logic.js` resolves one selected model when only `modelId` is provided

Unit tests that implement this scenario:

- `spec/chat_selection_logic_spec.js`
  - `falls back to the first available model for invalid single-model selections`
  - `keeps a valid single-model selection`
  - `normalizes chat mode values to either single or compare`

- `spec/chat_api_logic_spec.js`
  - `uses the single selected model when modelId is provided`

What these tests prove:

- the app can safely switch between one-model and compare-mode chat
- the single-model selection is always valid before a request is sent
- the backend correctly routes single-model requests

## User Story 3

```text
As a user who depends on consistent responses,
so that I still receive useful outputs even if one model fails or gives a weak answer,
I want to be able to rely on multiple LLM responses instead of a single point of failure.
```

### Scenario 3.1

```text
If one selected model is invalid or unavailable, the system should still preserve the usable compare set.
```

Implementation responsibility:

- `src/lib/chat-selection-logic.js` removes invalid client-side compare selections
- `src/lib/chat-api-logic.js` ignores invalid model IDs during server-side resolution

Unit tests that implement this scenario:

- `spec/chat_selection_logic_spec.js`
  - `sanitizes compare selections by removing duplicates and invalid model ids`

- `spec/chat_api_logic_spec.js`
  - `ignores invalid compare model ids and falls back to the valid ones`
  - `falls back to the first three configured models when nothing valid is requested`

What these tests prove:

- bad model IDs do not break compare mode
- the backend still produces a usable model set even when the request is partially wrong
- the system avoids a total breakdown caused by selection errors

### Scenario 3.2

```text
If one model fails during response generation, the system should still select a usable primary response.
```

Implementation responsibility:

- `src/app/api/chat/route.ts` collects per-model results
- `src/lib/chat-api-logic.js` formats failed model responses and chooses the primary response

Unit tests that implement this scenario:

- `spec/chat_api_logic_spec.js`
  - `formats an error response for an unavailable model without breaking the response shape`
  - `prefers the first successful response when compare mode includes a failed model`
  - `returns the first response when every compared model fails`

What these tests prove:

- a model failure is turned into a predictable response object instead of crashing the whole flow
- successful model outputs are preferred when at least one model succeeds
- the API still returns a consistent response shape even when all models fail

### Scenario 3.3

```text
The chat request itself must still be valid and safe before fallback behavior can work correctly.
```

Implementation responsibility:

- `src/lib/chat-logic.js` validates and sanitizes messages before they reach model routing

Unit tests that support this scenario:

- `spec/chat_logic_spec.js`
  - `rejects empty messages`
  - `rejects messages above the max length`
  - `sanitizes malformed history messages`

What these tests prove:

- fallback and resilience logic are only applied to valid requests
- malformed input does not destabilize the compare-mode flow

## Summary Traceability Table

| User Story / Scenario | Implementation Area | Jasmine Coverage |
| --- | --- | --- |
| Story 1: one prompt to multiple LLMs | `chat-selection-logic.js`, `chat-api-logic.js`, `chat-logic.js` | `spec/chat_selection_logic_spec.js`, `spec/chat_api_logic_spec.js`, `spec/chat_logic_spec.js` |
| Story 2: compare chosen LLMs | `chat-selection-logic.js`, `chat-api-logic.js` | `spec/chat_selection_logic_spec.js`, `spec/chat_api_logic_spec.js` |
| Story 2: still support one LLM | `chat-selection-logic.js`, `chat-api-logic.js` | `spec/chat_selection_logic_spec.js`, `spec/chat_api_logic_spec.js` |
| Story 3: avoid single point of failure | `chat-api-logic.js`, `chat-selection-logic.js`, `chat-logic.js` | `spec/chat_api_logic_spec.js`, `spec/chat_selection_logic_spec.js`, `spec/chat_logic_spec.js` |

## Result

The multi-LLM compare feature is not verified by a single large unit test. Instead, each use case is implemented and validated through a series of smaller Jasmine tests that cover:

- model selection correctness
- single-vs-compare mode behavior
- backend model resolution
- invalid selection handling
- partial failure handling
- safe primary-response selection
- request validation and chat-history sanitization

This series-based approach makes the feature easier to maintain, easier to debug, and easier to trace back to the original use cases and scenarios.
