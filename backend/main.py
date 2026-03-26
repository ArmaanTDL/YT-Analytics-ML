from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import json
import io
import base64
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib import rcParams
from wordcloud import WordCloud
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.feature_extraction.text import TfidfVectorizer
import warnings
warnings.filterwarnings("ignore")

app = FastAPI(title="YouTube Trending Analysis API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
df_global = None
CATEGORY_MAP = {
    "1": "Film & Animation", "2": "Autos & Vehicles", "10": "Music",
    "15": "Pets & Animals", "17": "Sports", "18": "Short Movies",
    "19": "Travel & Events", "20": "Gaming", "21": "Videoblogging",
    "22": "People & Blogs", "23": "Comedy", "24": "Entertainment",
    "25": "News & Politics", "26": "Howto & Style", "27": "Education",
    "28": "Science & Technology", "29": "Nonprofits & Activism",
    "30": "Movies", "31": "Anime/Animation", "32": "Action/Adventure",
    "33": "Classics", "34": "Comedy", "35": "Documentary",
    "36": "Drama", "37": "Family", "38": "Foreign",
    "39": "Horror", "40": "Sci-Fi/Fantasy", "41": "Thriller",
    "42": "Shorts", "43": "Shows", "44": "Trailers"
}

PLOT_COLORS = ["#7C3AED", "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
               "#8B5CF6", "#06B6D4", "#84CC16", "#F97316", "#EC4899"]

def setup_style():
    plt.style.use("dark_background")
    rcParams['figure.facecolor'] = '#0F0F1A'
    rcParams['axes.facecolor'] = '#1A1A2E'
    rcParams['axes.edgecolor'] = '#333355'
    rcParams['axes.labelcolor'] = '#A0A0C0'
    rcParams['xtick.color'] = '#A0A0C0'
    rcParams['ytick.color'] = '#A0A0C0'
    rcParams['text.color'] = '#E0E0FF'
    rcParams['grid.color'] = '#2A2A4A'
    rcParams['grid.linewidth'] = 0.5

def fig_to_base64(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=120, facecolor=fig.get_facecolor())
    buf.seek(0)
    encoded = base64.b64encode(buf.read()).decode("utf-8")
    plt.close(fig)
    return f"data:image/png;base64,{encoded}"

def preprocess(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["description"] = df["description"].fillna("")
    df["title_length"] = df["title"].apply(lambda x: len(str(x)))
    df["tag_count"] = df["tags"].apply(lambda x: len(str(x).split("|")))
    df["contains_capitalized"] = df["title"].apply(
        lambda s: any(w.isupper() and len(w) > 1 for w in str(s).split())
    )
    df["like_dislike_ratio"] = df["likes"] / (df["dislikes"] + 1)
    df["engagement_rate"] = (df["likes"] + df["dislikes"] + df["comment_count"]) / (df["views"] + 1)
    df["category_name"] = df["category_id"].astype(str).map(CATEGORY_MAP).fillna("Other")
    if "trending_date" in df.columns:
        try:
            df["trending_date"] = pd.to_datetime(df["trending_date"], format="%y.%d.%m", errors="coerce")
            df["day_of_week"] = df["trending_date"].dt.dayofweek
        except:
            df["day_of_week"] = 0
    return df

@app.get("/")
def root():
    return {"message": "YouTube Trending Analysis API", "status": "running"}

@app.post("/api/upload")
async def upload_dataset(file: UploadFile = File(...)):
    global df_global
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    content = await file.read()
    try:
        df_global = pd.read_csv(io.BytesIO(content), encoding="utf-8", on_bad_lines="skip")
    except:
        df_global = pd.read_csv(io.BytesIO(content), encoding="latin-1", on_bad_lines="skip")
    df_global = preprocess(df_global)
    return {
        "message": "Dataset loaded successfully",
        "rows": len(df_global),
        "columns": list(df_global.columns),
        "shape": {"rows": len(df_global), "cols": len(df_global.columns)}
    }

@app.get("/api/overview")
def get_overview():
    if df_global is None:
        raise HTTPException(status_code=400, detail="No dataset loaded")
    df = df_global
    numeric_cols = ["views", "likes", "dislikes", "comment_count"]
    stats = {}
    for col in numeric_cols:
        if col in df.columns:
            stats[col] = {
                "mean": round(float(df[col].mean()), 2),
                "median": round(float(df[col].median()), 2),
                "max": round(float(df[col].max()), 2),
                "min": round(float(df[col].min()), 2),
                "std": round(float(df[col].std()), 2),
            }
    top_viewed = df.nlargest(5, "views")[["title", "views", "likes", "channel_title"]].copy()
    top_viewed["views"] = top_viewed["views"].apply(lambda x: int(x))
    top_viewed["likes"] = top_viewed["likes"].apply(lambda x: int(x))
    
    category_dist = {}
    if "category_name" in df.columns:
        category_dist = df["category_name"].value_counts().head(10).to_dict()

    return {
        "total_videos": len(df),
        "unique_channels": int(df["channel_title"].nunique()) if "channel_title" in df.columns else 0,
        "stats": stats,
        "top_viewed": top_viewed.to_dict(orient="records"),
        "category_distribution": category_dist,
    }

@app.get("/api/charts/views-distribution")
def chart_views_distribution():
    if df_global is None:
        raise HTTPException(status_code=400, detail="No dataset loaded")
    setup_style()
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    fig.patch.set_facecolor('#0F0F1A')

    # Views histogram
    ax1 = axes[0]
    ax1.set_facecolor('#1A1A2E')
    views = df_global["views"].clip(upper=df_global["views"].quantile(0.95))
    ax1.hist(views, bins=40, color=PLOT_COLORS[0], alpha=0.85, edgecolor='none')
    ax1.set_xlabel("Views", fontsize=12, color='#A0A0C0')
    ax1.set_ylabel("Number of Videos", fontsize=12, color='#A0A0C0')
    ax1.set_title("Views Distribution", fontsize=14, color='#E0E0FF', fontweight='bold', pad=15)
    ax1.grid(True, alpha=0.3)

    # Log scale views
    ax2 = axes[1]
    ax2.set_facecolor('#1A1A2E')
    ax2.hist(np.log1p(df_global["views"]), bins=40, color=PLOT_COLORS[1], alpha=0.85, edgecolor='none')
    ax2.set_xlabel("Log(Views)", fontsize=12, color='#A0A0C0')
    ax2.set_ylabel("Number of Videos", fontsize=12, color='#A0A0C0')
    ax2.set_title("Views Distribution (Log Scale)", fontsize=14, color='#E0E0FF', fontweight='bold', pad=15)
    ax2.grid(True, alpha=0.3)

    plt.tight_layout(pad=3)
    return {"image": fig_to_base64(fig), "title": "Views Distribution"}

@app.get("/api/charts/category-analysis")
def chart_category_analysis():
    if df_global is None:
        raise HTTPException(status_code=400, detail="No dataset loaded")
    setup_style()
    fig, axes = plt.subplots(1, 2, figsize=(15, 6))
    fig.patch.set_facecolor('#0F0F1A')

    cat_counts = df_global["category_name"].value_counts().head(12)

    ax1 = axes[0]
    ax1.set_facecolor('#1A1A2E')
    bars = ax1.barh(cat_counts.index[::-1], cat_counts.values[::-1],
                    color=PLOT_COLORS[:len(cat_counts)], alpha=0.9)
    ax1.set_xlabel("Number of Videos", fontsize=11, color='#A0A0C0')
    ax1.set_title("Videos per Category", fontsize=14, color='#E0E0FF', fontweight='bold', pad=15)
    ax1.grid(True, axis='x', alpha=0.3)
    for bar, val in zip(bars, cat_counts.values[::-1]):
        ax1.text(val + 10, bar.get_y() + bar.get_height()/2,
                 f'{val:,}', va='center', ha='left', fontsize=8, color='#C0C0E0')

    ax2 = axes[1]
    ax2.set_facecolor('#0F0F1A')
    cat_views = df_global.groupby("category_name")["views"].mean().sort_values(ascending=False).head(10)
    colors_pie = [PLOT_COLORS[i % len(PLOT_COLORS)] for i in range(len(cat_views))]
    wedges, texts, autotexts = ax2.pie(
        cat_views.values, labels=cat_views.index,
        colors=colors_pie, autopct='%1.1f%%',
        textprops={'color': '#E0E0FF', 'fontsize': 8},
        startangle=90, pctdistance=0.8
    )
    for at in autotexts:
        at.set_color('#FFFFFF')
        at.set_fontsize(7)
    ax2.set_title("Avg Views Share by Category", fontsize=14, color='#E0E0FF', fontweight='bold', pad=15)

    plt.tight_layout(pad=3)
    return {"image": fig_to_base64(fig), "title": "Category Analysis"}

@app.get("/api/charts/engagement")
def chart_engagement():
    if df_global is None:
        raise HTTPException(status_code=400, detail="No dataset loaded")
    setup_style()
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    fig.patch.set_facecolor('#0F0F1A')

    # Scatter: views vs likes
    ax1 = axes[0]
    ax1.set_facecolor('#1A1A2E')
    sample = df_global.sample(min(3000, len(df_global)), random_state=42)
    sc = ax1.scatter(sample["views"], sample["likes"],
                     c=sample["dislikes"], cmap='plasma',
                     alpha=0.5, s=15, edgecolors='none')
    plt.colorbar(sc, ax=ax1, label='Dislikes')
    ax1.set_xlabel("Views", fontsize=11, color='#A0A0C0')
    ax1.set_ylabel("Likes", fontsize=11, color='#A0A0C0')
    ax1.set_title("Views vs Likes", fontsize=14, color='#E0E0FF', fontweight='bold', pad=15)
    ax1.grid(True, alpha=0.2)

    # Title length vs views
    ax2 = axes[1]
    ax2.set_facecolor('#1A1A2E')
    ax2.scatter(sample["title_length"], np.log1p(sample["views"]),
                color=PLOT_COLORS[2], alpha=0.4, s=12, edgecolors='none')
    ax2.set_xlabel("Title Length (chars)", fontsize=11, color='#A0A0C0')
    ax2.set_ylabel("Log(Views)", fontsize=11, color='#A0A0C0')
    ax2.set_title("Title Length vs Views", fontsize=14, color='#E0E0FF', fontweight='bold', pad=15)
    ax2.grid(True, alpha=0.2)

    plt.tight_layout(pad=3)
    return {"image": fig_to_base64(fig), "title": "Engagement Analysis"}

@app.get("/api/charts/correlation")
def chart_correlation():
    if df_global is None:
        raise HTTPException(status_code=400, detail="No dataset loaded")
    setup_style()
    fig, ax = plt.subplots(figsize=(10, 7))
    fig.patch.set_facecolor('#0F0F1A')
    ax.set_facecolor('#1A1A2E')

    cols = [c for c in ["views", "likes", "dislikes", "comment_count",
                         "title_length", "tag_count", "like_dislike_ratio",
                         "engagement_rate", "contains_capitalized"] if c in df_global.columns]
    corr = df_global[cols].corr()

    labels = [c.replace('_', ' ').title() for c in cols]
    mask = np.zeros_like(corr, dtype=bool)
    mask[np.triu_indices_from(mask, k=1)] = True

    sns.heatmap(corr, annot=True, fmt=".2f", xticklabels=labels, yticklabels=labels,
                cmap="RdYlGn", mask=mask, ax=ax, linewidths=0.5, linecolor='#1A1A2E',
                annot_kws={"size": 8}, center=0)
    ax.set_title("Feature Correlation Matrix", fontsize=15, color='#E0E0FF', fontweight='bold', pad=20)
    ax.tick_params(colors='#A0A0C0', labelsize=8)
    plt.xticks(rotation=35, ha='right')

    plt.tight_layout()
    return {"image": fig_to_base64(fig), "title": "Correlation Heatmap"}

@app.get("/api/charts/wordcloud")
def chart_wordcloud():
    if df_global is None:
        raise HTTPException(status_code=400, detail="No dataset loaded")
    
    stop_words = set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
                       'for', 'of', 'is', 'it', 'this', 'that', 'with', 'are', 'was',
                       'be', 'by', 'from', 'as', 'he', 'she', 'we', 'they', 'I', 'you',
                       'my', 'your', 'our', 'their', 'its', 'i', '2', '1', '3', 'amp'])
    
    all_titles = " ".join(df_global["title"].astype(str).tolist())
    wc = WordCloud(
        width=1400, height=600,
        background_color=None,
        mode="RGBA",
        collocations=False,
        stopwords=stop_words,
        colormap="Set2",
        max_words=150,
        prefer_horizontal=0.8,
        min_font_size=10,
    ).generate(all_titles)

    fig, ax = plt.subplots(figsize=(14, 6))
    fig.patch.set_facecolor('#0F0F1A')
    ax.set_facecolor('#0F0F1A')
    ax.imshow(wc, interpolation="bilinear")
    ax.axis("off")
    ax.set_title("Most Common Title Words", fontsize=16, color='#E0E0FF',
                 fontweight='bold', pad=15)
    plt.tight_layout()
    return {"image": fig_to_base64(fig), "title": "Word Cloud"}

