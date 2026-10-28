import json, subprocess, sys, os


def run(src):
    r = subprocess.run([sys.executable, "-I", "-c", src], capture_output=True, text=True,
                       env={**os.environ, "PYTHONHASHSEED": "0"})
    if r.returncode != 0:
        raise SystemExit(f"code failed:\n{src}\n{r.stderr}")
    return r.stdout.rstrip("\n")


def C(src, out=None):
    src = src.strip("\n")
    return ["code", "python", src, run(src) if out is None else out]


def P(t): return ["p", t]
def T(t): return ["tip", t]
def W(t): return ["warn", t]
def A(t): return ["analogy", t]
def L(*items): return ["list", list(items)]
def SK(d): return ["sketch", d]


lessons = [
 {"title": "Function kya hai — def aur parameters", "blocks": [
  P("**Function** = code ka ek **reusable block**. Ek baar likho, naam do, aur jab chahiye naam se bula lo. Code repeat nahi karna padta."),
  A("Chai ki machine: button dabao (function call), andar ka process (body) chalta hai, aur chai bahar aati hai (result). Har baar machine dobara banani nahi padti."),
  P("Real use: ERP mein \"calculate tax\" ek baar banao, phir 100 jagah call karo. Galti mile to sirf ek jagah theek karo."),
  C("""
def greet(name):
    print(f"Hello {name}! Welcome to GEEP")

greet("Anna")
greet("Rohan")
greet("Deepak")
"""),
  SK({"k": "table", "title": "Function ke hisse", "head": ["Hissa", "Matlab"],
      "rows": [["def", "function define karo"], ["greet", "function ka naam"], ["(name)", "parameter (input)"],
               [":", "body shuru"], ["greet(\"Anna\")", "call, Anna pass kiya"]]}),
  P("**Define** karna aur **call** karna do alag cheezein hain. `def` sirf recipe likhta hai; jab tak call nahi karoge, kuch nahi chalega."),
  SK({"k": "flow", "title": "Call ka safar", "steps": ["greet(\"Anna\")", "name = \"Anna\"", "Body chali", "Wapas aage"], "dir": "h"}),
  P("**Parameter** vs **argument**: function banate waqt bracket mein jo naam likhte ho (`name`) woh parameter hai. Call karte waqt jo asli value bhejte ho (`\"Anna\"`) woh argument hai."),
  C("""
def cable_cost(meters, rate):
    print(f"{meters} m x Rs {rate} = Rs {meters * rate}")

cable_cost(100, 45)
cable_cost(250, 38)
"""),
  T("Dhyan se dekh: arguments **order** se jaate hain. Pehla argument pehle parameter mein, doosra doosre mein."),
  W("Common galti: function ko call karne se pehle define nahi kiya, to `NameError`. Python upar se neeche padhta hai, isliye `def` upar hona chahiye."),
  W("Common galti: arguments kam ya zyada bhejna. `cable_cost(100)` likhoge to `TypeError: missing 1 required positional argument: 'rate'`."),
  P("**Docstring** = function ke shuru mein triple quotes mein likha chhota sa note: function kya karta hai. Professional code mein har function ka docstring hota hai."),
  C('''
def area(length, width):
    """Rectangle ka area return karta hai."""
    return length * width

print(area.__doc__)
'''),
  T("Function ka naam **verb** jaisa rakho jo kaam bataye: `calculate_tax`, `clean_text`, `load_data`. Aur ek function = ek kaam."),
 ]},
 {"title": "return vs print — value wapas lena", "blocks": [
  P("`print` = screen pe **dikha diya**, baat khatam. `return` = value **wapas haath mein di**, ab aage use kar sakte ho."),
  C("""
def add_print(a, b):
    print(a + b)

def add_return(a, b):
    return a + b

x = add_print(2, 3)
print("x =", x)
y = add_return(2, 3)
print("y =", y)
print("y * 10 =", y * 10)
"""),
  SK({"k": "compare", "title": "print vs return", "left": {"title": "print", "items": ["Screen pe dikhata", "Value wapas nahi", "Result: None", "Aage use nahi"]},
      "right": {"title": "return", "items": ["Value wapas deta", "Variable mein rakho", "Aage hisaab karo", "Real code mein yahi"]}}),
  T("Dhyan se dekh: `add_print` ne 5 dikhaya, lekin `x` mein **None** aaya. Jis function mein `return` nahi hota, woh chupke se `None` return karta hai."),
  A("Dukaan wala tumhe bill **dikha** de (print) vs bill tumhare **haath mein de** de (return). Haath mein ho to hi aage office mein jama kar sakte ho."),
  P("Real projects mein 99% functions `return` karte hain. `predictions = model.predict(data)` — `predict` return karta hai, print nahi, taaki result aage use ho."),
  C("""
def calculate_tax(salary, tax_percent=10):
    tax = salary * tax_percent / 100
    net = salary - tax
    return net

s1 = calculate_tax(50000)
s2 = calculate_tax(80000, 20)
print(f"50K salary, 10% tax: {s1}")
print(f"80K salary, 20% tax: {s2}")
"""),
  W("Common galti: `return net` likha lekin `net` naam ka variable banaya hi nahi (`salary = salary - tax` likh diya). Result: `NameError`. Jo variable banaya hai wahi return karo."),
  P("`return` ke baad function **turant ruk jaata** hai. Neeche ki lines nahi chalti. Isko **early return** kehte hain."),
  C("""
def check(n):
    if n > 0:
        return "Positive"
    if n < 0:
        return "Negative"
    return "Zero"

print(check(7), check(-2), check(0))
"""),
  P("**Multiple values return:** comma lagao. Python unhe ek **tuple** mein pack karta hai, aur tum unhe alag dibbon mein khol sakte ho (**unpacking**)."),
  C("""
def cable_report(length, defects):
    quality = "PASS" if defects == 0 else "FAIL"
    cost = length * 50
    return quality, cost

q, c = cable_report(100, 0)
print(f"Quality: {q}, Cost: {c}")
print(cable_report(200, 3))
"""),
  SK({"k": "flow", "title": "Multiple return", "steps": ["return q, c", "(\"PASS\", 5000)", "q, c = ..."], "dir": "h"}),
  C("""
def stats(nums):
    return min(nums), max(nums), sum(nums) / len(nums)

low, high, avg = stats([4, 9, 2, 5])
print(low, high, avg)
"""),
  T("ML mein yeh har jagah dikhega: `X_train, X_test, y_train, y_test = train_test_split(...)` — ek function, chaar values wapas."),
 ]},
 {"title": "Default, keyword, *args aur **kwargs", "blocks": [
  P("**Default parameter:** agar value na di jaaye to pehle se rakhi value use ho. Jaise GST zyaadatar 18% hai, to default 18 rakh do."),
  C("""
def total(rate, meters, gst=18):
    amount = rate * meters
    return amount + amount * gst / 100

print(total(100, 10))
print(total(100, 10, 5))
"""),
  W("Default wale parameters hamesha **end mein**. `def f(gst=18, rate):` likhoge to SyntaxError."),
  P("**Keyword arguments:** call karte waqt naam se value do. Tab order matter nahi karta, aur code padhne mein saaf ho jaata hai."),
  C("""
def total(rate, meters, gst=18):
    amount = rate * meters
    return amount + amount * gst / 100

print(total(meters=10, rate=100))
print(total(100, 10, gst=12))
"""),
  T("ML libraries mein keyword arguments har jagah hain: `RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)`. Naam se pata chal jaata hai kaunsi value kis cheez ki hai."),
  P("`*args` = jitne marzi positional values bhejo, sab ek **tuple** mein aa jaati hain."),
  C("""
def add_all(*args):
    print(args)
    return sum(args)

print(add_all(1, 2, 3))
print(add_all(5, 10))
"""),
  P("`**kwargs` = jitne marzi **naam wale** values bhejo, sab ek **dictionary** mein aa jaati hain (dict Stage 4 mein detail se)."),
  C("""
def info(**kwargs):
    for key, value in kwargs.items():
        print(f"{key} = {value}")

info(name="Akash", city="Bhiwadi", role="developer")
"""),
  SK({"k": "compare", "title": "Ek star vs do star", "left": {"title": "*args", "items": ["Bina naam ki values", "Tuple banta hai", "add_all(1, 2, 3)"]},
      "right": {"title": "**kwargs", "items": ["Naam wali values", "Dict banta hai", "info(name=\"A\")"]}}),
  T("Yaad rakh: **ek star = tuple, do star = dict.** Naam `args`/`kwargs` sirf convention hai; asli kaam `*` aur `**` ka hai."),
  P("Sab ek saath ho to order fix hai: normal → `*args` → default/keyword-only → `**kwargs`."),
  C("""
def train(model, *layers, epochs=10, **opts):
    print(model, layers, epochs, opts)

train("net", 64, 32, epochs=5, lr=0.01)
"""),
  W("Common galti (IQ favourite): **mutable default**. `def add_item(item, lst=[]):` — yeh list sirf **ek baar** banti hai aur har call mein wahi purani list use hoti hai."),
  C("""
def add_item(item, lst=[]):
    lst.append(item)
    return lst

print(add_item("a"))
print(add_item("b"))

def add_item_safe(item, lst=None):
    if lst is None:
        lst = []
    lst.append(item)
    return lst

print(add_item_safe("a"))
print(add_item_safe("b"))
"""),
  T("Fix: default `None` rakho aur andar nayi list banao. Default mein kabhi `[]` ya `{}` mat rakho."),
 ]},
 {"title": "Scope — variable kahan tak dikhta hai", "blocks": [
  P("**Scope** = woh area jahan variable dikhta hai aur use ho sakta hai. Function ke andar bana variable **local** hai: sirf andar zinda, function khatam to woh bhi khatam."),
  A("Ghar ka kamra: kamre ke andar rakhi cheez (local) sirf kamre mein milegi. Aangan mein rakhi cheez (global) har kamre se dikh jaati hai."),
  C("""
def f():
    x = 10
    print("andar:", x)

f()
try:
    print(x)
except NameError as e:
    print("bahar: NameError ->", e)
"""),
  P("(`try/except` error pakadne ka tareeka hai, Stage 5 mein detail se. Yahan bas error dikhane ke liye.)"),
  SK({"k": "boxes", "title": "Global vs local", "items": [{"label": "global: rate", "value": "45"}, {"label": "f() local: x", "value": "10"}]}),
  P("**Global** variable (file ke top level pe bana) function ke andar **padha** ja sakta hai:"),
  C("""
rate = 45

def cost(meters):
    return meters * rate

print(cost(10))
"""),
  P("Lekin agar function ke andar usi naam ko **value assign** karo, to Python ek **naya local** variable bana deta hai. Bahar wala nahi badalta."),
  C("""
count = 0

def bump():
    count = 99
    print("andar:", count)

bump()
print("bahar:", count)
"""),
  P("Bahar wala sach mein badalna hai to `global` keyword lagao:"),
  C("""
count = 0

def bump():
    global count
    count += 1

bump()
bump()
print(count)
"""),
  W("`global` kam se kam use karo. Jab har function chupke se global badalta hai to bug dhoondhna mushkil ho jaata hai. Achha tareeka: value **parameter se do, return se lo**: `count = bump(count)`."),
  P("Python naam dhoondhne ka order: **LEGB** — Local, Enclosing (bahar wala function), Global, Built-in (jaise `print`, `len`)."),
  SK({"k": "stack", "title": "LEGB: naam kahan dhoondhe", "items": ["Local", "Enclosing", "Global", "Built-in"]}),
  W("Common galti: built-in ka naam variable mein use karna, jaise `sum = 10` ya `list = [1, 2]`. Phir `sum([1, 2])` error dega, kyunki global `sum` ne built-in ko dhak diya."),
 ]},
 {"title": "lambda, map, filter aur recursion", "blocks": [
  P("**lambda** = ek line ka chhota, bina naam ka function. Format: `lambda inputs: expression`. `return` likhna nahi padta, expression ki value apne aap wapas aati hai."),
  C("""
square = lambda x: x * x
print(square(4))

def square2(x):
    return x * x
print(square2(4))
"""),
  P("lambda ka asli use: kisi doosre function ko chhota sa kaam dena, jaise **sorting** ka key."),
  C("""
leads = [("Rahul", 500), ("Neha", 900), ("Amit", 300)]
print(sorted(leads, key=lambda l: l[1]))
print(max(leads, key=lambda l: l[1]))
"""),
  T("`key=lambda l: l[1]` matlab \"har item ka index 1 (amount) dekh ke sort karo\"."),
  P("**map** = har item pe ek function lagao. **filter** = sirf woh items rakho jinke liye function True de. Dono ko `list()` mein lapetna padta hai result dekhne ke liye."),
  C("""
prices = [100, 250, 80, 400]
with_gst = list(map(lambda p: round(p * 1.18, 2), prices))
print(with_gst)
costly = list(filter(lambda p: p > 150, prices))
print(costly)
"""),
  SK({"k": "flow", "title": "map aur filter", "steps": ["[100, 250, 80]", "map: x 1.18", "filter: > 150", "Result"], "dir": "h"}),
  T("Bahut log map/filter ki jagah **list comprehension** pasand karte hain: `[p * 1.18 for p in prices]`. Yeh Stage 4 mein. IQ mein dono aane chahiye."),
  P("**Recursion** = function jo **khud ko call** karta hai. Har recursion mein do cheez zaroori: **base case** (kab rukna hai) aur **chhota sawaal** (har call problem ko chhota kare)."),
  A("Seedhi utarna: \"ek seedhi utro, phir baaki seedhiyan utro\". Zameen aa gayi (base case) to ruk jao."),
  C("""
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))
"""),
  SK({"k": "stack", "title": "Call stack: factorial(4)", "items": ["factorial(1) = 1", "factorial(2) = 2 x 1", "factorial(3) = 3 x 2", "factorial(4) = 4 x 6"]}),
  P("Har call ek **stack** (thali ka dher) mein upar rakhi jaati hai. Base case aate hi answers neeche ki taraf wapas lautte hain: 1, 2, 6, 24."),
  W("Common galti: base case bhool gaye to function khud ko bulata hi rahega aur `RecursionError: maximum recursion depth exceeded` aayega (default limit lagbhag 1000)."),
  C("""
def countdown(n):
    if n == 0:
        print("GO!")
        return
    print(n, end=" ")
    countdown(n - 1)

countdown(3)
"""),
  T("Recursion trees, folders aur nested data ke liye natural hai. Lekin simple counting ke liye loop zyada tez aur safe hai."),
 ]},
 {"title": "Modules, import aur __name__ == \"__main__\"", "blocks": [
  P("**Module** = ek `.py` file jisme functions aur variables hain. **import** se doosri file ka code apni file mein use karte ho. Python ke saath bahut saare modules free aate hain (**standard library**)."),
  A("Toolbox: har kaam ka auzaar khud banane ki zaroorat nahi. `import math` = maths wala dibba khol liya."),
  C("""
import math
print(math.sqrt(16))
print(math.pi)
print(math.ceil(4.2), math.floor(4.8))
"""),
  P("Import karne ke tareeke:"),
  C("""
from math import sqrt, pi
print(sqrt(25))

import statistics as st
print(st.mean([2, 4, 6]))
"""),
  SK({"k": "table", "title": "Import ke tareeke", "head": ["Likho", "Use karo"],
      "rows": [["import math", "math.sqrt(4)"], ["from math import sqrt", "sqrt(4)"], ["import numpy as np", "np.array(...)"]]}),
  T("`import numpy as np`, `import pandas as pd` — yeh **alias** (chhota naam) poori ML duniya ka standard hai. Stage 8 mein roz likhoge."),
  W("Common galti: `from module import *` — saare naam ek saath aa jaate hain aur tumhare variables se takra sakte hain. Isse bacho."),
  P("`random` module ke saath **seed** lagao to har baar same \"random\" numbers aate hain. ML mein results repeat karne ke liye (`random_state=42`) yahi idea hai."),
  C("""
import random
random.seed(42)
print(random.randint(1, 100), random.randint(1, 100))
random.seed(42)
print(random.randint(1, 100), random.randint(1, 100))
"""),
  P("**Apna module** banana: ek file `cable_utils.py` banao aur usme functions likho. Phir doosri file mein import karo."),
  C("""
# cable_utils.py
def cost(meters, rate=45):
    return meters * rate

if __name__ == "__main__":
    print("Test:", cost(10))
""", ""),
  C("""
# main.py (same folder mein)
import cable_utils
print(cable_utils.cost(100))
""", ""),
  P("`python cable_utils.py` chalane pe `Test: 450` print hoga. Lekin `python main.py` chalane pe sirf `4500` aayega — test wali line **nahi** chalegi."),
  P("Kyun? Har file ke paas ek special variable `__name__` hota hai. File **seedha chalao** to `__name__` = `\"__main__\"`. File **import** ho to `__name__` = file ka naam (`\"cable_utils\"`)."),
  SK({"k": "compare", "title": "__name__ ki value", "left": {"title": "Seedha run", "items": ["python cable_utils.py", "__name__ = \"__main__\"", "Test chalega"]},
      "right": {"title": "Import hua", "items": ["import cable_utils", "__name__ = \"cable_utils\"", "Test nahi chalega"]}}),
  C("""
print(__name__)
"""),
  T("Rule: har script ka \"chalane wala\" code `if __name__ == \"__main__\":` ke andar rakho. Isse file **module** bhi ban sakti hai aur **script** bhi. FastAPI, training scripts sab mein yahi pattern hai."),
  P("**pip** se baahar ke packages install hote hain: `pip install numpy`. Phir `import numpy` kaam karega. Standard library ko install nahi karna padta."),
 ]},
]

