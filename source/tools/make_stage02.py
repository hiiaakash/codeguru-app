import json, subprocess, sys, os


def run(src):
    r = subprocess.run([sys.executable, "-I", "-c", src], capture_output=True, text=True,
                       env={**os.environ, "PYTHONHASHSEED": "0"})
    if r.returncode != 0:
        raise SystemExit(f"code failed:\n{src}\n{r.stderr}")
    return r.stdout.rstrip("\n")


def C(src, out=None):
    """Python code block. out=None -> run and capture; out="" -> no output shown."""
    src = src.strip("\n")
    return ["code", "python", src, run(src) if out is None else out]


def P(t): return ["p", t]
def T(t): return ["tip", t]
def W(t): return ["warn", t]
def A(t): return ["analogy", t]
def L(*items): return ["list", list(items)]
def SK(d): return ["sketch", d]


lessons = [
 {"title": "Comparison aur logical operators — sawaal poochna", "blocks": [
  P("Stage 1 mein humne values ko dibbe (variables) mein rakhna seekha. Ab program ko **sochna** sikhana hai. Sochne ke liye pehle **sawaal** poochna padta hai: \"kya marks 90 se zyada hain?\", \"kya cable defective hai?\""),
  P("Har sawaal ka jawab sirf do mein se ek hota hai: **True** (haan) ya **False** (naa). Yeh `bool` type hai, jo Stage 1 mein dekha tha."),
  A("Factory gate pe guard poochta hai: \"ID card hai?\" Jawab haan ya naa. Haan to andar, naa to bahar. Program bhi har faisla aise hi haan/naa sawaal se leta hai."),
  SK({"k": "table", "title": "Comparison operators", "head": ["Operator", "Matlab", "Example", "Result"],
      "rows": [["==", "barabar?", "5 == 5", "True"], ["!=", "barabar nahi?", "5 != 3", "True"],
               [">", "bada?", "7 > 9", "False"], ["<", "chhota?", "2 < 4", "True"],
               [">=", "bada ya barabar", "18 >= 18", "True"], ["<=", "chhota ya barabar", "3 <= 1", "False"]]}),
  C("""
marks = 85
print(marks > 90)
print(marks >= 85)
print(marks == 85)
print(marks != 100)
"""),
  W("Common galti: `=` aur `==` mein confusion. `marks = 85` dibbe mein value **rakhta** hai. `marks == 85` sirf **poochta** hai \"kya barabar hai?\". `if marks = 85:` likhoge to SyntaxError."),
  C("""
print("apple" == "apple")
print("Apple" == "apple")
print("10" == 10)
"""),
  T("Dhyan se dekh: text compare karte waqt chhota-bada letter matter karta hai. Aur `\"10\"` (text) kabhi `10` (number) ke barabar nahi hota."),
  P("Kabhi ek sawaal kaafi nahi hota. \"Age 18+ **aur** ID card hai?\" Iske liye **logical operators** hain: `and`, `or`, `not`."),
  SK({"k": "table", "title": "and / or / not", "head": ["Operator", "Kab True?", "Example"],
      "rows": [["and", "dono True", "True and False -> False"], ["or", "koi ek True", "True or False -> True"],
               ["not", "ulta kar do", "not True -> False"]]}),
  C("""
age = 22
has_id = True
print(age >= 18 and has_id)
print(age < 18 or has_id)
print(not has_id)
"""),
  A("`and` = do taale wala darwaza: dono chabi lagengi tabhi khulega. `or` = do darwaze: koi bhi ek khula ho to andar ja sakte ho."),
  C("""
temp = 75
print(60 <= temp <= 80)
"""),
  T("Python mein range check seedha likh sakte ho: `60 <= temp <= 80`. Yeh `temp >= 60 and temp <= 80` ke barabar hai, aur padhne mein aasaan."),
  P("**Truthy aur Falsy:** Python mein kuch values ko condition mein False maana jaata hai: `0`, `0.0`, `\"\"` (khaali text), `None`, aur khaali list `[]`. Baaki sab True maana jaata hai."),
  C("""
print(bool(0), bool(5))
print(bool(""), bool("Akash"))
print(bool(None))
"""),
 ]},
 {"title": "if, elif, else — program ka faisla", "blocks": [
  P("Ab sawaal ka jawab use karte hain **faisla** lene ke liye. `if` kehta hai: \"agar condition True hai, to yeh kaam karo\"."),
  C("""
age = 21
if age >= 18:
    print("Adult ho! Vote de sakte ho.")
print(f"Tumhari age {age} hai.")
"""),
  P("Agar condition False ho to kuch aur karna hai? Uske liye `else`:"),
  C("""
age = 15
if age >= 18:
    print("Adult ho! Vote de sakte ho.")
else:
    print("Minor ho! Abhi wait karo.")
"""),
  SK({"k": "flow", "title": "if / else ka raasta", "steps": ["Condition check", "True: if block", "False: else block", "Aage ka code"], "dir": "v"}),
  P("Do se zyada raaste? `elif` (else if) lagao. Python **upar se neeche** check karta hai, aur **pehli True** condition milte hi uska block chala ke baaki sab chhod deta hai."),
  C("""
marks = 72
if marks >= 90:
    print("Grade A - Excellent!")
elif marks >= 80:
    print("Grade B - Very Good!")
elif marks >= 70:
    print("Grade C - Good")
elif marks >= 60:
    print("Grade D - Average")
else:
    print("Grade F - Fail")
"""),
  SK({"k": "tree", "title": "Grade ka faisla", "root": {"label": "marks?", "children": [
      {"label": ">= 90: A", "children": []}, {"label": ">= 80: B", "children": []},
      {"label": ">= 70: C", "children": []}, {"label": "warna: F", "children": []}]}}),
  T("Dhyan se dekh: 72 ke liye `marks >= 60` bhi True hai, lekin \"Grade D\" print nahi hua. Kyunki `>= 70` pehle True ho gaya aur baaki chain chhod di gayi."),
  W("Common galti: order ulta likhna. Agar pehle `if marks >= 60:` likha, to 95 marks wale ko bhi \"D\" mil jaayega, kyunki 95 >= 60 pehle hi True hai. **Sabse strict condition sabse upar.**"),
  P("**Indentation** = line ke shuru mein spaces. Python mein yeh sajawat nahi, **rule** hai. `if` ke baad `:` lagta hai, aur uske andar ki har line **4 spaces** aage hoti hai. Isse Python ko pata chalta hai ki kaunsi lines if ke andar hain."),
  C("""
defects = 0
if defects == 0:
    print("Cable PASS")
    print("Packing mein bhejo")
print("Check khatam")
"""),
  P("Dono print 4 spaces andar hain, isliye dono if ke andar hain. Aakhri print 0 spaces pe hai, woh hamesha chalega."),
  W("Common galti: `if` ke baad `:` bhool jaana (SyntaxError), ya andar wali line ko space na dena (`IndentationError: expected an indented block`). Tabs aur spaces mix mat karo, hamesha 4 spaces."),
  P("**One-line if/else (ternary):** chhote faisle ek line mein:"),
  C("""
defects = 3
quality = "PASS" if defects == 0 else "FAIL"
print(quality)
"""),
 ]},
 {"title": "Nested if aur real-world faisle", "blocks": [
  P("**Nested if** = if ke andar if. Jab pehla sawaal haan ho, tabhi doosra sawaal poochna ho."),
  A("Bank loan: pehle poocho \"salary 30,000+ hai?\" Haan to phir poocho \"credit score 700+ hai?\". Salary hi kam hai to credit score poochne ka fayda nahi."),
  C("""
salary = 45000
score = 680
if salary >= 30000:
    if score >= 700:
        print("Loan approved")
    else:
        print("Score kam hai, loan reject")
else:
    print("Salary kam hai, loan reject")
"""),
  SK({"k": "tree", "title": "Nested if", "root": {"label": "salary >= 30000?", "children": [
      {"label": "Haan: score?", "children": [{"label": ">= 700: Approve", "children": []}, {"label": "warna: Reject", "children": []}]},
      {"label": "Naa: Reject", "children": []}]}}),
  P("Spaces gino: pehla `if` ke andar 4 spaces, andar wale `if` ke andar 8 spaces (4 + 4). Har level pe 4 aur."),
  T("Bahut gehra nesting (3-4 level) padhne mein mushkil hota hai. Aksar `and` se flat kar sakte ho: `if salary >= 30000 and score >= 700:`."),
  C("""
salary = 45000
score = 720
if salary >= 30000 and score >= 700:
    print("Loan approved")
else:
    print("Loan reject")
"""),
  P("ML mein bhi yahi soch hai. Ek model probability deta hai (0 se 1 ke beech), aur hum **threshold** laga ke faisla karte hain. Yeh asal mein ek `if` hi hai!"),
  C("""
prob = 0.83
if prob >= 0.5:
    label = "Spam"
else:
    label = "Not spam"
print(label)
"""),
  SK({"k": "flow", "title": "Model se faisla", "steps": ["Email", "Model", "prob = 0.83", "if >= 0.5", "Spam"], "dir": "h"}),
  P("**Decision Tree** naam ka ML model (Stage 10 mein aayega) bilkul nested if-else ki tarah kaam karta hai: har node pe ek sawaal, aur neeche jaate jaate faisla."),
  W("Common galti: `if x == 1 or 2:` likhna. Yeh hamesha True hoga, kyunki `2` khud truthy hai. Sahi: `if x == 1 or x == 2:`."),
 ]},
 {"title": "for loop aur range — kaam baar baar", "blocks": [
  P("**Loop** = ek kaam baar baar karna. Factory mein 100 cables ka quality check, har cable ke liye same process. 100 baar code nahi likhoge, loop lagaoge."),
  P("Do type ke loop: **for** (jab pata ho kitni baar) aur **while** (jab tak condition True hai)."),
  C("""
for i in range(1, 6):
    print(f"Cable {i}: Inspection Done")
"""),
  P("Har round mein `i` naam ke dibbe mein naya number aata hai: 1, phir 2, phir 3... Loop ki body (andar wali lines) har round mein chalti hai."),
  SK({"k": "cycle", "title": "for loop ka chakkar", "steps": ["Agla number lo", "i mein rakho", "Body chalao", "Number bache?"]}),
  P("`range(start, stop, step)` numbers banata hai. **start** se shuru, **stop se PEHLE** ruko, **step** jitna aage koodo."),
  SK({"k": "array", "title": "range(2, 10, 3)", "items": ["2", "5", "8"], "index": True}),
  C("""
print(list(range(5)))
print(list(range(1, 6)))
print(list(range(2, 10, 3)))
print(list(range(10, 0, -2)))
"""),
  T("Dhyan se dekh: `range(5)` 0 se shuru hota hai aur 4 pe khatam. Stop number **kabhi include nahi** hota. 1 se 10 chahiye to `range(1, 11)`."),
  P("`print(..., end=\" \")` se sab ek hi line mein aata hai (nayi line ki jagah space):"),
  C("""
for i in range(2, 11, 2):
    print(i, end=" ")
print()
"""),
  P("Loop ka sabse common use: **total jodna**. Ek dibba 0 se shuru karo, har round mein usme jodte jao. Isko **accumulator** pattern kehte hain."),
  C("""
total = 0
for i in range(1, 101):
    total = total + i
print(total)
"""),
  A("Jaise gullak: pehle khaali (0), phir roz paise daalte gaye, end mein poora total."),
  P("for loop sirf numbers pe nahi, kisi bhi **sequence** pe chalta hai: text ke har letter pe, ya list ki har value pe (list Stage 4 mein detail se)."),
  C("""
for ch in "GEEP":
    print(ch, end="-")
print()
fruits = ["Apple", "Banana", "Mango"]
for i, fruit in enumerate(fruits):
    print(f"{i}: {fruit}")
"""),
  T("`enumerate` index aur value dono deta hai. `range(len(fruits))` likhne se zyada saaf hai."),
 ]},
 {"title": "while loop, break aur continue", "blocks": [
  P("**while** loop tab tak chalta hai jab tak condition True hai. Jab pata na ho kitne round lagenge, tab while."),
  A("Machine tab tak chalao jab tak production target poora na ho. Kitni der lagegi pehle se nahi pata."),
  C("""
target = 5
produced = 0
while produced < target:
    produced += 1
    print(f"Cable {produced} produced")
print(f"Target {target} complete!")
"""),
  SK({"k": "cycle", "title": "while ka chakkar", "steps": ["Condition check", "True: body chalao", "Value update", "Wapas check"]}),
  P("`produced += 1` matlab `produced = produced + 1`. Yeh line condition ko dheere dheere False ki taraf le jaati hai."),
  W("Common galti: **infinite loop**. Agar update line (`count -= 1`) bhool gaye to condition hamesha True rahegi aur loop kabhi nahi rukega. Rokne ke liye Ctrl+C. Rule: while mein condition ko False banane wali line ZAROOR honi chahiye."),
  P("**break** = loop **turant band**, bahar niklo. **continue** = **sirf yeh round skip**, agle round pe jao."),
  SK({"k": "compare", "title": "break vs continue", "left": {"title": "break", "items": ["Poora loop band", "Defective mili: STOP", "Aage ke round nahi"]},
      "right": {"title": "continue", "items": ["Sirf yeh round skip", "Even mila: chhodo", "Loop chalta rehta"]}}),
  C("""
for i in range(1, 11):
    if i == 6:
        print(f"Cable {i}: DEFECTIVE! STOP!")
        break
    print(f"Cable {i}: OK")
print("Production stopped!")
"""),
  P("Cable 7 se 10 check hi nahi hue. break ne loop wahin khatam kar diya, aur seedha loop ke baad wali line chali."),
  C("""
for i in range(1, 11):
    if i % 2 == 0:
        continue
    print(f"Cable {i}: Checked")
"""),
  P("`i % 2` = 2 se divide karne pe remainder. 0 hai to even. continue ke baad neeche ka print skip hua, sirf odd cables print hui."),
  P("**while True + break** ek bahut common pattern hai: jab rukne ki shart loop ke beech mein pata chalti hai."),
  C("""
balance = 1000
month = 0
while True:
    month += 1
    balance = balance * 2
    if balance >= 10000:
        break
print(f"{month} mahine mein {balance}")
"""),
  P("ML training bhi aise hi loop hai: har **epoch** mein model thoda seekhta hai, aur jab loss sudharna band kar de to hum `break` se training rok dete hain. Isko **early stopping** kehte hain."),
  T("Bonus: loop ke saath `else` bhi lag sakta hai. Woh tabhi chalta hai jab loop **bina break** ke poora khatam ho. Search ke liye kaam aata hai: \"mila nahi\" wala message else mein."),
  C("""
for n in range(2, 7):
    if n == 9:
        print("Mil gaya")
        break
else:
    print("9 nahi mila")
"""),
 ]},
 {"title": "Nested loops, patterns aur common loop bugs", "blocks": [
  P("**Nested loop** = loop ke andar loop. Bahar wala loop ek round chalta hai, to andar wala **poora** chalta hai."),
  A("Ghadi: ghante ki sui ek baar aage badhti hai, tab tak minute ki sui poore 60 chakkar laga leti hai."),
  C("""
for row in range(1, 4):
    for col in range(1, 4):
        print(row * col, end=" ")
    print()
"""),
  SK({"k": "table", "title": "Table: row x col", "head": ["", "col 1", "col 2", "col 3"],
      "rows": [["row 1", "1", "2", "3"], ["row 2", "2", "4", "6"], ["row 3", "3", "6", "9"]]}),
  P("Andar ka `print()` (khaali) har row ke baad nayi line deta hai. Bahar 3 round x andar 3 round = 9 baar body chali."),
  P("**Patterns** IQ aur practice ke liye favourite hain. Text ko number se guna karo to woh repeat hota hai: `\"*\" * 3` = `***`."),
  C("""
for i in range(1, 5):
    print("*" * i)
"""),
  C("""
n = 4
for i in range(1, n + 1):
    print(" " * (n - i) + "*" * (2 * i - 1))
"""),
  T("Pattern ka trick: har row ke liye socho \"kitne space, kitne star?\" aur `i` ke formula mein likho. Row 1: 3 space + 1 star, row 2: 2 space + 3 star..."),
  P("Nested loop ka ek real use: **pairs** banana. Jaise do models ki har setting try karna (Stage 10 mein **grid search** yahi karta hai)."),
  C("""
for lr in [0.1, 0.01]:
    for depth in [2, 4]:
        print(f"lr={lr}, depth={depth}")
"""),
  W("Nested loop slow ho sakta hai: 1000 x 1000 = 10 lakh rounds. Isliye ML mein bade data pe loop ki jagah NumPy (Stage 8) use karte hain."),
  P("**Common loop bugs** — inhe pehchaan lo, aadha debugging khatam:"),
  L("**Off-by-one:** 1 se 10 chahiye tha, `range(1, 10)` likha, 10 chhoot gaya. Sahi: `range(1, 11)`.",
    "**Infinite while:** update line bhool gaye.",
    "**Galat indentation:** total wala print loop ke andar chala gaya, har round print hua.",
    "**Accumulator loop ke andar reset:** `total = 0` loop ke andar likh diya, har baar 0 ho gaya.",
    "**Loop variable ko andar badalna:** for mein `i = i + 2` likhne se agla round fir bhi range ka agla number lega."),
  C("""
# Bug: total = 0 loop ke andar
for i in range(1, 4):
    total = 0
    total += i
print("Galat:", total)

# Fix: total = 0 loop se pehle
total = 0
for i in range(1, 4):
    total += i
print("Sahi:", total)
"""),
  T("Debug ka simple tareeka: loop ke andar `print(i, total)` lagao aur dekho har round mein kya ho raha hai. Professional bhi yahi karte hain."),
 ]},
]