@app.get("/api/charts/title-analysis")
def chart_title_analysis():
    if df_global is None:
        raise HTTPException(status_code=400, detail="No dataset loaded")
    setup_style()
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    fig.patch.set_facecolor('#0F0F1A')

    # Pie: capitalized words
    ax1 = axes[0]
    ax1.set_facecolor('#0F0F1A')
    cap_counts = df_global["contains_capitalized"].value_counts()
    cap_labels = ['No Caps', 'Has Caps']
    cap_vals = [cap_counts.get(False, 0), cap_counts.get(True, 0)]
    wedges, texts, autotexts = ax1.pie(
        cap_vals, labels=cap_labels,
        colors=['#3B82F6', '#F59E0B'],
        autopct='%1.1f%%', startangle=60,
        textprops={'color': '#E0E0FF', 'fontsize': 12},
        wedgeprops={'edgecolor': '#0F0F1A', 'linewidth': 3}
    )
    for at in autotexts:
        at.set_fontweight('bold')
    ax1.set_title("Titles with ALL CAPS Word", fontsize=14, color='#E0E0FF', fontweight='bold', pad=15)

    # Title length distribution
    ax2 = axes[1]
    ax2.set_facecolor('#1A1A2E')
    ax2.hist(df_global["title_length"], bins=35, color=PLOT_COLORS[3],
             alpha=0.85, edgecolor='none', rwidth=0.9)
    ax2.set_xlabel("Title Length (Characters)", fontsize=11, color='#A0A0C0')
    ax2.set_ylabel("Number of Videos", fontsize=11, color='#A0A0C0')
    ax2.set_title("Title Length Distribution", fontsize=14, color='#E0E0FF', fontweight='bold', pad=15)
    ax2.axvline(df_global["title_length"].mean(), color='#EF4444', linestyle='--',
                linewidth=1.5, label=f'Mean: {df_global["title_length"].mean():.1f}')
    ax2.legend(fontsize=10)
    ax2.grid(True, alpha=0.3)

    plt.tight_layout(pad=3)
    return {"image": fig_to_base64(fig), "title": "Title Analysis"}

