import joblib, os

model_path = "models/classifier.joblib"

if os.path.exists(model_path):
    size_kb = os.path.getsize(model_path) / 1024
    print("=" * 55)
    print("  MODEL STATUS: TRAINED & SAVED")
    print("=" * 55)
    print(f"  File     : {os.path.abspath(model_path)}")
    print(f"  Size     : {size_kb:.1f} KB")

    pipeline = joblib.load(model_path)
    classes  = pipeline.classes_
    print(f"  Classes  : {len(classes)}")
    for c in classes:
        print(f"             - {c}")

    print()
    print("  LIVE TEST PREDICTIONS:")
    print("  " + "-" * 50)
    tests = [
        "Pothole on the main road causing accidents daily",
        "My bike was stolen outside the market",
        "Train delayed by 3 hours at railway station",
        "Government officer asking for bribe",
        "Hospital has no doctor available",
        "Power cut for 8 hours every day in our area",
        "Garbage not collected from our colony for weeks",
        "No water supply in our area since 3 days",
    ]
    for t in tests:
        pred = pipeline.predict([t])[0]
        prob = max(pipeline.predict_proba([t])[0]) * 100
        print(f"  [{prob:4.0f}%]  {pred:<22}  \"{t[:45]}\"")
    print("=" * 55)
else:
    print("Model file NOT found! Run train.py first.")
