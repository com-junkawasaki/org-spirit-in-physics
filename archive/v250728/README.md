# Spirit in Physics

This project contains the interactive components and documentation for the "Spirit in Physics" research paper.

## Overview

This project is a self-contained module that exports React components for visualizing and interacting with the Kawasaki Model and Jung's Word Association Test data. It also contains the MDX source for the research paper itself.

## Usage

This project is intended to be used as a dependency in other web projects. The main exports are:

-   `SpiritInPhysicsInteractive`: The main interactive component that combines the voice assessment and visualization.
-   `KawasakiModel`: The component for the Kawasaki Model visualization.
-   `JungWordTest`: The component for the classic Jung Word Association Test.
-   `JungVoiceAssessment`: The component for the voice-based Jung Word Association Test.
-   `JungEmbeddingVisualization`: The component for visualizing the word embeddings.

### Installation

To use this package in another project, add it as a dependency with a file path:

```json
"dependencies": {
  "@gftdcojp/spirit-in-physics": "file:../spirit-in-physics"
}
```

Then, import the components as needed:

```javascript
import { SpiritInPhysicsInteractive } from '@gftdcojp/spirit-in-physics';
```

## Documentation

The source for the research paper can be found in `/docs/index.mdx`. 