teach = [
 {"say": "Function matlab code ka reusable dibba. Ek baar def se banao, phir naam se jitni baar chaho bulao.",
  "sketch": {"k": "flow", "steps": ["Input", "Function body", "Output"], "dir": "h"}, "code": "def greet(name):\n    print(f\"Hello {name}\")\n\ngreet(\"Akash\")"},
 {"say": "Bracket mein jo naam likha woh parameter. Call karte waqt jo value bheji woh argument.",
  "sketch": {"k": "boxes", "items": [{"label": "parameter", "value": "name"}, {"label": "argument", "value": "\"Akash\""}]}, "code": None},
 {"say": "print sirf dikhata hai, return value wapas deta hai. return nahi hai to function None deta hai.",
  "sketch": {"k": "compare", "left": {"title": "print", "items": ["Dikha diya", "x = None"]}, "right": {"title": "return", "items": ["Haath mein diya", "y = 5"]}}, "code": "def add(a, b):\n    return a + b\n\ny = add(2, 3)"},
 {"say": "Comma laga ke kai values return kar sakte ho. Woh tuple mein aati hain, aur hum unhe alag dibbon mein khol lete hain.",
  "sketch": {"k": "boxes", "items": [{"label": "q", "value": "\"PASS\""}, {"label": "c", "value": "5000"}]}, "code": "q, c = cable_report(100, 0)"},
 {"say": "Default value se parameter optional ban jaata hai, aur keyword argument se naam ke saath value bhejte hain, order ki tension khatam.",
  "sketch": {"k": "table", "head": ["Call", "gst"], "rows": [["total(100, 10)", "18 (default)"], ["total(100, 10, gst=5)", "5"]]}, "code": None},
 {"say": "Ek star args sab extra values ko tuple mein le leta hai, do star kwargs naam wali values ko dict mein.",
  "sketch": {"k": "compare", "left": {"title": "*args", "items": ["(1, 2, 3)"]}, "right": {"title": "**kwargs", "items": ["{'name': 'A'}"]}}, "code": None},
 {"say": "Function ke andar bana variable local hai, bahar nahi dikhta. Naam dhoondhne ka order LEGB: Local, Enclosing, Global, Built-in.",
  "sketch": {"k": "stack", "items": ["Local", "Enclosing", "Global", "Built-in"]}, "code": None},
 {"say": "lambda ek line ka bina naam ka function hai. Sorting ke key mein, map aur filter mein sabse zyada kaam aata hai.",
  "sketch": {"k": "flow", "steps": ["x", "lambda x: x * x", "x squared"], "dir": "h"}, "code": "sorted(leads, key=lambda l: l[1])"},
 {"say": "Recursion mein function khud ko bulata hai. Base case zaroori, warna RecursionError. Har call stack pe chadhti hai aur answer neeche lautta hai.",
  "sketch": {"k": "stack", "items": ["fact(1) = 1", "fact(2) = 2", "fact(3) = 6"]}, "code": "def fact(n):\n    if n <= 1:\n        return 1\n    return n * fact(n - 1)"},
 {"say": "Module matlab ek py file. import se use karo. Aur if name equals main ke andar ka code sirf tab chalta hai jab file seedha run ho, import pe nahi. Ab practice karo!",
  "sketch": {"k": "tree", "root": {"label": "cable_utils.py", "children": [{"label": "Seedha run: test chale", "children": []}, {"label": "Import: test nahi", "children": []}]}}, "code": "if __name__ == \"__main__\":\n    main()"},
]


