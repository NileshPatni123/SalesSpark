# VIVA_NOTES.md — SalesSpark BDA Project

## 🎤 1-Minute Project Introduction

> "Good morning Sir/Ma'am. My project is **SalesSpark** — a scalable e-commerce analytics system powered by Apache Spark. I have generated 500,000 synthetic sales orders representing a full year of 2024 transactions across 6 product categories, 5 regions, and 5 payment modes, complete with festive-season demand peaks. The system uses Apache Spark for all data processing — including Spark SQL for ad-hoc analytics, RDD MapReduce for product counting, and Spark MLlib KMeans for customer segmentation. The frontend is a React dashboard that connects to a FastAPI backend running PySpark. Every single number on the screen is computed in real-time by Spark — nothing is hardcoded."

---

## 🏗️ Architecture — Step by Step

```
sales.csv (500K rows)
   ↓ spark.read.csv(inferSchema=True)
Raw DataFrame (partitioned across CPU cores)
   ↓ dropna() + dropDuplicates(["order_id"])
Clean DataFrame (~490K rows, 2% dupes + 1% nulls removed)
   ↓ withColumn("revenue", qty * price * (1 - disc/100))
   ↓ withColumn("month", month(order_date))
Transformed DataFrame
   ↓ cache()  ← pinned in RAM for fast repeated access
Cached DataFrame
   ├── DataFrame API → groupBy/agg → REST endpoints → React charts
   ├── Spark SQL → createOrReplaceTempView("sales") → SQL Lab
   ├── RDD API → .rdd.map().reduceByKey() → MapReduce Visualizer
   └── MLlib → VectorAssembler → StandardScaler → KMeans → Segmentation
          ↓
      FastAPI (port 8000) → React Frontend (port 5173)
```

---

## ❓ 15 Viva Q&As

### Q1: Why did you choose Apache Spark over traditional approaches?
**A:** Spark provides three key advantages: (1) **In-memory processing** — data stays in RAM between operations, 10–100x faster than Hadoop's disk-based MapReduce. (2) **Unified API** — one framework for SQL, batch, streaming, and ML. (3) **Fault tolerance** — RDD lineage graph allows automatic re-computation if a node fails. For this project, Spark processes 500K rows with sub-second query response on a single machine.

---

### Q2: Explain Spark's architecture.
**A:** Spark follows a **master-worker architecture**. The **Driver** (our main.py) creates the SparkContext, builds the DAG, and coordinates. **Executors** run tasks on worker nodes. In local[*] mode (our setup), the driver and all executors run on the same machine using all CPU cores. In a cluster, executors run on separate machines managed by YARN/Mesos/Kubernetes.

---

### Q3: What is lazy evaluation?
**A:** Spark builds a **DAG (Directed Acyclic Graph)** of transformations but doesn't execute them until an **action** is called. Transformations (map, filter, groupBy) are lazy. Actions (count, collect, show) trigger execution. This allows Catalyst Optimizer to look at the entire pipeline and optimize before running — e.g., pushing filters down to scan less data.

---

### Q4: Explain RDD vs DataFrame vs Dataset.
**A:** 
- **RDD**: Low-level, untyped distributed collection. Manual optimization. Used for our MapReduce demo.
- **DataFrame**: Distributed table with named columns and types. Optimized by Catalyst. Used for all analytics.
- **Dataset**: Strongly typed DataFrame (Scala/Java). Not available in Python (PyDataFrame is always untyped).

DataFrames are preferred because Catalyst generates optimized byte-code; RDDs give you full control when needed.

---

### Q5: What is caching and why is it important?
**A:** `cache()` persists a DataFrame in executor memory (RAM) as serialized Java objects. Without caching, every API call would re-read sales.csv and re-run all transformations (~5 seconds). With caching, queries hit RAM and return in ~100–300ms. We cache after the clean+transform step so all downstream queries — SQL, MapReduce, MLlib — benefit from it.

---

### Q6: Explain your Spark pipeline stages.
**A:**
1. **Ingest**: `spark.read.csv(inferSchema=True)` — auto-detects schema
2. **dropna**: removes rows with null order_id, customer_id, category, etc.
3. **dropDuplicates(["order_id"])**: removes duplicate orders
4. **withColumn("revenue")**: derived feature: qty × price × (1 - disc/100)
5. **withColumn("month")**: extracts month from order_date
6. **cache()**: pins result in RAM — triggers materialization

---

### Q7: How does Spark SQL work internally?
**A:** `createOrReplaceTempView("sales")` registers the DataFrame as a SQL view. SQL queries go through: (1) **Parser** → SQL string to AST, (2) **Analyzer** → resolve column names/types, (3) **Catalyst Optimizer** → rewrite logical plan (push down filters, eliminate redundant ops), (4) **Physical Planner** → choose join strategies, generate RDD code, (5) **Tungsten** → code generation for JVM bytecode execution.

