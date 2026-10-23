<<<<<<< HEAD
# SalesSpark ⚡
### Enterprise Big Data Analytics & Customer Segmentation Engine powered by Apache Spark

[![Apache Spark](https://img.shields.io/badge/Apache_Spark-3.5.1-E25A1C?style=for-the-badge&logo=apachespark&logoColor=white)](https://spark.apache.org/)
[![PySpark](https://img.shields.io/badge/PySpark-Python_3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://spark.apache.org/docs/latest/api/python/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.3-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](#license)

---

## 📌 Overview

**SalesSpark** is a high-performance big data analytics platform engineered to process **500,000 distributed e-commerce transactions** in real time using **Apache Spark**. 

Unlike conventional dashboard solutions relying on disk-bound database queries, SalesSpark leverages Spark's **in-memory resilient distributed datasets (RDDs)** and **Catalyst-optimized DataFrames** to deliver sub-second multi-dimensional aggregation, dynamic SQL querying, animated distributed MapReduce execution, and algorithmic customer segmentation via **PySpark MLlib KMeans**.

Every single chart, aggregation metric, and cluster on the screen is computed live by Apache Spark — with live execution time badges (e.g., `⚡ Spark job: 0.18s`) confirming zero pre-computation.

---

## 🏗️ System Architecture & Data Pipeline

```
┌────────────────────────────────────────────────────────────────────────┐
│                        INGESTION & CLEANING                            │
│  sales.csv (500,000 raw rows / 38.9 MB)                                │
│       ↓  spark.read.csv(inferSchema=True)                              │
│  Distributed Raw DataFrame (10 parallel partitions across CPU cores)   │
│       ↓  .dropna() + .dropDuplicates(["order_id"])                     │
│  Clean DataFrame (485,328 records, 14,672 dirty rows removed)          │
│       ↓  .withColumn("revenue") + .withColumn("month")                 │
│  Transformed DataFrame                                                 │
│       ↓  .cache() + .count()                                           │
│  Pinned In-Memory RAM Storage                                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌──────────────┐            ┌──────────────┐            ┌──────────────┐
│  DATAFRAME   │            │  SPARK SQL   │            │ PYSPARK RDD  │
│     API      │            │   CATALYST   │            │  MAPREDUCE   │
│ Multi-dim    │            │ Ad-hoc query │            │ map() and    │
│ Aggregations │            │ optimizer    │            │ reduceByKey()│
└───────┬──────┘            └───────┬──────┘            └───────┬──────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        DISTRIBUTED ML PIPELINE                         │
│  VectorAssembler  ──►  StandardScaler  ──►  KMeans Clustering (k=3..6) │
│  Silhouette Evaluation (~0.62) & Elbow Curve (Inertia Analysis)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FASTAPI ASYNC REST LAYER                        │
│  Uvicorn Server (Port 8000) ──► JSON Responses with Spark Execution MS │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        REACTIVE PRESENTATION                           │
│  React 18 + Vite + Tailwind CSS + Framer Motion + Recharts (Port 5173) │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Core Application Modules

### 1. 📊 Executive Analytics Dashboard (`/dashboard`)
* **Real-time KPIs**: Direct Spark aggregations (`count()`, `sum()`, `avg()`, `countDistinct()`).
* **Time-Series Revenue Analysis**: 12-month trend tracking featuring festive season demand surges (Diwali, Christmas, Holi).
* **Multi-Dimensional Matrix**: Region $\times$ Category cross-tabulation heatmap.
* **Live Execution Badges**: Real-time timer badge on each visual (`⚡ Spark job: 0.18s`).

### 2. ⚡ Spark SQL Workbench (`/sql`)
* Direct ad-hoc SQL query console querying the registered in-memory table `sales`.
* Full Catalyst query execution plan inspector (`HashAggregate`, `Project`, `Filter` pushdowns).
* Dynamic tabular visualization with auto-generated charts and CSV export.

### 3. 🔄 Low-Level RDD MapReduce Visualizer (`/mapreduce`)
* Interactive animated 3-stage breakdown of distributed data flow:
  1. **Map Stage**: Emits key-value pairs `(product_name, 1)` across input partitions.
  2. **Shuffle Stage**: Data re-hashed and re-distributed across network boundaries.
  3. **Reduce Stage**: `reduceByKey(add)` combines counts into total volume per product.

### 4. 👥 Customer Segmentation Studio (`/segmentation`)
* Machine learning customer clustering powered by **PySpark MLlib**.
* Computes **RFM features** (Recency, Frequency, Monetary Value) for 50,000 customers.
* Feature pipeline: `VectorAssembler` $\to$ `StandardScaler` $\to$ `KMeans(k=3..6)`.
* Visual **Elbow Curve** and **Silhouette Score** validation (~0.62 at $K=3$).

### 5. 🏗️ DAG Execution Pipeline (`/pipeline`)
* Visual representation of the Spark Directed Acyclic Graph (DAG).
* Real-time metrics on memory usage, CPU partitions, deduplication stats, and cache status.

---

## 📁 Repository Structure

```
SalesSpark/
├── backend/
│   ├── main.py              # FastAPI application + PySpark session & endpoints
│   ├── generate_data.py     # 500,000 synthetic transaction generator
│   └── requirements.txt     # Python backend dependencies
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx          # Interactive landing page with cluster stats
│   │   │   ├── Dashboard.jsx        # Executive KPIs, time-series, heatmap
│   │   │   ├── SQLLab.jsx           # Spark SQL interactive query workbench
│   │   │   ├── MapReducePage.jsx    # Distributed Map -> Shuffle -> Reduce visualizer
│   │   │   ├── SegmentationPage.jsx # PySpark MLlib KMeans clustering & elbow curve
│   │   │   └── PipelinePage.jsx     # Spark DAG execution flow & cluster topology
│   │   ├── components/
│   │   │   ├── Sidebar.jsx          # Responsive collapsible navigation
│   │   │   ├── TopBar.jsx           # Global multi-dimensional filters
│   │   │   └── UI.jsx               # Reusable glassmorphic UI components
│   │   ├── store.js                 # Global Zustand state management
│   │   ├── api.js                  # Axios REST API client
│   │   └── App.jsx                 # Application routing
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── data/
│   └── sales.csv           # 500,000 transactional records (38.9 MB)
├── SalesSpark_Viva_Presentation_Guide.pdf  # 6-page comprehensive exam & viva guide
├── VIVA_NOTES.md           # 15 Rapid-Fire Viva Q&As + 1-Minute Pitch
├── start.bat               # Windows one-click launcher
├── start.sh                # Linux / macOS one-click launcher
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
* **Java**: OpenJDK 17 LTS ([Adoptium Temurin 17](https://adoptium.net/))
* **Python**: 3.10 or higher ([python.org](https://www.python.org/))
* **Node.js**: 18.0 or higher ([nodejs.org](https://nodejs.org/))

Ensure `JAVA_HOME` is configured in your system environment variables:
```bash
# Windows PowerShell
setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot"
setx PATH "%PATH%;%JAVA_HOME%\bin"
```

---

### One-Command Launch

#### Windows:
```cmd
cd SalesSpark
start.bat
```

#### Linux / macOS:
```bash
cd SalesSpark
chmod +x start.sh
./start.sh
```

The script will automatically install missing dependencies, start the PySpark backend on `http://localhost:8000`, and start the React frontend on `http://localhost:5173`.

---

### Manual Setup

#### 1. Backend Setup:
```bash
cd backend
python -m pip install -r requirements.txt
python main.py
```
*Backend runs on `http://localhost:8000` (API Docs at `http://localhost:8000/docs`).*

#### 2. Frontend Setup:
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 🔌 REST API Endpoints

| HTTP | Endpoint | Description | Engine |
|---|---|---|---|
| `GET` | `/api/health` | Health & active SparkContext check | `SparkSession` |
| `GET` | `/api/pipeline` | Ingestion, cleaning & partition metrics | PySpark DataFrame |
| `GET` | `/api/kpis` | Aggregates (Revenue, Orders, AOV, Customers) | `count()`, `sum()`, `avg()` |
| `GET` | `/api/monthly` | 12-month time-series with festive peaks | `groupBy("month")` |
| `GET` | `/api/category` | Category revenue & order volume breakdown | `groupBy("category")` |
| `GET` | `/api/products` | Top revenue and highest quantity products | `orderBy().limit(N)` |
| `GET` | `/api/region` | Geographical sales distribution | `groupBy("region")` |
| `GET` | `/api/payment` | Payment mode transaction shares | `groupBy("payment_mode")` |
| `GET` | `/api/heatmap` | Region $\times$ Category cross-matrix | `groupBy().pivot()` |
| `POST` | `/api/sql` | Spark Catalyst ad-hoc SQL query runner | Spark Catalyst SQL |
| `GET` | `/api/mapreduce` | Low-level distributed key-value aggregation | PySpark RDD API |
| `GET` | `/api/segmentation` | Unsupervised RFM customer clustering | Spark MLlib KMeans |

---

## 🎓 Viva & Examination Materials

This repository includes academic presentation materials:
* 📄 **[`SalesSpark_Viva_Presentation_Guide.pdf`](./SalesSpark_Viva_Presentation_Guide.pdf)**: A 6-page external examination defense document containing the 60-second pitch, big data terminology glossary, system architecture diagrams, and 15 examiner Q&As.
* 📝 **[`VIVA_NOTES.md`](./VIVA_NOTES.md)**: Markdown quick-reference card for presentation day.

---

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.
#   S a l e s S p a r k s  
 
=======
# SalesSpark
Big Data Analytics Project SalesSpark
>>>>>>> 9257bfd8d49c4db4dbbf80698dd59c8d0e48e463