teach = [
 {"say": "Stage 2 mein program ko sochna sikhayenge. Sochne ke liye pehle sawaal, aur sawaal ka jawab sirf True ya False.",
  "sketch": {"k": "flow", "steps": ["Sawaal", "True / False", "Faisla"], "dir": "h"}, "code": "print(85 > 90)   # False"},
 {"say": "Do barabar ke nishaan matlab poochna, ek barabar matlab rakhna. Yeh farak IQ mein bhi poocha jaata hai.",
  "sketch": {"k": "compare", "left": {"title": "=", "items": ["Value rakho", "x = 5"]}, "right": {"title": "==", "items": ["Barabar hai?", "x == 5 -> True"]}}, "code": None},
 {"say": "and matlab dono sach, or matlab koi ek sach, not matlab ulta.",
  "sketch": {"k": "table", "head": ["A", "B", "A and B", "A or B"], "rows": [["T", "T", "T", "T"], ["T", "F", "F", "T"], ["F", "F", "F", "F"]]}, "code": None},
 {"say": "Ab faisla: if ke baad condition, phir colon. Andar ki lines 4 spaces aage. True hua to if block, warna else block.",
  "sketch": {"k": "flow", "steps": ["age >= 18?", "Haan: Vote", "Naa: Wait"], "dir": "v"}, "code": "if age >= 18:\n    print(\"Vote\")\nelse:\n    print(\"Wait\")"},
 {"say": "Zyada raaste ho to elif. Upar se neeche check hota hai, pehli True condition jeet jaati hai. Isliye strict condition sabse upar.",
  "sketch": {"k": "stack", "items": [">= 90: A", ">= 80: B", ">= 70: C", "else: F"]}, "code": None},
 {"say": "Ab loop. for loop range ke har number ke liye body chalata hai. range ka stop number kabhi include nahi hota.",
  "sketch": {"k": "array", "title": "range(1, 6)", "items": ["1", "2", "3", "4", "5"], "index": True}, "code": "for i in range(1, 6):\n    print(i)"},
 {"say": "range ke teen hisse: start, stop, step. range 2 se 10 step 3 deta hai 2, 5, 8. Agla 11 hota, jo 10 se aage hai.",
  "sketch": {"k": "flow", "steps": ["2", "5", "8", "11? Stop"], "dir": "h"}, "code": None},
 {"say": "while tab tak chalta hai jab tak condition True hai. Update line bhool gaye to infinite loop.",
  "sketch": {"k": "cycle", "steps": ["Check", "Body", "Update"]}, "code": "count = 3\nwhile count > 0:\n    print(count)\n    count -= 1"},
 {"say": "break poora loop band karta hai, continue sirf yeh round chhodta hai. Defective cable mili to break, even cable skip karni hai to continue.",
  "sketch": {"k": "compare", "left": {"title": "break", "items": ["1 2 3 STOP"]}, "right": {"title": "continue", "items": ["1 _ 3 _ 5"]}}, "code": None},
 {"say": "Loop ke andar loop: bahar ka ek round, andar ka poora chakkar. Patterns aur tables aise hi bante hain. Ab practice karo!",
  "sketch": {"k": "array", "title": "Star pattern", "items": ["*", "**", "***", "****"], "index": False}, "code": "for i in range(1, 5):\n    print(\"*\" * i)"},
]


