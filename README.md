# YT TrendLens — YouTube Trending Analysis Platform

A full-stack machine learning web application that analyzes YouTube trending videos.

## 🚀 Quick Start (Local)

```bash
bash start.sh
```
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 🗂️ Project Structure

```
youtube-analysis/
├── frontend/          # Next.js app (Vercel-deployable)
├── backend/           # FastAPI + ML backend
│   ├── main.py        # All API endpoints
│   └── requirements.txt
├── start.sh           # One-command launcher
└── vercel.json        # Vercel config
```

## 📊 Features

- **Data Overview** — Stats, top videos, category breakdown
- **8 Interactive Charts** — Views, categories, engagement, correlation, word cloud, etc.
- **ML Training** — Random Forest, Gradient Boosting, Logistic Regression
- **Viral Predictor** — Predict if your video will go viral

## ☁️ Deploy to Vercel

> **Note**: Vercel hosts the frontend. Deploy the Python backend separately (Railway, Render, Fly.io, etc.)

### Frontend (Vercel)
```bash
cd frontend
npm run build
npx vercel --prod
```

### Backend (e.g. Railway)
1. Push `backend/` to a GitHub repo
2. Connect to Railway → Deploy
3. Update `next.config.js` `API_URL` env variable to your deployed backend URL

## 📁 Dataset

Upload `USvideos.csv` from the web interface. Dataset available at:
https://www.kaggle.com/datasets/datasnaek/youtube-new

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, TypeScript, CSS |
| Backend | FastAPI, Python 3.x |
| ML | scikit-learn (RF, GBM, LR) |
| Charts | matplotlib, seaborn, wordcloud |
| Deploy | Vercel (frontend) + Railway/Render (backend) |
