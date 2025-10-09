# Analyzer App Setup

This directory contains scripts for analyzing participant data with Hume AI.

## Recommended Environment Setup (using Conda)

The Python environment for this project has dependencies that may fail to build from source using `pip` on some systems (e.g., `numpy`). It is highly recommended to use the `conda` package manager to create a stable environment.

### 1. Create and Activate Conda Environment

If you don't have Conda, please install [Miniconda](https://docs.conda.io/en/latest/miniconda.html) or [Anaconda](https://www.anaconda.com/products/distribution).

```bash
# Create a new conda environment with Python 3.11
conda create -n spirit-in-physics python=3.11 pip

# Activate the environment
conda activate spirit-in-physics
```

### 2. Install Dependencies

First, install compiled scientific packages like `numpy` using Conda to ensure you get pre-built binaries. Then, install the rest of the packages using `pip` and the `requirements.txt` file.

```bash
# Install numpy using conda
conda install numpy

# Install the rest of the dependencies using pip
pip install -r requirements.txt
```

### 3. Running Scripts

Once the environment is set up and activated, you can run the analysis scripts.

```bash
# Example: Run the Hume AI job processing script
python run_hume_jobs.py
```
