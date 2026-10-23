"""
SalesSpark Backend - FastAPI + PySpark
All analytics powered by real Spark computations.
"""
import os
import sys
import time
import json
import re
import math
import logging
from typing import Optional, List
from functools import lru_cache
from contextlib import asynccontextmanager

import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ─── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("salesspark")

# ─── Java Auto-Discovery ──────────────────────────────────────────────────
if not os.environ.get("JAVA_HOME"):
    candidate_dirs = [
        os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "jdk-17")),
        os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "jdk-17")),
        os.path.normpath(os.path.join(os.path.dirname(__file__), "jdk-17")),
        r"C:\Program Files\Eclipse Adoptium",
        r"C:\Program Files\Java",
        r"C:\Program Files\Microsoft",
    ]
    for cdir in candidate_dirs:
        if os.path.exists(cdir):
            if os.path.exists(os.path.join(cdir, "bin", "java.exe")):
                os.environ["JAVA_HOME"] = cdir
                os.environ["PATH"] = os.path.join(cdir, "bin") + os.pathsep + os.environ.get("PATH", "")
                log.info(f"[Java] Auto-detected JAVA_HOME at {cdir}")
                break
            try:
                for sub in os.listdir(cdir):
                    subpath = os.path.join(cdir, sub)
                    if os.path.isdir(subpath) and os.path.exists(os.path.join(subpath, "bin", "java.exe")):
                        os.environ["JAVA_HOME"] = subpath
                        os.environ["PATH"] = os.path.join(subpath, "bin") + os.pathsep + os.environ.get("PATH", "")
                        log.info(f"[Java] Auto-detected JAVA_HOME at {subpath}")
                        break
            except Exception:
                pass
            if os.environ.get("JAVA_HOME"):
                break

# ─── Spark Init ─────────────────────────────────────────────────────────────
os.environ.setdefault("PYSPARK_PYTHON", sys.executable)
os.environ.setdefault("PYSPARK_DRIVER_PYTHON", sys.executable)

try:
    from pyspark.sql import SparkSession
    from pyspark.sql import functions as F
    from pyspark.sql.types import DoubleType
    from pyspark.ml.feature import VectorAssembler, StandardScaler
    from pyspark.ml.clustering import KMeans
    from pyspark.ml.evaluation import ClusteringEvaluator
    SPARK_AVAILABLE = True
except ImportError as e:
    SPARK_AVAILABLE = False
    log.error(f"PySpark not available: {e}")

# ─── Globals ────────────────────────────────────────────────────────────────
spark = None
sdf = None          # clean Spark DataFrame (cached)
pipeline_stats = {}
DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "sales.csv")
DATA_PATH = os.path.normpath(DATA_PATH)

# ─── Data Generation ────────────────────────────────────────────────────────
def ensure_data():
    if not os.path.exists(DATA_PATH):
        log.info("[DataGen] sales.csv not found – generating...")
        sys.path.insert(0, os.path.dirname(__file__))
        from generate_data import generate_data
        generate_data(output_path=DATA_PATH)
    else:
        log.info(f"[DataGen] Found existing sales.csv at {DATA_PATH}")