@app.get("/api/charts/likes-dislikes")
def chart_likes_dislikes():
    if df_global is None:
        raise HTTPException(status_code=400, detail="No dataset loaded")
    setup_style()
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    fig.patch.set_facecolor('#0F0F1A')

    cat_views = df_global.groupby("category_name").agg(
        avg_likes=("likes", "mean"),
        avg_dislikes=("dislikes", "mean"),
        avg_views=("views", "mean"),
    ).sort_values("avg_views", ascending=False).head(10)

    ax1 = axes[0]
    ax1.set_facecolor('#1A1A2E')
    x = range(len(cat_views))
    w = 0.35
    ax1.bar([i - w/2 for i in x], cat_views["avg_likes"], width=w,
            color=PLOT_COLORS[2], label="Avg Likes", alpha=0.9)
    ax1.bar([i + w/2 for i in x], cat_views["avg_dislikes"], width=w,
            color=PLOT_COLORS[4], label="Avg Dislikes", alpha=0.9)
    ax1.set_xticks(list(x))
    ax1.set_xticklabels(cat_views.index, rotation=40, ha='right', fontsize=8)
    ax1.set_title("Avg Likes vs Dislikes by Category", fontsize=13, color='#E0E0FF', fontweight='bold', pad=15)
    ax1.legend()
    ax1.grid(True, axis='y', alpha=0.3)

    ax2 = axes[1]
    ax2.set_facecolor('#1A1A2E')
    df_global["log_views"] = np.log1p(df_global["views"])
    top_cats = df_global["category_name"].value_counts().head(6).index
    df_box = df_global[df_global["category_name"].isin(top_cats)]
    cat_order = df_box.groupby("category_name")["log_views"].median().sort_values(ascending=False).index
    colors_box = PLOT_COLORS[:len(cat_order)]
    bp = ax2.boxplot(
        [df_box[df_box["category_name"] == c]["log_views"].dropna().values for c in cat_order],
        labels=cat_order, patch_artist=True, notch=False,
        medianprops=dict(color='white', linewidth=2),
        flierprops=dict(marker='o', markersize=2, alpha=0.3)
    )
    for patch, color in zip(bp['boxes'], colors_box):
        patch.set_facecolor(color)
        patch.set_alpha(0.7)
    ax2.set_xticklabels(cat_order, rotation=35, ha='right', fontsize=8)
    ax2.set_ylabel("Log(Views)", fontsize=10, color='#A0A0C0')
    ax2.set_title("Views Distribution by Top Categories", fontsize=13, color='#E0E0FF', fontweight='bold', pad=15)
    ax2.grid(True, axis='y', alpha=0.3)

    plt.tight_layout(pad=3)
    return {"image": fig_to_base64(fig), "title": "Likes & Dislikes Analysis"}

