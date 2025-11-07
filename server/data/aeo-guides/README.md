# AEO Guide PDFs

This directory is for storing Answer Engine Optimization (AEO) principle PDF documents that will be processed to extract scoring criteria.

## Purpose

According to the specification (FR-051), the system must process and distill two AEO principle PDFs one time into persistent scoring rules. These rules are then used by the scoring engine without reprocessing the PDFs each time.

## Setup Instructions

### 1. Add PDF Files

Place your AEO principle PDF documents in this directory. For example:

```
server/data/aeo-guides/
├── google-aeo-best-practices.pdf
├── aeo-scoring-guidelines.pdf
└── README.md (this file)
```

### 2. Process PDFs

Run the PDF processor to extract and distill principles:

```javascript
const { processAeoGuide } = require('../../services/ai/pdf-processor');

// Process a single PDF
const result = await processAeoGuide(
  '/path/to/server/data/aeo-guides/google-aeo-best-practices.pdf',
  {
    documentType: 'google-aeo-guide',
    saveToFile: true,
    outputDir: '/path/to/server/data/aeo-principles'
  }
);

console.log('Processed principles:', result.principles);
```

### 3. Use Processed Principles

The processed principles will be saved as JSON files in `server/data/aeo-principles/` with timestamps:

```
server/data/aeo-principles/
├── google-aeo-guide-1699564800000.json
├── aeo-scoring-guidelines-1699564900000.json
└── default-rubric.json
```

### 4. Load Principles in Scoring Engine

The scoring engine can load these principles:

```javascript
const { loadPrinciplesFromFile } = require('../../services/ai/pdf-processor');

const principles = await loadPrinciplesFromFile(
  '/path/to/server/data/aeo-principles/google-aeo-guide-1699564800000.json'
);
```

## Processing Multiple PDFs

To process multiple PDF files at once:

```javascript
const { processMultipleGuides } = require('../../services/ai/pdf-processor');

const results = await processMultipleGuides(
  [
    '/path/to/server/data/aeo-guides/google-aeo-best-practices.pdf',
    '/path/to/server/data/aeo-guides/aeo-scoring-guidelines.pdf'
  ],
  {
    saveToFile: true,
    outputDir: '/path/to/server/data/aeo-principles'
  }
);
```

## Merging Principles

If you have multiple principle sets, you can merge them:

```javascript
const { mergePrinciples } = require('../../services/ai/pdf-processor');

const merged = mergePrinciples([result1, result2]);
```

## Default Rubric

Until you process your own PDF files, the system will use the default rubric at `server/data/aeo-principles/default-rubric.json`. This rubric is based on industry best practices for Answer Engine Optimization.

## Requirements

- PDFs must be text-based (not scanned images)
- OpenAI API key must be configured in environment variables
- Processing requires GPT-4-turbo access for best results

## Notes

- PDF processing is a one-time operation (FR-052)
- Processed principles are cached and reused for all scoring operations
- The AI will distill the PDF content into structured scoring criteria
- Token usage will be tracked and can be reviewed in the processing results