def PR(q, starter, solution, hint):
    solution = solution.strip("\n")
    return {"q": q, "starter": starter.lstrip("\n"), "expect": run(solution), "hint": hint, "solution": solution}


practice = [
 PR("1 se 50 tak ke numbers pe loop chalao. Do cheezein nikalo: saare **even** numbers ka total, aur kitne numbers **3 se divisible** hain. Output:\nEven total: 650\nDivisible by 3: 16",
    """
even_total = 0
count3 = 0
for n in range(1, 51):
    # TODO: even hai to even_total mein jodo
    # TODO: 3 se divisible hai to count3 badhao
    pass
print(f"Even total: {even_total}")
print(f"Divisible by 3: {count3}")
""",
    """
even_total = 0
count3 = 0
for n in range(1, 51):
    if n % 2 == 0:
        even_total += n
    if n % 3 == 0:
        count3 += 1
print(f"Even total: {even_total}")
print(f"Divisible by 3: {count3}")
""",
    "Do alag `if` lagao (elif nahi), kyunki 6 jaisa number even bhi hai aur 3 se divisible bhi. `n % 2 == 0` even ke liye."),
 PR("Model ne 8 emails pe prediction diya. Loop se **accuracy** nikalo (kitne predictions sahi the). Output:\nCorrect: 6/8\nAccuracy: 75.0%",
    """
pred = [1, 0, 1, 1, 0, 1, 0, 0]
actual = [1, 0, 0, 1, 0, 1, 1, 0]
correct = 0
for i in range(len(pred)):
    # TODO: pred[i] aur actual[i] barabar hain to correct badhao
    pass
# TODO: Correct aur Accuracy print karo
""",
    """
pred = [1, 0, 1, 1, 0, 1, 0, 0]
actual = [1, 0, 0, 1, 0, 1, 1, 0]
correct = 0
for i in range(len(pred)):
    if pred[i] == actual[i]:
        correct += 1
print(f"Correct: {correct}/{len(pred)}")
print(f"Accuracy: {correct / len(pred) * 100}%")
""",
    "`pred[i]` se i-th value milti hai. Accuracy = correct / total * 100."),
 PR("**Early stopping** banao: har epoch ka loss diya hai. Jab tak loss pichhle best se kam ho raha hai, print karo. Jaise hi loss badhe, \"Early stop\" print karke `break` karo. Output:\nEpoch 1: loss 0.9\nEpoch 2: loss 0.7\nEpoch 3: loss 0.55\nEpoch 4: loss 0.5\nEarly stop at epoch 5, best loss 0.5",
    """
losses = [0.9, 0.7, 0.55, 0.5, 0.52, 0.6, 0.45]
best = 999
for epoch in range(1, len(losses) + 1):
    loss = losses[epoch - 1]
    # TODO: loss < best ho to best update karo aur print karo
    # TODO: warna Early stop message print karke break
""",
    """
losses = [0.9, 0.7, 0.55, 0.5, 0.52, 0.6, 0.45]
best = 999
for epoch in range(1, len(losses) + 1):
    loss = losses[epoch - 1]
    if loss < best:
        best = loss
        print(f"Epoch {epoch}: loss {loss}")
    else:
        print(f"Early stop at epoch {epoch}, best loss {best}")
        break
""",
    "if/else loop ke andar. else mein print ke baad `break`. Dhyan de: 0.45 kabhi nahi dikhega, kyunki break pehle ho gaya."),
]