@app.post("/api/ml/train")
def train_model(model_type: str = "random_forest"):
    if df_global is None:
        raise HTTPException(status_code=400, detail="No dataset loaded")
    df = df_global.copy()

    # Create target: high_viral = top 33% viewed
    threshold = df["views"].quantile(0.67)
    df["viral"] = (df["views"] >= threshold).astype(int)

    features = [c for c in ["title_length", "tag_count", "like_dislike_ratio",
                              "engagement_rate", "contains_capitalized",
                              "dislikes", "comment_count"] if c in df.columns]
    if "category_id" in df.columns:
        features.append("category_id")

    X = df[features].fillna(0)
    y = df["viral"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    models = {
        "random_forest": RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1),
        "gradient_boosting": GradientBoostingClassifier(n_estimators=100, random_state=42),
        "logistic_regression": LogisticRegression(max_iter=1000, random_state=42),
    }

    model = models.get(model_type, models["random_forest"])
    model.fit(X_train_s, y_train)
    y_pred = model.predict(X_test_s)
    acc = accuracy_score(y_test, y_pred)

    # Cross-validation
    cv_scores = cross_val_score(model, X_train_s, y_train, cv=5, scoring='accuracy')

    # Feature importance
    feature_importance = {}
    if hasattr(model, "feature_importances_"):
        fi = model.feature_importances_
        feature_importance = dict(sorted(zip(features, fi.tolist()), key=lambda x: -x[1]))
    elif hasattr(model, "coef_"):
        fi = abs(model.coef_[0])
        feature_importance = dict(sorted(zip(features, fi.tolist()), key=lambda x: -x[1]))

    # Confusion matrix chart
    setup_style()
    fig, axes = plt.subplots(1, 2, figsize=(13, 5))
    fig.patch.set_facecolor('#0F0F1A')

    cm = confusion_matrix(y_test, y_pred)
    ax1 = axes[0]
    ax1.set_facecolor('#1A1A2E')
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=ax1,
                xticklabels=['Not Viral', 'Viral'],
                yticklabels=['Not Viral', 'Viral'],
                linewidths=2, linecolor='#0F0F1A')
    ax1.set_title("Confusion Matrix", fontsize=14, color='#E0E0FF', fontweight='bold', pad=15)
    ax1.set_xlabel("Predicted", color='#A0A0C0')
    ax1.set_ylabel("Actual", color='#A0A0C0')

    ax2 = axes[1]
    ax2.set_facecolor('#1A1A2E')
    fi_sorted = dict(list(feature_importance.items())[:10])
    names = [n.replace('_', ' ').title() for n in fi_sorted.keys()]
    vals = list(fi_sorted.values())
    colors_fi = [PLOT_COLORS[i % len(PLOT_COLORS)] for i in range(len(names))]
    bars = ax2.barh(names[::-1], vals[::-1], color=colors_fi[::-1], alpha=0.9)
    ax2.set_xlabel("Importance Score", fontsize=11, color='#A0A0C0')
    ax2.set_title("Feature Importance", fontsize=14, color='#E0E0FF', fontweight='bold', pad=15)
    ax2.grid(True, axis='x', alpha=0.3)

    plt.tight_layout(pad=3)
    img = fig_to_base64(fig)

    return {
        "model_type": model_type,
        "accuracy": round(float(acc), 4),
        "cv_mean": round(float(cv_scores.mean()), 4),
        "cv_std": round(float(cv_scores.std()), 4),
        "feature_importance": {k: round(v, 4) for k, v in feature_importance.items()},
        "report": classification_report(y_test, y_pred, output_dict=True),
        "image": img,
        "threshold_views": int(threshold),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
    }

