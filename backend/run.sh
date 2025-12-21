#!/bin/bash
# Run script for the FastAPI backend

# Activate virtual environment (from root)
source ../.venv/bin/activate

# Run the server
echo "Starting FastAPI server on http://localhost:8000"
uvicorn app.main:app --reload --port 8000


