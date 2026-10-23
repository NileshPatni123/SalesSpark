"""
SalesSpark - Synthetic Data Generator
Generates 500,000 e-commerce orders using numpy/pandas (NO Spark write)
to avoid Windows winutils problems.
"""
import os
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import time

def generate_data(output_path: str = "data/sales.csv", n_rows: int = 500_000):
    print(f"[DataGen] Generating {n_rows:,} synthetic orders...")
    t0 = time.time()
    rng = np.random.default_rng(42)

    # Date range: 2024-01-01 to 2024-12-31 with festive-season peaks
    base_date = datetime(2024, 1, 1)
    
    # Create a weight array for each day of the year for festive peaks
    days_in_year = 366  # 2024 is a leap year
    day_weights = np.ones(days_in_year)
    # Festive peaks: Diwali (Oct-Nov), Christmas (Dec), Holi (Mar), Independence Day (Aug)
    day_weights[270:290] *= 4.0   # Oct: Navratri/Dussehra
    day_weights[290:320] *= 5.0   # Nov: Diwali
    day_weights[340:366] *= 3.5   # Dec: Christmas/New Year
    day_weights[60:75]   *= 2.5   # Mar: Holi
    day_weights[210:230] *= 2.0   # Aug: Independence Day + Onam
    day_weights[150:165] *= 1.8   # Jun: Summer sales
    day_weights = day_weights / day_weights.sum()

    day_indices = rng.choice(days_in_year, size=n_rows, p=day_weights)
    order_dates = [base_date + timedelta(days=int(d)) for d in day_indices]

    # Customer IDs: skewed distribution so segments naturally form
    n_customers = 50_000
    customer_probs = np.concatenate([
        np.ones(int(n_customers * 0.20)) * 5.0,   # high value
        np.ones(int(n_customers * 0.30)) * 2.0,   # medium value
        np.ones(int(n_customers * 0.50)) * 1.0,   # low value
    ])
    customer_probs = customer_probs[:n_customers]
    customer_probs /= customer_probs.sum()
    customer_ids = rng.choice([f"C{str(i).zfill(5)}" for i in range(n_customers)], 
                               size=n_rows, p=customer_probs)

    # Categories with product mappings
    categories_products = {
        "Electronics":  ["Smartphone", "Laptop", "Headphones", "Tablet", "Smart TV", "Camera", "Speaker", "Smartwatch"],
        "Fashion":      ["T-Shirt", "Jeans", "Dress", "Sneakers", "Jacket", "Saree", "Kurta", "Handbag"],
        "Home":         ["Mixer", "Pressure Cooker", "Bedsheet", "Curtain", "Sofa", "Air Purifier", "Lamp", "Cookware"],
        "Beauty":       ["Lipstick", "Foundation", "Moisturizer", "Perfume", "Shampoo", "Face Wash", "Serum", "Sunscreen"],
        "Sports":       ["Yoga Mat", "Dumbbell", "Cricket Bat", "Football", "Running Shoes", "Cycling Helmet", "Fitness Band", "Jump Rope"],
        "Books":        ["Novel", "Textbook", "Comics", "Self-Help Book", "Cookbook", "Biography", "Children's Book", "Academic Journal"],
    }
    
    category_weights = np.array([0.28, 0.22, 0.18, 0.12, 0.12, 0.08])
    category_list = list(categories_products.keys())
    
    categories = rng.choice(category_list, size=n_rows, p=category_weights)
    products = np.array([
        rng.choice(categories_products[cat]) for cat in categories
    ])

    regions = rng.choice(["North", "South", "East", "West", "Central"],
                          size=n_rows, p=[0.22, 0.25, 0.18, 0.20, 0.15])

    payment_modes = rng.choice(
        ["UPI", "Credit Card", "Debit Card", "COD", "Net Banking"],
        size=n_rows, p=[0.35, 0.25, 0.18, 0.15, 0.07]
    )

    quantity = rng.choice([1, 2, 3, 4, 5], size=n_rows, p=[0.50, 0.25, 0.12, 0.08, 0.05])

    discount_pct = rng.uniform(0, 40, size=n_rows).round(1)
    electronics_mask = categories == "Electronics"
    fashion_mask = categories == "Fashion"
    discount_pct[electronics_mask] = rng.uniform(5, 45, size=electronics_mask.sum()).round(1)
    discount_pct[fashion_mask] = rng.uniform(10, 50, size=fashion_mask.sum()).round(1)

    price_ranges = {
        "Electronics": (5000, 85000),
        "Fashion":     (299, 8000),
        "Home":        (500, 25000),
        "Beauty":      (100, 3000),
        "Sports":      (200, 5000),
        "Books":       (99, 1500),
    }
    unit_price = np.zeros(n_rows)
    for cat, (low, high) in price_ranges.items():
        mask = categories == cat
        unit_price[mask] = rng.uniform(low, high, size=mask.sum()).round(2)

    order_ids = [f"ORD{str(i).zfill(7)}" for i in range(n_rows)]
    
    n_dupes = int(n_rows * 0.02)
    dupe_indices = rng.choice(n_rows, size=n_dupes, replace=False)
    for idx in dupe_indices:
        order_ids[idx] = order_ids[rng.integers(0, n_rows)]

    df = pd.DataFrame({
        "order_id":     order_ids,
        "order_date":   [d.strftime("%Y-%m-%d") for d in order_dates],
        "customer_id":  customer_ids,
        "category":     categories,
        "product":      products,
        "region":       regions,
        "payment_mode": payment_modes,
        "quantity":     quantity,
        "discount_pct": discount_pct,
        "unit_price":   unit_price,
    })

    n_nulls = int(n_rows * 0.01)
    for col in ["category", "region", "quantity"]:
        null_idx = rng.choice(n_rows, size=n_nulls // 3, replace=False)
        df.loc[null_idx, col] = np.nan

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    elapsed = time.time() - t0
    print(f"[DataGen] Done! {n_rows:,} rows saved to '{output_path}' in {elapsed:.1f}s")
    return output_path

if __name__ == "__main__":
    generate_data()