@app.post("/api/ml/predict")
def predict_viral(
    title_length: int = 45,
    tag_count: int = 10,
    category_id: int = 24,
    likes: int = 50000,
    dislikes: int = 1000,
    comment_count: int = 5000,
    contains_capitalized: bool = False,
):
    if df_global is None:
        raise HTTPException(status_code=400, detail="No dataset loaded. Please upload dataset first.")
    df = df_global.copy()
    threshold = df["views"].quantile(0.67)
    df["viral"] = (df["views"] >= threshold).astype(int)

    features = [c for c in ["title_length", "tag_count", "like_dislike_ratio",
                              "engagement_rate", "contains_capitalized",
                              "dislikes", "comment_count", "category_id"] if c in df.columns]
    X = df[features].fillna(0)
    y = df["viral"]

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    model.fit(X_scaled, y)

    engagement_rate = (likes + dislikes + comment_count) / (1 + 1)
    like_dislike_ratio = likes / (dislikes + 1)

    input_data = {
        "title_length": title_length,
        "tag_count": tag_count,
        "like_dislike_ratio": like_dislike_ratio,
        "engagement_rate": engagement_rate,
        "contains_capitalized": int(contains_capitalized),
        "dislikes": dislikes,
        "comment_count": comment_count,
        "category_id": category_id,
    }
    input_row = [[input_data.get(f, 0) for f in features]]
    input_scaled = scaler.transform(input_row)

    pred = model.predict(input_scaled)[0]
    prob = model.predict_proba(input_scaled)[0]

    return {
        "prediction": "Viral" if pred == 1 else "Not Viral",
        "viral_probability": round(float(prob[1]), 4),
        "not_viral_probability": round(float(prob[0]), 4),
        "confidence": round(float(max(prob)), 4),
        "threshold_views": int(threshold),
    }