---

### Q8: Explain your MapReduce implementation.
**A:** 
```python
rdd = df.select("product").rdd
mapped = rdd.map(lambda r: (r[0], 1))      # MAP: each product → (product, 1)
reduced = mapped.reduceByKey(lambda a,b: a+b)  # REDUCE: sum all 1s per product
top15 = reduced.sortBy(lambda x: -x[1]).take(15)
```
The shuffle happens between map and reduce — Spark groups all (product, 1) pairs with the same key across partitions. This is equivalent to Hadoop MapReduce but runs in memory.

---

### Q9: Explain KMeans and how MLlib implements it.
**A:** KMeans groups N data points into k clusters by minimizing **inertia** (sum of squared distances to cluster center). Algorithm: (1) Randomly pick k centroids, (2) Assign each point to nearest centroid, (3) Recompute centroids as means, (4) Repeat until convergence. Our pipeline: VectorAssembler combines [total_revenue, order_count, avg_order_value] → StandardScaler normalizes → KMeans clusters → silhouette score validates.

---

### Q10: What is the silhouette score?
**A:** Silhouette(i) = (b(i) - a(i)) / max(a(i), b(i)), where a(i) = mean distance to same cluster, b(i) = mean distance to nearest other cluster. Range: -1 (wrong cluster) to 1 (perfect separation). Average across all points = silhouette score. We show this on the gauge chart to justify our choice of k.

---

### Q11: What are partitions and why do they matter?
**A:** Partitions are chunks of data distributed across executor cores. By default, Spark creates partitions equal to `defaultParallelism` (usually = number of CPU cores). More partitions = more parallelism = faster processing. You can control with `repartition(n)` or `coalesce(n)`. Our config uses 8 shuffle partitions (`spark.sql.shuffle.partitions=8`) — suitable for our 500K row dataset on a single machine.

---

### Q12: How does fault tolerance work in Spark?
**A:** Spark tracks the **lineage** of every RDD/DataFrame — a graph of transformations from the source. If a partition is lost (executor failure), Spark re-computes only that partition from the last persisted checkpoint using the lineage. DataFrames can also be checkpointed to disk for breaking long lineage chains. This is the "Resilient" in RDD.

---

### Q13: Why synthetic data? What are its limitations?
**A:** Synthetic data avoids privacy regulations (GDPR/PDPA), is reproducible with a fixed random seed, and can be designed with specific patterns (festive peaks, skewed customers) for demonstration. Limitation: it lacks the true "messiness" of real data — real e-commerce has returns, fraud, carrier-specific anomalies, and temporal correlations that synthetic data approximates but doesn't perfectly replicate.

---

### Q14: How would you scale this to 50 billion rows in production?
**A:** (1) Move data to **HDFS** across a 20-node cluster, (2) Run Spark in **YARN cluster mode** with 10 executor nodes × 8 cores × 16GB RAM each, (3) Use **Delta Lake** for ACID transactions and schema evolution, (4) Add **Kafka + Spark Structured Streaming** for real-time ingestion, (5) Use **HiveMetastore** for persistent table management, (6) Store segment results in **Cassandra/HBase** for low-latency API serving.

---

### Q15: Compare HDFS, Hive, and YARN.
**A:**
| | Purpose | Our Equivalent |
|---|---|---|
| **HDFS** | Distributed file storage (fault-tolerant, 3x replicated) | Local filesystem with sales.csv |
| **Hive** | SQL warehouse on HDFS; Spark SQL reads Hive tables | Our Spark SQL "sales" tempView |
| **YARN** | Resource manager (allocates CPU/RAM to Spark jobs) | Local[*] mode (uses all cores directly) |

In production: Data on HDFS → Hive table → Spark reads via HiveContext → YARN manages resources.

---

## 📋 Quick Demo Checklist
- [ ] Backend started and Spark initialized
- [ ] Landing page loaded and animated
- [ ] Dashboard shows all 4 KPI cards with real numbers
- [ ] At least one filter change tested
- [ ] SQL Lab ran one preset query successfully
- [ ] MapReduce animation completed
- [ ] KMeans ran with k=3, silhouette score visible
- [ ] Pipeline page shows real row counts
- [ ] Viva Mode 5V cards flipped
- [ ] Q&A accordion opened for at least 3 questions
- [ ] Light/Dark theme toggle demonstrated
- [ ] Explain Drawer (?) opened on at least one page

---

*Good luck tomorrow! You've got this. 🔥*
