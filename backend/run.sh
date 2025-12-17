#!/bin/bash
# Run script for the FastAPI backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies if needed
if [ ! -f "venv/.installed" ]; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
    touch venv/.installed
fi

# Check for API key
if [ -z "$OPENAI_API_KEY" ]; then
    echo "Warning: OPENAI_API_KEY environment variable is not set"
    echo "Please set it with: export OPENAI_API_KEY=your_key_here"
fi

# Run the server
echo "Starting FastAPI server on http://localhost:8000"
uvicorn app.main:app --reload --port 8000