def PR(q, starter, solution, hint):
    solution = solution.strip("\n")
    return {"q": q, "starter": starter.lstrip("\n"), "expect": run(solution), "hint": hint, "solution": solution}


practice = [
 PR("Function `mean_std(nums)` likho jo numbers ka **mean** aur **standard deviation** (population) dono return kare. Library mat use karo, khud loop se nikalo. Output:\nMean: 5.0\nStd: 2.0",
    """
def mean_std(nums):
    # TODO: mean = total / count
    # TODO: har number ka (x - mean) ** 2 jodo, count se divide, phir ** 0.5
    pass

m, s = mean_std([2, 4, 4, 4, 5, 5, 7, 9])
print(f"Mean: {m}")
print(f"Std: {s}")
""",
    """
def mean_std(nums):
    total = 0
    for x in nums:
        total += x
    mean = total / len(nums)
    sq = 0
    for x in nums:
        sq += (x - mean) ** 2
    std = (sq / len(nums)) ** 0.5
    return mean, std

m, s = mean_std([2, 4, 4, 4, 5, 5, 7, 9])
print(f"Mean: {m}")
print(f"Std: {s}")
""",
    "Do loop: pehle total se mean, phir squared differences ka total. `return mean, std` se dono wapas."),
 PR("**Min-max scaling** (ML ka common preprocessing): function `scale(x, lo, hi)` likho jo `(x - lo) / (hi - lo)` return kare. Phir `map` + `lambda` se saare values scale karo, aur `filter` se gino kitne 0.5 ya zyada hain. Output:\n[0.0, 0.25, 0.5, 0.75, 1.0]\nHigh values: 3",
    """
def scale(x, lo, hi):
    # TODO: formula return karo
    pass

values = [10, 20, 30, 40, 50]
lo, hi = min(values), max(values)
# TODO: scaled = list(map(lambda ..., values))
# TODO: high = list(filter(lambda ..., scaled))
# TODO: dono print karo
""",
    """
def scale(x, lo, hi):
    return (x - lo) / (hi - lo)

values = [10, 20, 30, 40, 50]
lo, hi = min(values), max(values)
scaled = list(map(lambda v: scale(v, lo, hi), values))
print(scaled)
high = list(filter(lambda v: v >= 0.5, scaled))
print(f"High values: {len(high)}")
""",
    "`map(lambda v: scale(v, lo, hi), values)`. filter ke lambda mein condition `v >= 0.5`."),
 PR("Recursive `factorial(n)` banao, aur uski madad se `ncr(n, r)` = n! / (r! x (n-r)!) likho (combinations, probability mein bahut aata hai). Integer division `//` use karo. Output:\n5! = 120\n5C2 = 10\n10C3 = 120",
    """
def factorial(n):
    # TODO: base case: n <= 1 ho to 1
    # TODO: warna n * factorial(n - 1)
    pass

def ncr(n, r):
    # TODO: formula, // se divide
    pass

print(f"5! = {factorial(5)}")
print(f"5C2 = {ncr(5, 2)}")
print(f"10C3 = {ncr(10, 3)}")
""",
    """
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

def ncr(n, r):
    return factorial(n) // (factorial(r) * factorial(n - r))

print(f"5! = {factorial(5)}")
print(f"5C2 = {ncr(5, 2)}")
print(f"10C3 = {ncr(10, 3)}")
""",
    "Base case pehle likho. ncr mein teen factorial calls: `factorial(n) // (factorial(r) * factorial(n - r))`."),
]

