# Provider terms check (BB-41)

Status: not yet verified. Owner: Jhade (AI) and James (speech).

Each row must be filled in from the provider's current terms, with a link and the date read. "Not yet verified" means nobody has read the terms for this row. Do not fill a row from memory.

If a provider does not suit a children's product, switch tier or provider before any pilot (ADR 0002).

## Google Gemini (story, verifier, notes)

| Question                                                             | Answer           | Source and date read |
| -------------------------------------------------------------------- | ---------------- | -------------------- |
| Which tier and API is in use (paid API, free tier, Vertex AI)?       | Not yet verified |                      |
| Can prompts and outputs be used for training or product improvement? | Not yet verified |                      |
| How long are prompts and outputs kept, and why (abuse monitoring)?   | Not yet verified |                      |
| Can retention be turned off (zero data retention)?                   | Not yet verified |                      |
| Do the terms allow use in a product for children under 13 or 18?     | Not yet verified |                      |
| Where is data processed?                                             | Not yet verified |                      |

Note for the reader: Google's terms usually differ between the free tier and paid tiers on training use. Confirm which applies to the key the AI Gateway uses.

## Vercel AI Gateway

| Question                                                                 | Answer           | Source and date read |
| ------------------------------------------------------------------------ | ---------------- | -------------------- |
| Does the gateway log prompt and output content?                          | Not yet verified |                      |
| How long are logs kept?                                                  | Not yet verified |                      |
| Can prompt logging be turned off for our project?                        | Not yet verified |                      |
| Does the gateway pass our request to Google under our terms or Vercel's? | Not yet verified |                      |

## Speech provider (chosen in the bake-off, BB-22)

| Question                                           | Answer           | Source and date read |
| -------------------------------------------------- | ---------------- | -------------------- |
| Provider and product                               | Not yet chosen   |                      |
| Is audio used for training or model improvement?   | Not yet verified |                      |
| Is audio or the transcript kept after the request? | Not yet verified |                      |
| Can retention and training be turned off?          | Not yet verified |                      |
| Do the terms allow children's voices?              | Not yet verified |                      |
| Where is audio processed?                          | Not yet verified |                      |

## Email provider (guardian approval, password reset)

| Question                                     | Answer           | Source and date read |
| -------------------------------------------- | ---------------- | -------------------- |
| Provider                                     | Not yet chosen   |                      |
| How long are sent emails and addresses kept? | Not yet verified |                      |

## Prompt content test

ADR 0002 and BB-41 require a test that proves story and verifier prompts contain only levels, topic seeds and story text. The story side is in `packages/story-ai/src/prompt.test.ts` and `generate.test.ts` (BB-15). The verifier side belongs with BB-17. The test should:

1. Build every prompt from typed inputs that have no identity fields.
2. Assert the serialised prompt contains none of a set of planted values: a username, an email, a guardian email and a learner ID.
3. Assert the input type has only the allowed keys, so a new field fails the test.
