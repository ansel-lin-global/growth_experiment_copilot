# Setup Guide - Next Steps

## Step 1: Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

If you encounter any issues, make sure you're using Python 3.10+ and have a virtual environment activated.

## Step 2: Set Up Environment Variables

Create a `.env` file in the `backend/` directory (or export in your shell):

```bash
export OPENAI_API_KEY=your_openai_api_key_here
```

Or create `backend/.env`:
```
OPENAI_API_KEY=your_openai_api_key_here
```

Optional: You can also set:
```
LLM_MODEL=gpt-4o-mini
LLM_TEMPERATURE=0.3
```

## Step 3: Test Backend Installation

Run the unit tests to verify everything is working:

```bash
cd backend
pytest
```

You should see tests passing for `test_stats_calculator` and `test_causal_analyzer`.

## Step 4: Start the Backend Server

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

The API will be available at:
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

## Step 5: Install Frontend Dependencies

In a new terminal:

```bash
cd frontend
npm install
```

## Step 6: Start the Frontend Server

```bash
cd frontend
npm run dev
```

The frontend will be available at: http://localhost:3000

## Step 7: Test the Application

1. **Open the frontend**: http://localhost:3000
2. **Test Experiment Design**:
   - Go to "Experiment Design" page
   - Enter: "I want to test a new homepage banner and see if it increases add-to-cart rate"
   - Optionally fill in baseline rate (e.g., 0.10) and MDE (e.g., 0.20)
   - Click "Design Experiment"
   - You should see an experiment design card and AI explanation

3. **Test A/B Analysis**:
   - Go to "Results Analysis" page
   - Select "A/B Test Analysis" mode
   - The form should have default data pre-filled
   - Click "Analyze A/B Test"
   - You should see results table and AI interpretation

## Troubleshooting

### Backend Issues

- **Import errors**: Make sure you're in the `backend/` directory and have activated your virtual environment
- **OpenAI API errors**: Verify your `OPENAI_API_KEY` is set correctly
- **Port already in use**: Change the port with `--port 8001` or kill the process using port 8000

### Frontend Issues

- **Cannot connect to backend**: Make sure backend is running on port 8000
- **CORS errors**: Check that backend CORS is configured for `http://localhost:3000`
- **Build errors**: Make sure Node.js version is 18+ and run `npm install` again

## Quick Start Script

You can also use the provided run script:

```bash
cd backend
./run.sh
```

This will:
- Create/activate virtual environment
- Install dependencies if needed
- Check for API key
- Start the server

## Next Development Steps

1. **Add more test cases** in `backend/app/tests/`
2. **Enhance UI** with more interactive features
3. **Add CSV upload** for analysis data
4. **Improve error handling** and user feedback
5. **Add logging** for debugging