quiz = [
 {"q": "Jis function mein `return` nahi hai, woh kya return karta hai?", "o": ["0", "None", "Error", "Khaali string"], "a": 1,
  "why": "Bina return wala function apne aap `None` return karta hai."},
 {"q": "`def total(rate, meters, gst=18)` ho to `total(100, 10)` mein gst kya hoga?", "o": ["0", "10", "18", "Error"], "a": 2,
  "why": "gst nahi diya, isliye default value 18 use hui."},
 {"q": "`def f(*args): return args` ho to `f(1, 2, 3)` kya dega?", "o": ["(1, 2, 3)", "[1, 2, 3]", "6", "{1, 2, 3}"], "a": 0,
  "why": "*args saari extra positional values ko ek tuple mein pack karta hai."},
 {"q": "`**kwargs` ke andar values kis type mein aati hain?", "o": ["list", "tuple", "set", "dict"], "a": 3,
  "why": "Naam wali values key-value pairs hain, isliye dict banta hai."},
 {"q": "`(lambda x: x * 2)(5)` ka result?", "o": ["5", "25", "10", "Error"], "a": 2,
  "why": "lambda ko 5 diya, expression 5 * 2 = 10 wapas aaya."},
 {"q": "Function ke andar `x = 10` banaya. Bahar `print(x)` (bahar koi x nahi) karne pe?", "o": ["NameError", "10", "None", "0"], "a": 0,
  "why": "x local hai, sirf function ke andar exist karta hai."},
 {"q": "Recursive function mein base case na ho to kya hoga?", "o": ["Function 0 return karega", "Ek baar chal ke rukega", "SyntaxError", "RecursionError"], "a": 3,
  "why": "Function khud ko bulata hi rahega jab tak recursion limit (~1000) na cross ho, phir RecursionError."},
 {"q": "`if __name__ == \"__main__\":` ke andar ka code kab chalta hai?", "o": ["Jab file import ho", "Jab file seedha run ho", "Kabhi nahi", "Hamesha"], "a": 1,
  "why": "Seedha run karne pe `__name__` \"__main__\" hota hai; import pe file ka naam hota hai."},
 {"q": "`list(filter(lambda n: n % 2 == 0, [1, 2, 3, 4]))` ka output?", "o": ["[1, 3]", "[True, False]", "[2, 4]", "[1, 2, 3, 4]"], "a": 2,
  "why": "filter sirf woh items rakhta hai jinke liye lambda True de: even numbers 2 aur 4."},
 {"q": "`def add_item(item, lst=[])` ko do baar call kiya: `add_item(\"a\")`, phir `add_item(\"b\")`. Doosri call kya return karegi?",
  "o": ["['b']", "['a', 'b']", "['a']", "Error"], "a": 1,
  "why": "Mutable default list sirf ek baar banti hai aur calls ke beech share hoti hai, isliye 'a' bacha raha. Fix: `lst=None`."},
]

