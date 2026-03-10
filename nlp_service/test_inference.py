"""Quick smoke-test for the embedding-based classifiers."""
import os, sys
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
sys.path.insert(0, os.path.dirname(__file__))

from model import ProblemClassifier

c = ProblemClassifier()

tests = [
    "There is a large pothole on the main road near the bus stop. It is causing accidents.",
    "The electricity transformer in our area exploded and a person got electrocuted.",
    "Teacher has been absent for 3 weeks and mid-day meal is not being served.",
    "Police officer demanded bribe to register FIR for theft case.",
    "Dead body found floating in the river near the industrial area.",
    "Water pipeline is broken and dirty water is coming from taps.",
    "Train was delayed by 4 hours with no announcement at the platform.",
]

print("\n" + "="*90)
print(f"{'Text (truncated)':<42} {'Category':<22} {'Sev':<7} {'Conf':<6} Keywords")
print("="*90)
for t in tests:
    r = c.predict(t)
    print(f"{t[:40]:<42} {r['category']:<22} {r['severity']:<7} {r['confidence']:<6.2f} {r['keywords']}")
print("="*90)