# ─── Spark Session ───────────────────────────────────────────────────────────
def init_spark():
    global spark, sdf, pipeline_stats
    if not SPARK_AVAILABLE:
        return

    log.info("[Spark] Initialising SparkSession local[*] ...")
    t0 = time.time()

    spark = (
        SparkSession.builder
        .master("local[*]")
        .appName("SalesSpark")
        .config("spark.sql.shuffle.partitions", "8")
        .config("spark.driver.memory", "2g")
        .config("spark.sql.legacy.timeParserPolicy", "LEGACY")
        .config("spark.ui.enabled", "false")
        .config("spark.driver.extraJavaOptions", "-Dfile.encoding=UTF-8")
        .getOrCreate()
    )
    spark.sparkContext.setLogLevel("ERROR")
    log.info(f"[Spark] Session started in {time.time()-t0:.1f}s  version={spark.version}")

    # ── Pipeline ──────────────────────────────────────────────────────────
    log.info("[Pipeline] Loading CSV...")
    raw = spark.read.csv(DATA_PATH, header=True, inferSchema=True)
    raw_count = raw.count()
    partitions = raw.rdd.getNumPartitions()

    log.info(f"[Pipeline] Raw rows={raw_count:,}  partitions={partitions}")

    # Clean
    clean = (
        raw
        .dropna(subset=["order_id","order_date","customer_id","category","region","quantity","unit_price"])
        .dropDuplicates(["order_id"])
        .withColumn("revenue",
            F.col("quantity").cast(DoubleType()) *
            F.col("unit_price").cast(DoubleType()) *
            (1 - F.col("discount_pct").cast(DoubleType()) / 100)
        )
        .withColumn("month", F.month(F.to_date(F.col("order_date"), "yyyy-MM-dd")))
        .withColumn("order_date_ts", F.to_date(F.col("order_date"), "yyyy-MM-dd"))
    )

    clean.cache()
    clean_count = clean.count()  # triggers cache
    removed = raw_count - clean_count

    load_time = time.time() - t0
    cores = spark.sparkContext.defaultParallelism

    pipeline_stats = {
        "raw_rows": raw_count,
        "clean_rows": clean_count,
        "removed_rows": removed,
        "partitions": partitions,
        "spark_version": spark.version,
        "cores": cores,
        "load_time_s": round(load_time, 2),
    }

    sdf = clean
    log.info(f"[Pipeline] Clean={clean_count:,}  removed={removed:,}  done in {load_time:.1f}s")

    # Register SQL table
    sdf.createOrReplaceTempView("sales")
    log.info("[Pipeline] Spark SQL view 'sales' registered")

# ─── Filter helper ──────────────────────────────────────────────────────────
def apply_filters(df, categories=None, regions=None, date_from=None, date_to=None):
    if categories:
        df = df.filter(F.col("category").isin(categories))
    if regions:
        df = df.filter(F.col("region").isin(regions))
    if date_from:
        df = df.filter(F.col("order_date_ts") >= date_from)
    if date_to:
        df = df.filter(F.col("order_date_ts") <= date_to)
    return df

def timed(func, *args, **kwargs):
    t = time.time()
    result = func(*args, **kwargs)
    return result, round((time.time() - t) * 1000, 1)

def safe_float(v):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return 0.0
    return float(v)

def safe_int(v):
    if v is None:
        return 0
    return int(v)

# ─── Lifespan ────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_data()
    init_spark()
    yield
    if spark:
        spark.stop()

app = FastAPI(title="SalesSpark API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Endpoints ───────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "spark": SPARK_AVAILABLE,
        "data_loaded": sdf is not None,
    }

# Global memory cache for default unfiltered queries (instant sub-10ms response)
_cache = {}

@app.get("/api/meta")
def meta():
    if sdf is None:
        raise HTTPException(503, "Spark not ready")
    if "meta" in _cache:
        return _cache["meta"]
    t0 = time.time()
    cats = [r[0] for r in sdf.select("category").distinct().orderBy("category").collect()]
    regs = [r[0] for r in sdf.select("region").distinct().orderBy("region").collect()]
    dates = sdf.agg(F.min("order_date").alias("mn"), F.max("order_date").alias("mx")).collect()[0]
    ms = round((time.time() - t0) * 1000, 1)
    res = {
        "categories": cats,
        "regions": regs,
        "date_min": str(dates["mn"]),
        "date_max": str(dates["mx"]),
        "spark_ms": ms,
        "pipeline": pipeline_stats,
    }
    _cache["meta"] = res
    return res

@app.get("/api/pipeline")
def pipeline():
    return {**pipeline_stats, "spark_ms": 0}