iq = [
 {"q": "Function kya hai aur kyun use karte hain?", "a": "Function code ka naam wala reusable block hai jo input (parameters) leta hai aur output return karta hai. Fayde: code repeat nahi hota (DRY), testing aasaan, ek jagah fix karo sab jagah theek, aur bada program chhote samajhne laayak tukdon mein bant jaata hai."},
 {"q": "print aur return mein farak?", "a": "print sirf console pe dikhata hai aur function ka result None hi rehta hai. return value caller ko wapas deta hai jise variable mein rakh ke aage use kar sakte ho, aur return pe function wahin ruk jaata hai. Production code mein functions return karte hain; print sirf debugging ya CLI output ke liye."},
 {"q": "*args aur **kwargs kya hain? Kab use karte ho?", "a": "*args variable number ke positional arguments ko tuple mein leta hai, **kwargs keyword arguments ko dict mein. Use: jab inputs ki ginti fix na ho, ya wrapper/decorator banana ho jo arguments aage pass kare: `def wrapper(*args, **kwargs): return func(*args, **kwargs)`."},
 {"q": "Mutable default argument ki problem samjhao.", "a": "Default values function define hote waqt sirf ek baar banti hain. `def f(x, lst=[])` mein wahi list har call mein share hoti hai, isliye pichhli calls ka data reh jaata hai. Fix: `lst=None` rakho aur andar `if lst is None: lst = []`."},
 {"q": "lambda kya hai? Iski limitation?", "a": "lambda ek anonymous one-line function hai: `lambda x: x * 2`. Mostly sort key, map, filter mein short logic ke liye. Limitation: sirf ek expression, koi statement (loop, assignment) nahi, aur naam na hone se debugging thodi mushkil. Complex logic ke liye `def` use karo."},
 {"q": "map, filter aur reduce mein farak?", "a": "map har item pe function lagata hai (same length output). filter sirf woh items rakhta hai jahan function True de. reduce (functools se) saare items ko ek value mein combine karta hai, jaise total: `reduce(lambda a, b: a + b, nums)`. Python 3 mein map/filter lazy iterator dete hain, isliye `list()` lagate hain."},
 {"q": "Local aur global scope kya hai? LEGB rule?", "a": "Function ke andar assign hua variable local hota hai, sirf andar dikhta hai. File level pe bana global hota hai. Python naam is order mein dhoondhta hai: Local, Enclosing, Global, Built-in. Global ko andar se badalna ho to `global` keyword, nested function ke bahar wale variable ke liye `nonlocal`."},
 {"q": "Recursion kya hai? Iteration se kab behtar?", "a": "Function ka khud ko chhote input ke saath call karna, base case pe rukna. Tree traversal, nested folders, divide-and-conquer (merge sort) mein natural lagta hai. Nuksaan: har call stack memory leti hai aur Python ki limit ~1000 hai, isliye simple counting ke liye loop better."},
 {"q": "`if __name__ == \"__main__\"` kya karta hai?", "a": "Har module ka `__name__` hota hai; file seedha run ho to \"__main__\", import ho to module ka naam. Is check ke andar ka code sirf direct run pe chalta hai. Isse ek file reusable module bhi ban sakti hai aur standalone script bhi, aur import karte waqt test/training code apne aap nahi chalta."},
 {"q": "Module aur package mein farak?", "a": "Module ek single .py file hai. Package modules ka folder hai (traditionally `__init__.py` ke saath), jaise `sklearn` package ke andar `sklearn.linear_model` module. Library = packages ka collection jo pip se install hota hai."},
 {"q": "Python mein arguments pass-by-value hain ya pass-by-reference?", "a": "Na pura ek, na pura doosra: \"pass by object reference\". Function ko object ka reference milta hai. Mutable object (list, dict) ko andar modify karo to bahar bhi badlega; immutable (int, str) ko reassign karo to sirf local naam badlega, bahar wala same rehta hai."},
 {"q": "Positional, keyword aur default arguments ka order kya hona chahiye?", "a": "Definition mein: normal positional → *args → keyword-only/default → **kwargs, jaise `def f(a, b, *args, option=True, **kwargs)`. Call karte waqt positional arguments keyword arguments se pehle aate hain; `f(a=1, 2)` SyntaxError hai."},
]

S = {"n": 3, "id": "aiml-03", "title": "Functions & Modules",
     "goal": "Apne functions banana, parameters, default/keyword args, *args/**kwargs, return, scope, lambda, map/filter aur recursion samajhna, aur modules import karke code ko saaf files mein baantna seekhoge.",
     "lessons": lessons, "teach": teach, "practice": practice, "quiz": quiz, "iq": iq}
json.dump(S, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