quiz = [
 {"q": "`print(7 >= 7 and 3 > 5)` ka output?", "o": ["True", "False", "Error", "7"], "a": 1,
  "why": "`7 >= 7` True hai lekin `3 > 5` False. `and` ko dono True chahiye, isliye False."},
 {"q": "`list(range(2, 10, 3))` kya dega?", "o": ["[2, 5, 8]", "[2, 4, 6, 8]", "[3, 6, 9]", "[2, 5, 8, 11]"], "a": 0,
  "why": "2 se shuru, 3-3 ka step, 10 se pehle ruko: 2, 5, 8."},
 {"q": "marks = 95 ho, aur pehli condition `if marks >= 60:` (Grade D) ho, phir `elif marks >= 90:` (Grade A). Kya print hoga?",
  "o": ["Grade A", "Dono", "Grade D", "Kuch nahi"], "a": 2,
  "why": "elif chain mein pehli True condition jeet jaati hai. 95 >= 60 pehle True ho gaya, isliye D. Strict condition upar honi chahiye."},
 {"q": "`for i in range(5): print(i)` ka aakhri number kya print hoga?", "o": ["5", "0", "6", "4"], "a": 3,
  "why": "range(5) = 0, 1, 2, 3, 4. Stop number include nahi hota."},
 {"q": "while loop mein update line (`count -= 1`) bhool gaye to kya hoga?", "o": ["SyntaxError", "Loop ek baar chalega", "Infinite loop", "Loop chalega hi nahi"], "a": 2,
  "why": "Condition kabhi False nahi hogi, isliye loop kabhi nahi rukega."},
 {"q": "`break` aur `continue` mein sahi farak?", "o": ["break round skip karta, continue loop band", "break loop band karta, continue sirf round skip", "Dono same", "Dono sirf while mein chalte"], "a": 1,
  "why": "break poora loop khatam karta hai; continue bas current round chhod ke agle pe jaata hai. Dono for aur while dono mein chalte hain."},
 {"q": "Kaunsi value condition mein **False** maani jaati hai?", "o": ["\"0\"", "[0]", "-1", "\"\""], "a": 3,
  "why": "Khaali text `\"\"` falsy hai. `\"0\"` text non-empty hai, `[0]` list non-empty hai, aur -1 non-zero hai, teeno truthy."},
 {"q": "Nested loop: bahar `range(3)`, andar `range(4)`. Andar ki body kitni baar chalegi?", "o": ["12", "7", "4", "3"], "a": 0,
  "why": "Bahar ke har round mein andar poora chalta hai: 3 x 4 = 12."},
 {"q": "`if x == 1 or 2:` ke baare mein sahi baat?", "o": ["x 1 ya 2 ho tabhi True", "Hamesha True, kyunki 2 truthy hai", "SyntaxError", "Hamesha False"], "a": 1,
  "why": "Python ise `(x == 1) or 2` padhta hai, aur `2` khud True maana jaata hai. Sahi: `x == 1 or x == 2`."},
 {"q": "`\"PASS\" if defects == 0 else \"FAIL\"` jab defects = 2 ho?", "o": ["PASS", "Error", "FAIL", "None"], "a": 2,
  "why": "Ternary: condition False hai (2 != 0), isliye else wali value FAIL."},
]

