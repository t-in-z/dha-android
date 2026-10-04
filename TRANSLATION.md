# Translation setup

The repository contains 1,591 nursing questions. The translation workflow creates Arabic and Hindi versions of all textual content.

## One-time setup

Add a repository secret:

GitHub -> Settings -> Secrets and variables -> Actions -> New repository secret

Name:
GEMINI_API_KEY

Use a Google AI Studio/Gemini API key.

## Run

GitHub -> Actions -> Translate Question Bank -> Run workflow

The workflow translates category, topic, difficulty, question, every option, explanation, and subcategory. The numeric answer index is kept unchanged, so the option at that same index remains the correct answer in every language.

The translation model is gemini-3.5-flash-lite by default.