@app.get("/api/charts/top-channels")
def chart_top_channels():
    if df_global is None:
        raise HTTPException(status_code=400, detail="No dataset loaded")
    setup_style()
    fig, axes = plt.subplots(1, 2, figsize=(15, 6))
    fig.patch.set_facecolor('#0F0F1A')

    top_ch = df_global.groupby("channel_title").agg(
        total_views=("views", "sum"),
        video_count=("video_id", "count"),
        avg_likes=("likes", "mean")
    ).sort_values("total_views", ascending=False).head(12)

    ax1 = axes[0]
    ax1.set_facecolor('#1A1A2E')
    colors_ch = [PLOT_COLORS[i % len(PLOT_COLORS)] for i in range(len(top_ch))]
    bars = ax1.barh(top_ch.index[::-1], (top_ch["total_views"] / 1e6)[::-1],
                    color=colors_ch[::-1], alpha=0.9)
    ax1.set_xlabel("Total Views (Millions)", fontsize=11, color='#A0A0C0')
    ax1.set_title("Top 12 Channels by Total Views", fontsize=13, color='#E0E0FF', fontweight='bold', pad=15)
    ax1.grid(True, axis='x', alpha=0.3)

    ax2 = axes[1]
    ax2.set_facecolor('#1A1A2E')
    top_freq = df_global["channel_title"].value_counts().head(12)
    colors_freq = [PLOT_COLORS[i % len(PLOT_COLORS)] for i in range(len(top_freq))]
    ax2.barh(top_freq.index[::-1], top_freq.values[::-1], color=colors_freq[::-1], alpha=0.9)
    ax2.set_xlabel("Number of Trending Videos", fontsize=11, color='#A0A0C0')
    ax2.set_title("Most Frequently Trending Channels", fontsize=13, color='#E0E0FF', fontweight='bold', pad=15)
    ax2.grid(True, axis='x', alpha=0.3)

    plt.tight_layout(pad=3)
    return {"image": fig_to_base64(fig), "title": "Top Channels"}