iq = [
 {"q": "`==` aur `is` mein kya farak hai?", "a": "`==` value compare karta hai (dono ka content same hai kya). `is` identity compare karta hai (dono bilkul same object hain kya, memory mein ek hi jagah). `None` check ke liye hamesha `is` use karte hain: `if x is None:`."},
 {"q": "Python mein indentation ka kya role hai?", "a": "Python mein indentation hi block banata hai; C/Java ki tarah `{ }` nahi hote. if, for, while, def ke baad `:` aur andar ki lines ek jaise indent (PEP 8: 4 spaces). Galat indentation pe IndentationError aata hai ya logic chupke se galat ho jaata hai."},
 {"q": "for loop aur while loop kab use karte ho?", "a": "for jab sequence ya count pehle se pata ho (list ke items, range(10)). while jab rukne ki shart pehle se na pata ho, jaise user sahi input de tab tak, ya loss converge hone tak. for mein infinite loop ka risk kam hota hai."},
 {"q": "break, continue aur pass mein farak batao.", "a": "break loop turant band karta hai. continue current iteration skip karke agle pe jaata hai. pass kuch nahi karta, bas placeholder hai jahan syntax ko koi statement chahiye (jaise khaali if ya function)."},
 {"q": "Loop ke saath else kab chalta hai?", "a": "for/while ka else tabhi chalta hai jab loop normal tareeke se khatam ho, yaani break na hua ho. Search mein useful hai: break se mila, warna else mein \"not found\"."},
 {"q": "Truthy aur falsy values kya hain?", "a": "Condition mein kuch values automatically False maani jaati hain: 0, 0.0, \"\", None, [], {}, (), set(). Baaki sab truthy. Isliye `if my_list:` likh ke check kar sakte ho ki list khaali nahi hai."},
 {"q": "Short-circuit evaluation kya hai?", "a": "`and` mein pehli value False ho to doosri check hi nahi hoti; `or` mein pehli True ho to doosri skip. Isse safe checks likh sakte ho: `if count > 0 and total / count > 5:` mein zero se divide ka error nahi aayega."},
 {"q": "FizzBuzz likho (1 se 15).", "a": "Sabse pehle 15 wala (dono) check, phir 3, phir 5:\n`for i in range(1, 16):\n    if i % 15 == 0: print(\"FizzBuzz\")\n    elif i % 3 == 0: print(\"Fizz\")\n    elif i % 5 == 0: print(\"Buzz\")\n    else: print(i)`\nYeh elif order samajh ka test hai."},
 {"q": "Nested loop ki time complexity kya hoti hai?", "a": "Agar dono loop n baar chalte hain to body n x n = O(n^2) baar chalti hai. n = 10,000 pe 10 crore operations, bahut slow. Isliye bade data pe vectorized NumPy ya better algorithm (jaise set/dict lookup) use karte hain."},
 {"q": "ML mein loops aur conditions kahan aate hain?", "a": "Training loop (har epoch, har batch), early stopping (`if val_loss` badha to break), threshold se class decide karna (`1 if prob >= 0.5 else 0`), hyperparameter grid search (nested loops). Decision tree model bhi andar se nested if-else hi hai."},
 {"q": "Python mein switch-case hai kya?", "a": "Purane Python mein nahi tha, if/elif/else ya dict mapping use karte the. Python 3.10 se `match`/`case` aaya hai (structural pattern matching), jo switch jaisa kaam karta hai aur patterns bhi match kar sakta hai."},
]

S = {"n": 2, "id": "aiml-02", "title": "Conditions & Loops",
     "goal": "Comparison aur logical operators se sawaal poochna, if/elif/else se faisle lena, aur for/while loops, break/continue aur nested loops se kaam baar baar karwana seekhoge.",
     "lessons": lessons, "teach": teach, "practice": practice, "quiz": quiz, "iq": iq}
json.dump(S, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