@app.get("/api/kpis")
def kpis(
    categories: Optional[str] = None,
    regions: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    if sdf is None:
        raise HTTPException(503, "Spark not ready")
    cats = categories.split(",") if categories else None
    regs = regions.split(",") if regions else None
    if not cats and not regs and not date_from and not date_to and "kpis" in _cache:
        return _cache["kpis"]

    t0 = time.time()
    df = apply_filters(sdf, cats, regs, date_from, date_to)

    agg = df.agg(
        F.count("order_id").alias("orders"),
        F.sum("revenue").alias("revenue"),
        F.avg("revenue").alias("avg_order"),
        F.countDistinct("customer_id").alias("customers"),
    ).collect()[0]

    ms = round((time.time() - t0) * 1000, 1)
    res = {
        "orders": safe_int(agg["orders"]),
        "revenue": safe_float(agg["revenue"]),
        "avg_order": safe_float(agg["avg_order"]),
        "customers": safe_int(agg["customers"]),
        "spark_ms": ms,
    }
    if not cats and not regs and not date_from and not date_to:
        _cache["kpis"] = res
    return res

@app.get("/api/monthly")
def monthly(
    categories: Optional[str] = None,
    regions: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    if sdf is None:
        raise HTTPException(503, "Spark not ready")
    cats = categories.split(",") if categories else None
    regs = regions.split(",") if regions else None
    if not cats and not regs and not date_from and not date_to and "monthly" in _cache:
        return _cache["monthly"]

    t0 = time.time()
    df = apply_filters(sdf, cats, regs, date_from, date_to)

    rows = (
        df.groupBy("month")
        .agg(
            F.sum("revenue").alias("revenue"),
            F.count("order_id").alias("orders"),
        )
        .orderBy("month")
        .collect()
    )
    month_names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    ms = round((time.time() - t0) * 1000, 1)
    res = {
        "data": [
            {
                "month": month_names[r["month"] - 1] if r["month"] else "?",
                "month_num": safe_int(r["month"]),
                "revenue": safe_float(r["revenue"]),
                "orders": safe_int(r["orders"]),
            }
            for r in rows
        ],
        "spark_ms": ms,
    }
    if not cats and not regs and not date_from and not date_to:
        _cache["monthly"] = res
    return res

@app.get("/api/category")
def category(
    categories: Optional[str] = None,
    regions: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    if sdf is None:
        raise HTTPException(503, "Spark not ready")
    cats = categories.split(",") if categories else None
    regs = regions.split(",") if regions else None
    if not cats and not regs and not date_from and not date_to and "category" in _cache:
        return _cache["category"]

    t0 = time.time()
    df = apply_filters(sdf, cats, regs, date_from, date_to)

    rows = (
        df.groupBy("category")
        .agg(
            F.sum("revenue").alias("revenue"),
            F.count("order_id").alias("orders"),
            F.avg("discount_pct").alias("avg_discount"),
        )
        .orderBy(F.desc("revenue"))
        .collect()
    )
    ms = round((time.time() - t0) * 1000, 1)
    res = {
        "data": [
            {
                "category": r["category"],
                "revenue": safe_float(r["revenue"]),
                "orders": safe_int(r["orders"]),
                "avg_discount": safe_float(r["avg_discount"]),
            }
            for r in rows
        ],
        "spark_ms": ms,
    }
    if not cats and not regs and not date_from and not date_to:
        _cache["category"] = res
    return res

@app.get("/api/products")
def products(
    limit: int = 10,
    categories: Optional[str] = None,
    regions: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    if sdf is None:
        raise HTTPException(503, "Spark not ready")
    cats = categories.split(",") if categories else None
    regs = regions.split(",") if regions else None
    ckey = f"products_{limit}"
    if not cats and not regs and not date_from and not date_to and ckey in _cache:
        return _cache[ckey]

    t0 = time.time()
    df = apply_filters(sdf, cats, regs, date_from, date_to)

    rows = (
        df.groupBy("product", "category")
        .agg(
            F.sum("revenue").alias("revenue"),
            F.count("order_id").alias("orders"),
        )
        .orderBy(F.desc("revenue"))
        .limit(int(limit))
        .collect()
    )
    ms = round((time.time() - t0) * 1000, 1)
    res = {
        "data": [
            {
                "product": r["product"],
                "category": r["category"],
                "revenue": safe_float(r["revenue"]),
                "orders": safe_int(r["orders"]),
            }
            for r in rows
        ],
        "spark_ms": ms,
    }
    if not cats and not regs and not date_from and not date_to:
        _cache[ckey] = res
    return res

@app.get("/api/region")
def region(
    categories: Optional[str] = None,
    regions: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    if sdf is None:
        raise HTTPException(503, "Spark not ready")
    cats = categories.split(",") if categories else None
    regs = regions.split(",") if regions else None
    if not cats and not regs and not date_from and not date_to and "region" in _cache:
        return _cache["region"]

    t0 = time.time()
    df = apply_filters(sdf, cats, regs, date_from, date_to)

    rows = (
        df.groupBy("region")
        .agg(
            F.sum("revenue").alias("revenue"),
            F.count("order_id").alias("orders"),
            F.countDistinct("customer_id").alias("customers"),
        )
        .orderBy(F.desc("revenue"))
        .collect()
    )
    ms = round((time.time() - t0) * 1000, 1)
    res = {
        "data": [
            {
                "region": r["region"],
                "revenue": safe_float(r["revenue"]),
                "orders": safe_int(r["orders"]),
                "customers": safe_int(r["customers"]),
            }
            for r in rows
        ],
        "spark_ms": ms,
    }
    if not cats and not regs and not date_from and not date_to:
        _cache["region"] = res
    return res

@app.get("/api/payment")
def payment(
    categories: Optional[str] = None,
    regions: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    if sdf is None:
        raise HTTPException(503, "Spark not ready")
    cats = categories.split(",") if categories else None
    regs = regions.split(",") if regions else None
    if not cats and not regs and not date_from and not date_to and "payment" in _cache:
        return _cache["payment"]

    t0 = time.time()
    df = apply_filters(sdf, cats, regs, date_from, date_to)

    rows = (
        df.groupBy("payment_mode")
        .agg(
            F.sum("revenue").alias("revenue"),
            F.count("order_id").alias("orders"),
        )
        .orderBy(F.desc("orders"))
        .collect()
    )
    ms = round((time.time() - t0) * 1000, 1)
    res = {
        "data": [
            {
                "payment_mode": r["payment_mode"],
                "revenue": safe_float(r["revenue"]),
                "orders": safe_int(r["orders"]),
            }
            for r in rows
        ],
        "spark_ms": ms,
    }
    if not cats and not regs and not date_from and not date_to:
        _cache["payment"] = res
    return res

@app.get("/api/heatmap")
def heatmap(
    categories: Optional[str] = None,
    regions: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    if sdf is None:
        raise HTTPException(503, "Spark not ready")
    cats = categories.split(",") if categories else None
    regs = regions.split(",") if regions else None
    if not cats and not regs and not date_from and not date_to and "heatmap" in _cache:
        return _cache["heatmap"]

    t0 = time.time()
    df = apply_filters(sdf, cats, regs, date_from, date_to)

    rows = (
        df.groupBy("region", "category")
        .agg(F.sum("revenue").alias("revenue"))
        .collect()
    )
    ms = round((time.time() - t0) * 1000, 1)
    res = {
        "data": [
            {
                "region": r["region"],
                "category": r["category"],
                "revenue": safe_float(r["revenue"]),
            }
            for r in rows
        ],
        "spark_ms": ms,
    }
    if not cats and not regs and not date_from and not date_to:
        _cache["heatmap"] = res
    return res

@app.get("/api/insights")
def insights(
    categories: Optional[str] = None,
    regions: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    if sdf is None:
        raise HTTPException(503, "Spark not ready")
    cats = categories.split(",") if categories else None
    regs = regions.split(",") if regions else None
    if not cats and not regs and not date_from and not date_to and "insights" in _cache:
        return _cache["insights"]

    t0 = time.time()
    df = apply_filters(sdf, cats, regs, date_from, date_to)

    total = df.agg(F.sum("revenue").alias("r"), F.count("*").alias("c")).collect()[0]
    total_rev = safe_float(total["r"])
    total_orders = safe_int(total["c"])

    cat_row = df.groupBy("category").agg(F.sum("revenue").alias("r")).orderBy(F.desc("r")).first()
    reg_row = df.groupBy("region").agg(F.sum("revenue").alias("r")).orderBy(F.desc("r")).first()
    pay_row = df.groupBy("payment_mode").agg(F.count("*").alias("c")).orderBy(F.desc("c")).first()
    month_row = df.groupBy("month").agg(F.sum("revenue").alias("r")).orderBy(F.desc("r")).first()
    month_names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

    messages = []
    if cat_row:
        pct = round(safe_float(cat_row["r"]) / total_rev * 100, 1) if total_rev > 0 else 0
        messages.append(f"📦 {cat_row['category']} is the top revenue category at {pct}% of total sales.")
    if reg_row:
        messages.append(f"🗺️ {reg_row['region']} leads all regions in revenue generation.")
    if pay_row:
        messages.append(f"💳 {pay_row['payment_mode']} is the most popular payment mode by order count.")
    if month_row and month_row['month']:
        mname = month_names[int(month_row['month']) - 1]
        messages.append(f"📅 {mname} is the best-performing month — driven by festive season demand.")
    if total_orders > 0:
        messages.append(f"⚡ Spark processed {total_orders:,} clean orders across {pipeline_stats.get('partitions',8)} partitions in parallel.")

    ms = round((time.time() - t0) * 1000, 1)
    res = {"insights": messages, "spark_ms": ms}
    if not cats and not regs and not date_from and not date_to:
        _cache["insights"] = res
    return res

class SQLRequest(BaseModel):
    query: str
    categories: Optional[str] = None
    regions: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None

@app.post("/api/sql")
def run_sql(req: SQLRequest):
    if sdf is None:
        raise HTTPException(503, "Spark not ready")

    query = req.query.strip()

    # Security: SELECT only
    if not re.match(r"^\s*SELECT\b", query, re.IGNORECASE):
        raise HTTPException(400, "Only SELECT queries are allowed for safety.")
    if re.search(r"\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC)\b", query, re.IGNORECASE):
        raise HTTPException(400, "Only SELECT queries are allowed.")

    # Inject filter as a CTE if filters active
    cats = req.categories.split(",") if req.categories else None
    regs = req.regions.split(",") if req.regions else None
    df = apply_filters(sdf, cats, regs, req.date_from, req.date_to)
    try:
        df.createOrReplaceTempView("sales")
    except Exception:
        # If Spark session restarted, re-register from original sdf
        sdf.createOrReplaceTempView("sales")

    # Wrap with limit
    if not re.search(r'\bLIMIT\b', query, re.IGNORECASE):
        query = query.rstrip(";") + " LIMIT 1000"

    t0 = time.time()
    try:
        result = spark.sql(query)
        rows = result.limit(1000).collect()
        cols = result.columns
        try:
            plan = result._jdf.queryExecution().simpleString()[:500]
        except Exception:
            plan = "Physical plan: distributed Spark execution via Catalyst Optimizer"
    except Exception as e:
        err_msg = str(e)
        # Trim huge Java stacktraces for a clean frontend message
        if "\n" in err_msg:
            err_msg = err_msg.split("\n")[0]
        raise HTTPException(400, f"Spark SQL error: {err_msg}")

    ms = round((time.time() - t0) * 1000, 1)
    return {
        "columns": cols,
        "rows": [[str(v) if v is not None else None for v in r] for r in rows],
        "row_count": len(rows),
        "spark_ms": ms,
        "plan_summary": plan,
    }

@app.get("/api/mapreduce")
def mapreduce(
    categories: Optional[str] = None,
    regions: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    if sdf is None:
        raise HTTPException(503, "Spark not ready")
    t0 = time.time()
    cats = categories.split(",") if categories else None
    regs = regions.split(",") if regions else None
    df = apply_filters(sdf, cats, regs, date_from, date_to)

    # Map -> (product, 1)  ->  reduceByKey -> count
    try:
        rdd = df.select("product").rdd
        mapped = rdd.map(lambda r: (r[0], 1))
        reduced = mapped.reduceByKey(lambda a, b: a + b)
        top15 = reduced.takeOrdered(15, key=lambda x: -x[1])
        sample_mapped = mapped.take(30)
        top15_list = [{"product": str(k), "count": int(v)} for k, v in top15]
        sample_pairs = [{"key": str(k), "value": int(v)} for k, v in sample_mapped]
    except Exception as e:
        log.warning(f"[MapReduce] Falling back to DataFrame aggregation: {e}")
        res = df.groupBy("product").count().orderBy(F.col("count").desc()).limit(15).collect()
        top15_list = [{"product": str(r["product"]), "count": int(r["count"])} for r in res]
        sample_pairs = [{"key": str(r["product"]), "value": 1} for r in res[:15]]

    ms = round((time.time() - t0) * 1000, 1)
    return {
        "top15": top15_list,
        "sample_map_pairs": sample_pairs,
        "spark_ms": ms,
        "map_code": "rdd.map(lambda r: (r['product'], 1))",
        "reduce_code": ".reduceByKey(lambda a, b: a + b)",
    }

@app.get("/api/segmentation")
def segmentation(
    k: int = 3,
    categories: Optional[str] = None,
    regions: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    if sdf is None:
        raise HTTPException(503, "Spark not ready")
    if k < 2 or k > 6:
        raise HTTPException(400, "k must be between 2 and 6")

    t0 = time.time()
    cats = categories.split(",") if categories else None
    regs = regions.split(",") if regions else None
    df = apply_filters(sdf, cats, regs, date_from, date_to)

    # Aggregate per customer
    cust = df.groupBy("customer_id").agg(
        F.sum("revenue").alias("total_revenue"),
        F.count("order_id").alias("order_count"),
        F.avg("revenue").alias("avg_order_value"),
    ).dropna()

    total_customers = cust.count()
    if total_customers < k * 10:
        raise HTTPException(400, f"Not enough customers ({total_customers}) for k={k}")

    # Sample for speed (max 20k for clustering)
    sample_ratio = min(1.0, 20000 / total_customers)
    cust_sample = cust.sample(withReplacement=False, fraction=sample_ratio, seed=42)

    assembler = VectorAssembler(
        inputCols=["total_revenue", "order_count", "avg_order_value"],
        outputCol="features",
        handleInvalid="skip",
    )
    scaler = StandardScaler(inputCol="features", outputCol="scaled_features", withStd=True, withMean=True)
    
    assembled = assembler.transform(cust_sample)
    scaler_model = scaler.fit(assembled)
    scaled = scaler_model.transform(assembled)

    kmeans = KMeans(featuresCol="scaled_features", k=k, seed=42, maxIter=20)
    model = kmeans.fit(scaled)
    predictions = model.transform(scaled)

    evaluator = ClusteringEvaluator(featuresCol="scaled_features")
    silhouette = evaluator.evaluate(predictions)

    # Segment summary
    summary = (
        predictions.groupBy("prediction")
        .agg(
            F.count("customer_id").alias("count"),
            F.avg("total_revenue").alias("avg_revenue"),
            F.avg("order_count").alias("avg_orders"),
            F.avg("avg_order_value").alias("avg_order_value"),
        )
        .orderBy("avg_revenue")
        .collect()
    )

    persona_names = {
        0: ("💎", "Premium Buyers", "Exclusive offers & loyalty rewards"),
        1: ("🔥", "Active Shoppers", "Flash sales & bundled deals"),
        2: ("🌱", "Occasional Buyers", "Re-engagement campaigns & welcome coupons"),
        3: ("⭐", "Rising Stars", "Category-specific discounts"),
        4: ("🏆", "VIP Champions", "VIP membership & personalized deals"),
        5: ("💤", "At-Risk Customers", "Win-back emails & time-limited offers"),
    }

    # Sort by avg_revenue to assign meaningful personas
    sorted_summary = sorted(summary, key=lambda r: safe_float(r["avg_revenue"]))
    persona_labels = ["🌱 Occasional Buyers", "🔥 Active Shoppers", "💎 Premium Buyers",
                      "⭐ Rising Stars", "🏆 VIP Champions", "💤 At-Risk"]
    marketing_actions = [
        "Re-engagement campaigns & welcome coupons",
        "Flash sales & bundled deals",
        "Exclusive offers & loyalty rewards",
        "Category-specific discounts",
        "VIP membership & personalized deals",
        "Win-back emails & time-limited offers",
    ]

    segments_out = []
    for i, r in enumerate(sorted_summary):
        label = persona_labels[i] if i < len(persona_labels) else f"Segment {i}"
        action = marketing_actions[i] if i < len(marketing_actions) else "Personalized offers"
        segments_out.append({
            "id": safe_int(r["prediction"]),
            "name": label,
            "count": safe_int(r["count"]),
            "avg_revenue": safe_float(r["avg_revenue"]),
            "avg_orders": safe_float(r["avg_orders"]),
            "avg_order_value": safe_float(r["avg_order_value"]),
            "marketing_action": action,
        })

    # Scatter sample (max 1500)
    scatter_sample = predictions.select(
        "total_revenue", "order_count", "avg_order_value", "prediction"
    ).limit(1500).collect()

    scatter = [
        {
            "x": safe_float(r["total_revenue"]),
            "y": safe_float(r["order_count"]),
            "z": safe_float(r["avg_order_value"]),
            "segment": safe_int(r["prediction"]),
        }
        for r in scatter_sample
    ]

    # Elbow data k=2..6
    elbow_data = []
    for ek in range(2, 7):
        ekm = KMeans(featuresCol="scaled_features", k=ek, seed=42, maxIter=20)
        em = ekm.fit(scaled)
        inertia = float(em.summary.trainingCost)
        epred = em.transform(scaled)
        try:
            esil = float(evaluator.evaluate(epred))
        except:
            esil = 0.0
        elbow_data.append({"k": ek, "inertia": inertia, "silhouette": esil})

    ms = round((time.time() - t0) * 1000, 1)
    return {
        "k": k,
        "silhouette": round(silhouette, 4),
        "segments": segments_out,
        "scatter": scatter,
        "elbow": elbow_data,
        "spark_ms": ms,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
