import json, os, subprocess, sys


def run(src):
    r = subprocess.run([sys.executable, "-I", "-c", src], capture_output=True, text=True, timeout=60,
                       env={**os.environ, "PYTHONHASHSEED": "0"})
    if r.returncode != 0:
        raise SystemExit("CODE FAILED:\n" + src + "\n" + r.stderr)
    return r.stdout.rstrip("\n")


def C(src, lang="python", out=True):
    """Code block. out=True -> run it and use real output. out=False -> no output (API keys, libs)."""
    src = src.strip("\n")
    return ["code", lang, src, run(src) if (out and lang == "python") else ""]


def SK(d):
    return ["sketch", d]


L1 = {"title": "LLM kya hai — tokens, context window, temperature", "blocks": [
    ["p", "**LLM = Large Language Model.** Ek bahut bada model jo internet ki kitabon, websites, code jaise **huge text** pe train hua hai. Uska ek hi kaam hai: **agla token predict karna** (agla shabd ka tukda)."],
    SK({"k": "flow", "title": "LLM agla word chunta hai", "steps": ["India ki capital", "New", "Delhi", "hai"], "dir": "h"}),
    ["analogy", "Mobile keyboard ka autocomplete dekha hai? \"Good\" likho to \"morning\" suggest karta hai. LLM wahi hai, bas 1000 guna bada aur samajhdaar. ChatGPT, Claude, Gemini, Llama sab LLM hain."],
    ["p", "Isse do zaroori baatein samajh aati hain:\n1. LLM sach check nahi karta, **pattern se sabse likely word** chunta hai.\n2. Isliye kabhi **confidently galat** bhi bol deta hai. Isko **hallucination** kehte hain (Lesson 3 mein detail)."],
    ["p", "**Token** = text ka chhota tukda. LLM words nahi, tokens padhta hai. English mein lagbhag **1 token ≈ ¾ word** (100 words ≈ 130 tokens). Hindi/Hinglish mein same baat ke zyada tokens lagte hain."],
    SK({"k": "array", "title": "\"Cable costing\" = 3 tokens", "items": ["Cable", " cost", "ing"], "index": True}),
    ["p", "Asli tokenizer (jaise `tiktoken`) model ke saath aata hai. Lekin rough andaaza hum khud laga sakte hain:"],
    C(r'''
text = "Cable costing ka hisaab Python se karo"
words = text.split()
print("Words:", len(words))
print("Approx tokens:", round(len(words) / 0.75))
'''),
    ["analogy", "Taxi meter jaisa: kilometer (tokens) ke hisaab se paisa lagta hai. **Input tokens + output tokens** dono ka bill banta hai, aur model ki limit bhi tokens mein hoti hai."],
    ["p", "**Context window** = model ek baar mein kitne tokens padh sakta hai: system prompt + poori history + tumhare documents + jawab, sab milake. Chhote models ~8K tokens, bade models 1 lakh se 10 lakh+ tokens. Limit cross hui to error, ya purana hissa kat jaata hai."],
    ["analogy", "Student ki desk jaisa: desk (context window) pe jitne pages aate hain, utne hi ek saath padh sakta hai. Poori library desk pe nahi aa sakti. Isi problem ka hal hai **RAG** (Lesson 6)."],
    ["p", "**Temperature** = randomness ka knob. Model har possible agle word ko ek score deta hai. Temperature se decide hota hai ki sirf top word chune ya doosre words ko bhi mauka de. Dhyan se dekh, yeh pure Python mein simulation hai:"],
    C(r'''
import math

scores = {"Delhi": 4.0, "Mumbai": 2.0, "Patna": 1.0}

def probs(t):
    exps = {w: math.exp(s / t) for w, s in scores.items()}
    total = sum(exps.values())
    return {w: round(e / total, 2) for w, e in exps.items()}

print("t=0.5", probs(0.5))
print("t=1.0", probs(1.0))
print("t=2.0", probs(2.0))
'''),
    ["p", "Temperature kam (0.5) → \"Delhi\" ka chance 98%, jawab har baar same. Temperature zyada (2.0) → doosre words ko bhi mauka, jawab creative lekin unpredictable. Temperature 0 = hamesha top word."],
    SK({"k": "table", "title": "Temperature kab kitna", "head": ["Temp", "Jawab", "Kab"], "rows": [["0", "har baar same", "extraction, facts"], ["0.7", "thoda creative", "chat, writing"], ["1+", "bahut random", "poem, ideas"]]}),
    ["tip", "Dhyan se dekh: tender se cable size nikaalna, document ki category batana, JSON banana → **temperature 0**. Wahan har baar same, bharosemand jawab chahiye."],
    ["p", "**Messages ke 3 roles** — yeh har API ka base hai:"],
    SK({"k": "table", "title": "3 roles", "head": ["Role", "Kya hai"], "rows": [["system", "AI ka role + rules"], ["user", "insaan ka sawal"], ["assistant", "AI ka pichla jawab"]]}),
    ["analogy", "Naya employee: system prompt = joining pe diya rulebook (\"Tum GEEP ke assistant ho, sirf Hinglish\"). User = customer ka sawal. Assistant = employee ne pehle kya bola tha."],
    ["warn", "Common galti: sochna ki LLM ko pichli baat yaad hai. **Har API call bilkul alag hai, model ki koi memory nahi.** ChatGPT \"yaad\" isliye rakhta hai kyunki har baar poori history dobara bhejta hai. Ghajini jaisa — har baar diary dikhani padti hai."]
]}

L2 = {"title": "OpenAI aur Claude API — code se AI se baat", "blocks": [
    ["p", "Jab tu ChatGPT ya Claude pe message likhta hai, andar ek **API call** jaati hai: tera message POST request mein jaata hai, AI ka jawab JSON response mein aata hai. Same kaam hum Python se karenge. (Stage 7 ka HTTP/API yaad hai na? Wahi.)"],
    SK({"k": "flow", "title": "API call ka safar", "steps": ["Tera code", "POST + key", "LLM server", "JSON jawab"], "dir": "h"}),
    ["p", "Har AI API ko **3 cheezein** chahiye:\n1. **API key** — tumhari pehchaan (signup karke milti hai, isi pe bill banta hai)\n2. **Model name** — kaunsa dimaag (gpt-4o-mini, claude-sonnet...)\n3. **Messages** — system + user (+ purani history)"],
    ["warn", "Common galti: API key seedha code mein likh dena aur GitHub pe push kar dena. Bots minutes mein key chura lete hain aur tera bill hazaaron mein. Key hamesha **environment variable** ya `.env` file mein (aur `.env` ko `.gitignore` mein daalo)."],
    C(r'''
# Terminal mein (Linux/Mac). Windows: setx OPENAI_API_KEY "..."
export OPENAI_API_KEY="sk-...apni-key..."
export ANTHROPIC_API_KEY="sk-ant-...apni-key..."
pip install openai anthropic
''', lang="bash"),
    ["p", "**OpenAI (GPT) API:**"],
    C(r'''
import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "Tum ek Python teacher ho. Hinglish mein jawab do."},
        {"role": "user", "content": "List comprehension kya hai?"},
    ],
    temperature=0.7,
    max_tokens=300,
)

print(response.choices[0].message.content)
print("Tokens used:", response.usage.total_tokens)
''', out=False),
    ["p", "Yeh chalane pe AI ka Hinglish jawab print hoga, phir kitne tokens lage (jaise `Tokens used: 182`). `max_tokens` jawab ki lambai (aur kharcha) ko limit karta hai."],
    ["p", "**Anthropic (Claude) API:**"],
    C(r'''
import os
import anthropic

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

response = client.messages.create(
    model="claude-sonnet-4-5",          # model naam docs se check karo, badalte rehte hain
    max_tokens=500,                     # Claude mein zaroori hai
    system="Tum GEEP Polymers ke AI assistant ho. Hinglish mein jawab do.",
    messages=[
        {"role": "user", "content": "XLPE cable PVC se behtar kyun hai?"},
    ],
)

print(response.content[0].text)
print("Tokens:", response.usage.input_tokens + response.usage.output_tokens)
''', out=False),
    ["p", "Output mein Claude ka jawab aur total tokens aayenge. Pattern bilkul same hai: client banao → model + messages bhejo → jawab nikalo."],
    SK({"k": "table", "title": "OpenAI vs Claude", "head": ["Cheez", "OpenAI", "Claude"], "rows": [["System", "messages ke andar", "alag system="], ["Jawab", "choices[0].message", "content[0].text"], ["max_tokens", "optional", "zaroori"], ["Tokens", "total_tokens", "input + output"]]}),
    ["p", "**Streaming** = poora jawab ek saath aane ka wait mat karo, word-by-word dikhao (jaise ChatGPT typing karta dikhta hai). User ko lagta hai app tez hai."],
    C(r'''
with client.messages.stream(
    model="claude-sonnet-4-5",
    max_tokens=500,
    messages=[{"role": "user", "content": "Python kya hai? 3 lines."}],
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)   # end="" = nayi line nahi, flush = turant dikhao
print()
''', out=False),
    ["p", "Isme jawab screen pe tukdon mein aata dikhega. OpenAI mein `stream=True` dete hain aur `chunk.choices[0].delta.content` padhte hain."],
    ["p", "**Conversation history (memory):** model ko memory nahi, isliye hum ek list mein saare messages rakhte hain aur har baar **poori list** bhejte hain."],
    C(r'''
history = []
questions = ["Mera naam Akash hai.", "Mera naam kya hai?"]

for q in questions:
    history.append({"role": "user", "content": q})
    response = client.messages.create(
        model="claude-sonnet-4-5", max_tokens=300,
        system="Tum ek helpful assistant ho.",
        messages=history,                 # POORI history
    )
    answer = response.content[0].text
    history.append({"role": "assistant", "content": answer})
    print("AI:", answer)
''', out=False),
    ["p", "Doosre sawal pe AI bolega \"Tumhara naam Akash hai\", kyunki pehla message bhi history mein gaya. History lambi = tokens zyada = paisa zyada. Isliye production mein purane messages **trim** ya **summarize** karte hain:"],
    C(r'''
history = [{"role": "user" if i % 2 else "assistant", "content": f"msg {i}"} for i in range(1, 11)]
MAX_MESSAGES = 4

trimmed = history[-MAX_MESSAGES:]
print("Pehle:", len(history), "Ab:", len(trimmed))
print([m["content"] for m in trimmed])
print("Pehla role:", trimmed[0]["role"])
'''),
    ["tip", "Dhyan se dekh: Claude mein history ka pehla message `user` hona chahiye aur roles baari-baari (user, assistant, user...) chalne chahiye. Isliye trim hamesha **jodi (pair)** mein karo."],
    ["p", "Production ke 3 aur rules: **timeout** lagao, fail ho to **retry with exponential backoff** (har baar double wait), aur ek provider fail ho to doosra (**fallback**). Backoff ke wait time:"],
    C(r'''
waits = [2 ** attempt for attempt in range(5)]
print("Wait seconds:", waits)
print("Total wait:", sum(waits))
'''),
    ["analogy", "Dukaan band mili to turant 100 baar darwaza nahi khatkhatate. 1 min ruko, phir 2, phir 4. Server ko bhi saans lene do (rate limit error 429 aaye to yahi karo)."]
]}

L3 = {"title": "Prompt engineering aur hallucination", "blocks": [
    ["p", "**Prompt** = jo instruction tum LLM ko dete ho. Same model, achha prompt = achha jawab, bekaar prompt = bekaar jawab. Garbage in, garbage out."],
    ["analogy", "Naye helper ko \"kuch le aao\" bolo to kuch bhi le aayega. \"Market se 2 kg aaloo, 50 rupaye tak, receipt ke saath\" bolo to sahi kaam hoga. Prompt mein bhi itna hi saaf bolo."],
    ["p", "**Achhe prompt ke 7 hisse** (IQ mein naam aur example bolo):"],
    ["list", ["**Role** — \"You are an assistant for a cable manufacturer.\"", "**Clear task** — \"Summarise in 5 bullet points.\"", "**Rules** — \"Use only the given text. If not found, say you don't know.\"", "**Output format** — \"Return JSON with keys: cable_type, size.\"", "**Delimiters** — data ko `<<< >>>` ya `<doc></doc>` mein band karo", "**Examples (few-shot)** — 2-3 sample input → output", "**Step by step** — \"Think step by step, then give the final answer.\""]],
    SK({"k": "stack", "title": "Prompt ki building", "items": ["Role", "Task", "Rules", "Format", "Examples", "Data <<< >>>"]}),
    ["p", "Prompt bas ek string hai, isliye Python mein f-string se template bana sakte ho:"],
    C(r'''
def build_prompt(tender_text):
    return f"""You are an assistant for a cable company.
Task: extract cable type and size.
Rules: use only the text. If missing, use null.
Format: JSON with keys cable_type, size_sqmm.
Text:
<<<
{tender_text}
>>>"""

p = build_prompt("Supply of 2C x 16 sqmm XLPE armoured cable, 500 m")
print(p.splitlines()[0])
print(p.splitlines()[-2])
print("Lines:", len(p.splitlines()))
'''),
    ["p", "**Zero-shot vs Few-shot:** zero-shot = bina example seedha sawal. Few-shot = pehle 2-3 examples dikhao, phir sawal. Model ko pattern dikh jaata hai ki kaisa jawab chahiye."],
    C(r'''
Classify the document category. Answer with one word.

"Invoice No 123, Amount Rs 5000"            -> Invoice
"4 core cable, voltage test passed"         -> QualityReport
"Please quote for 500 m copper cable"       -> Enquiry

"Purchase order for 2C x 16 sqmm cable"     ->
''', lang="text"),
    ["p", "Model yahan `PurchaseOrder` jaisa ek word dega, kyunki examples ne format sikha diya."],
    ["p", "**Chain-of-thought (CoT):** mushkil sawal pe bolo \"step by step socho\". Model beech ke steps likhta hai to galti kam hoti hai, jaise exam mein rough work karne se. Lekin tokens (aur latency) badhte hain, isliye sirf reasoning wale kaam pe use karo."],
    ["p", "**Structured JSON output:** app ko jawab text nahi, **data** chahiye. Prompt mein JSON maango (aur API mein JSON mode / structured output on karo), phir code mein `json.loads` se check karo:"],
    C(r'''
import json

reply = '{"cable_type": "XLPE", "size_sqmm": 16, "cores": 2, "quantity_m": null}'
data = json.loads(reply)

required = ["cable_type", "size_sqmm", "cores", "quantity_m"]
missing = [k for k in required if k not in data]
print(data["cable_type"], data["size_sqmm"])
print("Missing keys:", missing)
print("Quantity:", data["quantity_m"])
'''),
    ["p", "Model kabhi JSON ke saath faltu text bhi bol deta hai. Tab `json.loads` fail hoga, aur hum use pakad ke **human review** mein bhejte hain, database mein nahi:"],
    C(r'''
import json

reply = "Sure! Here is the data: {cable_type: XLPE}"
try:
    data = json.loads(reply)
    print("OK", data)
except json.JSONDecodeError:
    print("Invalid JSON -> human review")
'''),
    ["tip", "Dhyan se dekh: prompt mein \"Use null if missing. Do not guess.\" likhna bahut kaam ki line hai. Warna model apni taraf se quantity bana dega. Production mein Pydantic model se types bhi validate karte hain."],
    ["p", "**Hallucination** = LLM ka confidently galat ya banaya hua jawab. Example: \"IS 694 ki clause 12.3 kya kehti hai?\" → model bolega \"Clause 12.3 states...\" jabki shayad aisi clause hai hi nahi. Kyun? Uska kaam likely word dena hai, sach check karna nahi."],
    SK({"k": "tree", "title": "Hallucination ke bachav", "root": {"label": "Kam karo", "children": [{"label": "RAG grounding", "children": []}, {"label": "Nahi pata = bolo", "children": []}, {"label": "Temp 0 + JSON", "children": []}, {"label": "Human verify", "children": []}]}}),
    ["list", ["RAG — apne documents se jawab dilao, sources dikhao", "Prompt: \"If not in context, say you don't know\"", "Temperature 0, structured output + validation", "Choices limit karo — \"sirf in 10 categories mein se chuno\"", "Important decision pe insaan approve kare"]],
    ["warn", "Common galti: LLM se paise ka hisaab karwana (costing, GST, copper weight). **Exact calculation hamesha Python code mein**, LLM sirf samajhne, nikaalne aur likhne ke liye."]
]}

L4 = {"title": "LangChain — models, prompts, chains, output parsers", "blocks": [
    ["p", "Abhi tak OpenAI ka alag code, Claude ka alag. **LangChain** ek framework hai jo LLM apps ke common tukde ready deta hai: **models, prompt templates, output parsers, document loaders, text splitters, vector store connectors, agents**."],
    ["analogy", "Har phone brand ka alag charger = har AI ka alag SDK. LangChain = universal charger. Model badalna ho to bas ek line badlo."],
    C(r'''
pip install langchain langchain-openai langchain-anthropic
''', lang="bash"),
    ["p", "LangChain ke 4 basic tukde:"],
    SK({"k": "table", "title": "LangChain blocks", "head": ["Tukda", "Kaam"], "rows": [["Model", "ChatOpenAI / ChatAnthropic"], ["Prompt", "template with {vars}"], ["Chain", "prompt | llm | parser"], ["Parser", "jawab → str / JSON"]]}),
    C(r'''
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

prompt = ChatPromptTemplate.from_messages([
    ("system", "Tum ek {role} ho. {language} mein jawab do."),
    ("human", "{question}"),
])

chain = prompt | llm | StrOutputParser()

result = chain.invoke({
    "role": "Python teacher",
    "language": "Hinglish",
    "question": "Decorator kya hai?",
})
print(result)
''', out=False),
    ["p", "Isme `result` ek simple string hogi (AI ka Hinglish jawab). `|` (pipe) ka matlab: **ek ka output doosre ka input**. Pehle prompt bhara, phir LLM ko gaya, phir parser ne message object se sirf text nikaala."],
    SK({"k": "flow", "title": "Chain = pipe", "steps": ["{variables}", "Prompt", "LLM", "Parser", "result"], "dir": "h"}),
    ["p", "Yeh pipe andar se kaise kaam karta hai? Pure Python mein ek chhota version banake dekh (`__or__` magic method `|` ko handle karta hai, Stage 5 ka OOP yaad kar):"],
    C(r'''
class Step:
    def __init__(self, fn):
        self.fn = fn
    def __or__(self, other):                 # a | b
        return Step(lambda x: other.fn(self.fn(x)))
    def invoke(self, x):
        return self.fn(x)

prompt = Step(lambda d: f"Explain {d['topic']} in 1 line.")
fake_llm = Step(lambda p: {"content": "Reply for: " + p})
parser = Step(lambda msg: msg["content"].upper())

chain = prompt | fake_llm | parser
print(chain.invoke({"topic": "RAG"}))
'''),
    ["p", "**Model switch — 1 line:**"],
    C(r'''
from langchain_anthropic import ChatAnthropic

llm = ChatAnthropic(model="claude-sonnet-4-5", temperature=0)
chain = prompt | llm | StrOutputParser()     # baaki sab SAME
''', out=False),
    ["p", "**JSON output parser** — jawab seedha Python dict/list ban ke aata hai:"],
    C(r'''
from langchain_core.output_parsers import JsonOutputParser

prompt = ChatPromptTemplate.from_template(
    "Top 3 {topic} batao. Sirf JSON: [{{\"name\": \"...\", \"reason\": \"...\"}}]"
)
chain = prompt | llm | JsonOutputParser()

items = chain.invoke({"topic": "Python libraries for AI"})
for item in items:
    print(item["name"], "-", item["reason"])
''', out=False),
    ["p", "Yahan `items` ek Python list hogi, jaise `numpy - fast arrays`, `pandas - tables`, `scikit-learn - ML models`. Dhyan de: template mein JSON ke `{ }` ko `{{ }}` likhte hain, warna LangChain use variable samjhega."],
    ["tip", "Fayda: jaldi banta hai, provider badalna aasaan, RAG ke loaders/splitters ready. Nuksaan: ek extra layer, versions jaldi badalte hain, debug thoda mushkil. IQ line: \"Simple feature ke liye seedha SDK, RAG pipeline ke liye LangChain.\""],
    ["warn", "Common galti: purane tutorials ka `from langchain.llms import OpenAI` ya `LLMChain` copy karna. Naya style hai `langchain_openai`, `langchain_core` aur `|` pipe (LCEL)."]
]}

L5 = {"title": "Embeddings, cosine similarity aur vector databases", "blocks": [
    ["p", "**Embedding** = text ko numbers ki list (**vector**) mein badalna, aise ki **matlab** numbers mein aa jaaye. Milte-julte matlab wale texts ke vectors paas-paas hote hain, chahe words alag hon."],
    ["analogy", "Shehar ke mohalle socho: \"cable price\", \"wire rate\", \"copper ka bhaav\" ek mohalle mein rehte hain. \"cricket\", \"match\", \"score\" doosre mohalle mein. Search = \"mere sawal ke ghar ke sabse paas kaun rehta hai?\""],
    SK({"k": "chart", "title": "Meaning space (2D)", "type": "scatter", "points": [[1, 8], [1.5, 7.5], [2, 8.5], [7, 2], [7.5, 2.8], [8, 1.5]], "xl": "dimension 1", "yl": "dimension 2"}),
    ["p", "Asli embedding model (jaise OpenAI `text-embedding-3-small`) har text ke liye ~1536 numbers deta hai. Samjhne ke liye hum 3 numbers wale chhote vectors lete hain."],
    ["p", "**Cosine similarity** = do vectors ke beech ka angle. Formula: `dot(a, b) / (|a| * |b|)`. **1 = same direction (same matlab), 0 = koi rishta nahi, -1 = ulta.**"],
    C(r'''
import numpy as np

price   = np.array([0.9, 0.1, 0.2])
rate    = np.array([0.8, 0.2, 0.1])
cricket = np.array([0.1, 0.9, 0.3])

def cosine(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

print("price vs rate   :", round(cosine(price, rate), 3))
print("price vs cricket:", round(cosine(price, cricket), 3))
'''),
    ["p", "\"price\" aur \"rate\" ka score 0.987 (lagbhag same matlab), \"cricket\" ka sirf 0.271. Phone pe numpy nahi hai, to yahi pure Python mein (practice mein yahi aayega):"],
    C(r'''
import math

def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb)

print(round(cosine([1, 0], [1, 0]), 2))
print(round(cosine([1, 0], [0, 1]), 2))
print(round(cosine([1, 0], [-1, 0]), 2))
'''),
    SK({"k": "table", "title": "Cosine score ka matlab", "head": ["Score", "Matlab"], "rows": [["1", "same direction"], ["0", "koi rishta nahi"], ["-1", "bilkul ulta"]]}),
    SK({"k": "compare", "title": "Keyword vs Semantic search", "left": {"title": "Keyword", "items": ["words match", "\"rate\" se \"price\" nahi", "\"IS 694\" exact achha", "SQL LIKE, BM25"]}, "right": {"title": "Semantic", "items": ["matlab match", "\"rate\" se \"price\" haan", "exact code kamzor", "embeddings + cosine"]}}),
    ["tip", "Dhyan se dekh: production mein **hybrid search** best hai = keyword + semantic dono. Jaise `final = 0.7 * vector_score + 0.3 * keyword_score`. Cable codes aur IS numbers ke liye keyword zaroori hai."],
    ["p", "Ab top-k search khud karke dekh. Har document ka vector ek matrix ki row hai; query se sab ka cosine nikaalo aur sabse bade score wale chuno:"],
    C(r'''
import numpy as np

docs = ["warranty policy", "payment terms", "copper price", "delivery time"]
vecs = np.array([[0.9, 0.1, 0.0], [0.1, 0.9, 0.1], [0.0, 0.3, 0.9], [0.3, 0.2, 0.2]])
query = np.array([0.8, 0.2, 0.1])           # "guarantee kitne din?"

scores = vecs @ query / (np.linalg.norm(vecs, axis=1) * np.linalg.norm(query))
top = np.argsort(scores)[::-1][:2]
print([docs[i] for i in top])
print(np.round(scores[top], 2).tolist())
'''),
    ["p", "**Vector database** = embeddings store karne aur lakhon mein se sabse paas wale **tez** dhoondhne ke liye bana database (andar ANN index jaise HNSW, jo har vector se compare nahi karta)."],
    SK({"k": "table", "title": "Kaunsa vector DB", "head": ["DB", "Kab"], "rows": [["FAISS", "local, prototype, fast"], ["Chroma", "simple, Python, chhota prod"], ["pgvector", "Postgres already hai"], ["Pinecone/Qdrant", "bada scale, managed"]]}),
    C(r'''
import chromadb

client = chromadb.PersistentClient(path="./vectordb")
col = client.get_or_create_collection("docs")

col.add(
    ids=["1", "2"],
    documents=["Warranty is 12 months from dispatch.", "Payment terms are 30 days."],
    metadatas=[{"source": "terms.pdf", "page": 1}, {"source": "terms.pdf", "page": 2}],
)

res = col.query(query_texts=["how long is the guarantee?"], n_results=1)
print(res["documents"])
''', out=False),
    ["p", "Iska output hoga `[['Warranty is 12 months from dispatch.']]`. \"guarantee\" likha tha, \"Warranty\" mila — matlab se match hua. Chroma apna default embedding model khud chalata hai (pehli baar download karta hai)."],
    ["p", "**pgvector** — Postgres mein hi vector column (Stage 6 ka SQL kaam aayega):"],
    C(r'''
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
    id SERIAL PRIMARY KEY,
    content TEXT,
    source TEXT,
    embedding VECTOR(1536)
);

-- <=> = cosine distance (chhota = zyada similar)
SELECT content, source
FROM chunks
ORDER BY embedding <=> '[0.12, 0.05, ...]'
LIMIT 3;
''', lang="sql"),
    ["warn", "Common galti: documents ko ek embedding model se store karna aur query ko doosre model se embed karna. **Dono ke liye same embedding model** zaroori hai, warna numbers ka matlab hi alag hoga."]
]}

L6 = {"title": "RAG pipeline — chunking, retrieval aur evaluation", "blocks": [
    ["p", "**Problem:** \"Hamari company ki warranty policy kya hai?\" LLM ko tere documents nahi pata, to woh kuch bana dega (hallucination). Poore 500 documents prompt mein daalo? Context window mein nahi aayenge, aur bahut mehenga."],
    ["p", "**RAG = Retrieval Augmented Generation.** Jawab dene se pehle apne documents se **relevant tukde dhoondho (Retrieval)**, unhe prompt mein **jodo (Augmented)**, phir LLM se **jawab banwao (Generation)**."],
    ["analogy", "Open-book exam: student (LLM) ko poori library yaad nahi. Sawal aaya → sahi kitaab ka sahi page khola (retrieve) → us page se jawab likha (generate)."],
    SK({"k": "flow", "title": "RAG ke 6 steps", "steps": ["Load", "Split", "Embed", "Store", "Retrieve", "Generate"], "dir": "h"}),
    SK({"k": "compare", "title": "2 phases", "left": {"title": "Indexing (ek baar)", "items": ["Load: PDF/Excel text", "Split: chunks", "Embed: vectors", "Store: vector DB"]}, "right": {"title": "Query (har sawal)", "items": ["Sawal ka embedding", "Retrieve top-k", "Prompt + context", "Generate jawab"]}}),
    ["p", "**Chunking kyun?** Poora 50 page ka document ek embedding mein = warranty, payment, delivery sab ghul gaya, search bekaar. Chhote chunks (~300-800 tokens) = sahi paragraph milta hai. **Overlap kyun?** Jo baat do chunks ki boundary pe kat gayi, woh overlap se dono mein poori rehti hai."],
    C(r'''
def chunk_text(text, size, overlap):
    chunks = []
    step = size - overlap
    for start in range(0, len(text), step):
        chunks.append(text[start:start + size])
        if start + size >= len(text):
            break
    return chunks

text = "ABCDEFGHIJKLMNOPQRST"
for c in chunk_text(text, size=8, overlap=3):
    print(c)
'''),
    ["p", "Dhyan se dekh: har chunk ke aakhri 3 letters agle chunk ke shuru mein dobara aaye (FGH, KLM, PQR). Yahi overlap hai."],
    ["list", ["**Fixed size** — har 500 characters/tokens pe kaato (simple, kabhi sentence beech mein katta hai)", "**Sentence / paragraph** — `.` ya khaali line pe kaato (matlab saaf rehta hai)", "**Recursive** — pehle paragraph, phir line, phir sentence pe todne ki koshish (LangChain `RecursiveCharacterTextSplitter`, sabse common)", "**Heading / structure based** — PDF ke headings, Excel ki rows, code ke functions pe", "Rule of thumb: 300-800 tokens, 10-20% overlap, aur har chunk ke saath **metadata** (file, page)"]],
    ["p", "Ab ek **mini RAG retriever** bina kisi library ke — word overlap se score, top-k, aur **score gate** (kamzor match pe \"nahi mila\"):"],
    C(r'''
STOP = {"what", "is", "the", "of", "for", "a", "on", "in", "how"}

chunks = [
    "Warranty for armoured cables is 12 months from dispatch.",
    "Payment terms are 30 days from invoice.",
    "Delivery within Delhi NCR takes 3 to 5 days.",
]

def words(text):
    return {w.strip(".,?").lower() for w in text.split()} - STOP

def retrieve(question, k=1, min_score=0.2):
    q = words(question)
    scored = []
    for c in chunks:
        cw = words(c)
        score = len(q & cw) / len(q | cw)          # Jaccard overlap
        scored.append((round(score, 2), c))
    scored.sort(reverse=True)
    return [x for x in scored[:k] if x[0] >= min_score]

print(retrieve("What is the warranty for armoured cables?"))
print(retrieve("What is the capital of France?"))
'''),
    ["p", "Pehle sawal pe warranty wala chunk mila. Doosre pe khaali list `[]` — yahi **score gate** hai: kamzor context pe LLM ko pucho hi mat, seedha \"documents mein nahi mila\" bolo. Asli RAG mein word overlap ki jagah embeddings ka cosine hota hai, idea same."],
    ["p", "**Generate step** — retrieved chunks + sawal ko ek grounded prompt mein daalo:"],
    C(r'''
def make_rag_prompt(question, hits):
    context = "\n".join(f"- {c}" for _, c in hits)
    return (
        "Answer using ONLY the context. If not found, say 'Nahi mila'.\n"
        f"Context:\n{context}\n"
        f"Question: {question}"
    )

hits = [(0.5, "Warranty for armoured cables is 12 months from dispatch.")]
print(make_rag_prompt("Warranty kitni hai?", hits))
'''),
    ["p", "**LangChain mein poora RAG** (book ka code, yaad karne layak):"],
    C(r'''
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

docs = PyPDFLoader("company_manual.pdf").load()                       # 1 LOAD
splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
chunks = splitter.split_documents(docs)                              # 2 SPLIT
vectorstore = FAISS.from_documents(chunks, OpenAIEmbeddings())       # 3 EMBED + 4 STORE
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})         # 5 RETRIEVE

prompt = ChatPromptTemplate.from_template(
    "Context:\n{context}\n\nQuestion: {question}\n"
    "Sirf context se jawab do. Nahi mila to bolo 'Nahi mila'."
)

def format_docs(docs):
    return "\n\n".join(d.page_content for d in docs)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt | ChatOpenAI(model="gpt-4o-mini", temperature=0) | StrOutputParser()
)
print(rag_chain.invoke("Company ki leave policy kya hai?"))          # 6 GENERATE
''', out=False),
    ["p", "Yeh PDF se leave policy wala jawab dega, sirf manual ke content se. Manual mein na ho to \"Nahi mila\"."],
    ["p", "**RAG ka evaluation** — \"mujhe achha laga\" kaafi nahi. 30-50 asli sawal + sahi jawab ka **test set** banao (bahar ke sawal bhi, jinka jawab \"NOT_FOUND\" hona chahiye). Har change (chunk size, model, prompt) ke baad poora set chalao. **Retrieval aur answer alag-alag check karo:**"],
    C(r'''
tests = [
    {"q": "warranty?", "expected_chunk": 0, "retrieved": [0, 2]},
    {"q": "payment terms?", "expected_chunk": 1, "retrieved": [1, 0]},
    {"q": "delivery time?", "expected_chunk": 2, "retrieved": [0, 1]},
    {"q": "GST number?", "expected_chunk": 1, "retrieved": [1, 2]},
]

hits = sum(1 for t in tests if t["expected_chunk"] in t["retrieved"])
print(f"Hit rate @2: {hits}/{len(tests)} = {hits / len(tests):.0%}")
fails = [t["q"] for t in tests if t["expected_chunk"] not in t["retrieved"]]
print("Fix these:", fails)
'''),
    SK({"k": "table", "title": "RAG metrics", "head": ["Metric", "Sawal"], "rows": [["Hit rate / Recall@k", "sahi chunk aaya?"], ["Context precision", "kachra kitna aaya?"], ["Faithfulness", "jawab context se?"], ["Answer relevance", "sawal ka jawab?"]]}),
    ["tip", "Dhyan se dekh: RAGAS jaisi libraries yeh metrics LLM-as-judge se nikaalti hain. Production mein user ka 👍/👎, \"Nahi mila\" kitni baar aaya, aur galat jawab log karke test set mein jodna — yahi asli improvement loop hai."],
    ["list", ["Better RAG ke senior points: achhi chunking (headings pe)", "Metadata + sources dikhao (file, page)", "Hybrid search (keyword + semantic)", "Re-ranking: pehle 20 lao, cross-encoder se best 4 chuno", "Score gate, scanned PDF ke liye OCR, document badle to re-index"]],
    ["warn", "Common galti: retrieval test kiye bina sirf prompt badalte rehna. 80% RAG problems **retrieval** mein hoti hain (galat chunk aaya), LLM mein nahi."]
]}

teach = [
    {"say": "LLM ka ek hi kaam hai: agla token guess karna. Bahut bada autocomplete. Isliye kabhi confidently galat bhi bolta hai.", "sketch": {"k": "flow", "steps": ["India ki capital", "New", "Delhi"], "dir": "h"}, "code": None},
    {"say": "Token matlab text ka tukda. Paisa aur limit dono tokens mein. Context window matlab desk ka size — kitna ek saath padh sakta hai.", "sketch": {"k": "array", "items": ["Cable", " cost", "ing"], "index": True}, "code": None},
    {"say": "Temperature randomness ka knob hai. Zero pe har baar same jawab, zyada pe creative. Data nikaalna ho to zero.", "sketch": {"k": "table", "head": ["Temp", "Kab"], "rows": [["0", "extraction"], ["0.7", "chat"], ["1+", "poem"]]}, "code": None},
    {"say": "Teen roles yaad karo: system rules deta hai, user sawal poochta hai, assistant pichla jawab hai. Model ko memory nahi, history har baar bhejo.", "sketch": {"k": "stack", "items": ["system: rules", "user: sawal", "assistant: jawab", "user: naya sawal"]}, "code": None},
    {"say": "API call ka pattern har company mein same: key environment se lo, model aur messages bhejo, jawab nikalo.", "sketch": {"k": "flow", "steps": ["Client + key", "model + messages", "response"], "dir": "h"}, "code": "client = anthropic.Anthropic()\nr = client.messages.create(model=MODEL, max_tokens=300,\n    messages=[{\"role\": \"user\", \"content\": \"Hi\"}])\nprint(r.content[0].text)"},
    {"say": "Achha prompt ek building jaisa: role, task, rules, format, examples, aur data delimiters mein band. Few-shot matlab pehle examples dikhao.", "sketch": {"k": "stack", "items": ["Role", "Task", "Rules", "Format", "Examples", "<<< Data >>>"]}, "code": None},
    {"say": "LangChain mein pipe lagate hain: prompt, phir LLM, phir parser. Ek ka output doosre ka input. Model badlo, baaki same.", "sketch": {"k": "flow", "steps": ["Prompt", "LLM", "Parser"], "dir": "h"}, "code": "chain = prompt | llm | StrOutputParser()\nchain.invoke({\"topic\": \"RAG\"})"},
    {"say": "Embedding text ko numbers banata hai. Same matlab wale paas-paas. Paas kitna hai, yeh cosine similarity batata hai: 1 same, 0 koi rishta nahi.", "sketch": {"k": "chart", "type": "scatter", "points": [[1, 8], [1.5, 7.5], [7, 2], [7.5, 2.5]], "xl": "dim 1", "yl": "dim 2"}, "code": "dot / (norm(a) * norm(b))"},
    {"say": "RAG ke 6 steps munh zubani: Load, Split, Embed, Store — yeh ek baar. Retrieve, Generate — har sawal pe.", "sketch": {"k": "flow", "steps": ["Load", "Split", "Embed", "Store", "Retrieve", "Generate"], "dir": "h"}, "code": None},
    {"say": "Aakhri baat: chunks mein overlap rakho, kamzor match pe score gate lagao, aur test set se retrieval aur answer alag-alag check karo. Ab practice!", "sketch": {"k": "compare", "left": {"title": "Retrieval check", "items": ["sahi chunk aaya?", "hit rate @k"]}, "right": {"title": "Answer check", "items": ["context se hai?", "sahi jawab?"]}}, "code": None},
]

practice = [
    {"q": "Ek simple **tokenizer** banao: text ko lowercase karo, `.,?!` hatao, words mein todo. Phir words count aur approx tokens (words / 0.75, round) print karo, aur cost nikaalo agar 1 token = Rs 0.002 ho (approx tokens se, 3 decimal). Expected:\n['xlpe', 'cable', 'ka', 'rate', 'kya', 'hai', 'aaj']\nWords: 7\nTokens: 9\nCost: Rs 0.018",
     "starter": "text = \"XLPE cable ka rate kya hai, aaj?\"\n\ndef tokenize(t):\n    # TODO: lowercase, .,?! hatao, split\n    pass\n\nwords = tokenize(text)\nprint(words)\n# TODO: Words, Tokens, Cost print karo\n",
     "hint": "for ch in \".,?!\": t = t.replace(ch, \"\")  phir t.lower().split(). Cost = tokens * 0.002, f\"{cost:.3f}\".",
     "solution": "text = \"XLPE cable ka rate kya hai, aaj?\"\n\ndef tokenize(t):\n    for ch in \".,?!\":\n        t = t.replace(ch, \"\")\n    return t.lower().split()\n\nwords = tokenize(text)\nprint(words)\ntokens = round(len(words) / 0.75)\nprint(\"Words:\", len(words))\nprint(\"Tokens:\", tokens)\nprint(f\"Cost: Rs {tokens * 0.002:.3f}\")"},
    {"q": "`cosine(a, b)` function banao (sirf `math`, numpy nahi) aur query vector se teeno documents ka score (2 decimal) print karo, phir sabse milta-julta document. Expected:\nwarranty 0.98\npayment 0.38\ndelivery 0.67\nBest: warranty",
     "starter": "import math\n\ndocs = {\n    \"warranty\": [0.9, 0.1, 0.1],\n    \"payment\": [0.1, 0.9, 0.2],\n    \"delivery\": [0.4, 0.3, 0.8],\n}\nquery = [0.8, 0.2, 0.2]\n\ndef cosine(a, b):\n    # TODO: dot / (norm a * norm b)\n    pass\n\n# TODO: har doc ka score print karo, phir Best\n",
     "hint": "dot = sum(x*y for x, y in zip(a, b)); norm = math.sqrt(sum(x*x for x in a)). Best ke liye max(docs, key=...).",
     "solution": "import math\n\ndocs = {\n    \"warranty\": [0.9, 0.1, 0.1],\n    \"payment\": [0.1, 0.9, 0.2],\n    \"delivery\": [0.4, 0.3, 0.8],\n}\nquery = [0.8, 0.2, 0.2]\n\ndef cosine(a, b):\n    dot = sum(x * y for x, y in zip(a, b))\n    na = math.sqrt(sum(x * x for x in a))\n    nb = math.sqrt(sum(y * y for y in b))\n    return dot / (na * nb)\n\nscores = {name: cosine(vec, query) for name, vec in docs.items()}\nfor name, s in scores.items():\n    print(name, round(s, 2))\nprint(\"Best:\", max(scores, key=scores.get))"},
    {"q": "**Mini RAG retriever** banao. Har chunk ka score = sawal ke kitne words (stop words hata ke) chunk mein hain. Sabse zyada score wala chunk lo; agar score 0 ho to `Nahi mila` (score gate). Teeno sawalon ka jawab print karo. Expected:\nwarranty kitni hai? -> Warranty is 12 months from dispatch.\npayment kab tak? -> Payment within 30 days of invoice.\ncricket score? -> Nahi mila",
     "starter": "STOP = {\"kitni\", \"hai\", \"kab\", \"tak\", \"is\", \"of\", \"from\"}\nchunks = [\n    \"Warranty is 12 months from dispatch.\",\n    \"Payment within 30 days of invoice.\",\n    \"Delivery in 5 days.\",\n]\n\ndef words(t):\n    # TODO: lowercase, '.' aur '?' hatao, split, set banao, STOP hatao\n    pass\n\ndef answer(q):\n    # TODO: best chunk dhoondo, score 0 -> \"Nahi mila\"\n    pass\n\nfor q in [\"warranty kitni hai?\", \"payment kab tak?\", \"cricket score?\"]:\n    print(q, \"->\", answer(q))\n",
     "hint": "score = len(words(q) & words(c)). best = max(chunks, key=...). Pehle check karo best ka score > 0.",
     "solution": "STOP = {\"kitni\", \"hai\", \"kab\", \"tak\", \"is\", \"of\", \"from\"}\nchunks = [\n    \"Warranty is 12 months from dispatch.\",\n    \"Payment within 30 days of invoice.\",\n    \"Delivery in 5 days.\",\n]\n\ndef words(t):\n    t = t.lower().replace(\".\", \"\").replace(\"?\", \"\")\n    return set(t.split()) - STOP\n\ndef answer(q):\n    qw = words(q)\n    best = max(chunks, key=lambda c: len(qw & words(c)))\n    if len(qw & words(best)) == 0:\n        return \"Nahi mila\"\n    return best\n\nfor q in [\"warranty kitni hai?\", \"payment kab tak?\", \"cricket score?\"]:\n    print(q, \"->\", answer(q))"},
]

quiz = [
    {"q": "LLM asal mein kya karta hai?", "o": ["Internet pe live search", "Agla token predict karta hai", "Database query chalata hai", "Sach check karke jawab deta hai"], "a": 1, "why": "LLM training ke patterns se sabse likely agla token chunta hai; isliye hallucination ho sakta hai."},
    {"q": "Tender PDF se cable size JSON mein nikaalna hai. Temperature kitna rakhoge?", "o": ["0", "0.9", "1.5", "2"], "a": 0, "why": "Extraction mein har baar same, consistent jawab chahiye, isliye temperature 0."},
    {"q": "Claude ko doosre API call mein pichli baat kaise yaad rahegi?", "o": ["Model khud yaad rakhta hai", "temperature badhao", "Poori history messages list mein dobara bhejo", "max_tokens badhao"], "a": 2, "why": "Model stateless hai; har call mein purane user/assistant messages bhejne padte hain."},
    {"q": "Anthropic Claude API mein system prompt kahan jaata hai?", "o": ["Alag `system=` parameter mein", "messages list ke andar role system", "Headers mein", "max_tokens mein"], "a": 0, "why": "Claude mein system ek alag parameter hai; OpenAI mein woh messages ke andar jaata hai."},
    {"q": "API key rakhne ka sahi tareeka?", "o": ["Code mein string", "GitHub README mein", "Frontend JavaScript mein", "Environment variable / .env (gitignore mein)"], "a": 3, "why": "Key code ya repo mein ho to leak ho jaati hai; env variable se padho."},
    {"q": "Prompt mein pehle 2-3 input→output examples dena kya kehlata hai?", "o": ["Zero-shot", "Fine-tuning", "Few-shot", "Streaming"], "a": 2, "why": "Few-shot prompting examples se model ko format/pattern dikhata hai."},
    {"q": "LangChain mein `prompt | llm | StrOutputParser()` ka `|` kya karta hai?", "o": ["Ek ka output agle ka input banata hai", "OR condition", "Parallel run", "Error handle karta hai"], "a": 0, "why": "LCEL pipe steps ko jodta hai: prompt bhara, LLM ko gaya, parser ne text nikaala."},
    {"q": "Cosine similarity 1 ka matlab?", "o": ["Bilkul ulta matlab", "Koi rishta nahi", "Vector khaali hai", "Same direction, lagbhag same matlab"], "a": 3, "why": "1 = same direction, 0 = unrelated, -1 = opposite."},
    {"q": "RAG ke steps ka sahi order?", "o": ["Embed → Load → Store → Split → Generate → Retrieve", "Load → Split → Embed → Store → Retrieve → Generate", "Retrieve → Load → Embed → Generate", "Split → Generate → Load → Store"], "a": 1, "why": "Indexing: Load, Split, Embed, Store. Query: Retrieve, Generate."},
    {"q": "Chunks mein overlap kyun rakhte hain?", "o": ["Tokens bachane ke liye", "Embedding fast karne ke liye", "Boundary pe kati baat dono chunks mein poori rahe", "Vector DB ki requirement hai"], "a": 2, "why": "Jo sentence do chunks ke beech kat jaata, overlap se woh kam se kam ek chunk mein poora rehta hai."},
]

iq = [
    {"q": "LLM kya hai? Simple shabdon mein samjhao.", "a": "LLM ek bada transformer model hai jo huge text pe train hua hai aur agla token predict karta hai. Isi se woh likhna, summarize, code aur sawal-jawab kar leta hai. Kyunki woh probability se likely word chunta hai, sach check nahi karta, isliye kabhi confidently galat bhi bolta hai (hallucination)."},
    {"q": "Token aur context window kya hain, aur kyun matter karte hain?", "a": "Token text ka chhota tukda hai (English mein ~¾ word). Context window woh max tokens hai jo model ek call mein padh sakta hai — prompt, history, documents aur jawab sab milake. Cost aur limit dono tokens mein hote hain, isliye history trim, chhote prompts aur RAG use karte hain."},
    {"q": "Temperature kya hai? Kab 0 aur kab zyada?", "a": "Temperature output ki randomness control karta hai. 0 pe model hamesha top token chunta hai, jawab consistent — extraction, classification, JSON ke liye. 0.7-1 pe creative writing ya brainstorming. Production data tasks mein main 0 rakhta hoon."},
    {"q": "System, user aur assistant messages mein farak? Model ko memory hai kya?", "a": "System = role aur rules, user = insaan ka input, assistant = model ke pichle jawab. Model stateless hai, isliye multi-turn chat ke liye poori history har call mein bhejte hain. History lambi ho to purane messages trim ya summarize karte hain taaki cost aur context limit control mein rahe."},
    {"q": "Production mein LLM API call ko reliable kaise banaoge?", "a": "API key env variable mein, har call pe timeout, 429/5xx pe exponential backoff ke saath retry, aur ek provider fail ho to fallback model. max_tokens se cost limit, token usage aur latency log karta hoon, aur lambe jawab ke liye streaming taaki user ko turant kuch dikhe."},
    {"q": "Prompt engineering ki main techniques batao.", "a": "Clear role, specific task, rules (\"sirf diye text se, nahi mila to bolo\"), fixed output format jaise JSON, data ke around delimiters, few-shot examples, aur complex reasoning ke liye step-by-step (chain-of-thought). Prompts ko bhi code ki tarah test set pe test karta hoon."},
    {"q": "Hallucination kya hai aur kaise kam karoge?", "a": "Model ka confidently galat ya banaya jawab. Kam karne ke liye: RAG se grounding, \"nahi pata to bolo\" rule, temperature 0, score gate, structured output + validation, choices ko fixed list tak limit, sources dikhana, aur important decisions pe human review. Paise ka hisaab hamesha code se, LLM se nahi."},
    {"q": "LLM se reliable JSON kaise loge?", "a": "Prompt mein exact keys aur \"missing ho to null\" likho, API ka JSON mode / structured output use karo, temperature 0 rakho. Phir `json.loads` aur Pydantic se validate karo; fail ho to retry ya human review, seedha database mein kabhi nahi.\n`data = Model.model_validate_json(reply)`"},
    {"q": "Embedding aur cosine similarity kya hai?", "a": "Embedding text ka dense vector hai jisme matlab encode hota hai, isliye milte-julte matlab wale texts paas hote hain chahe words alag hon. Cosine similarity do vectors ke angle ka cosine hai: dot(a,b)/(|a||b|), 1 = same direction, 0 = unrelated. Semantic search isi se hota hai."},
    {"q": "Vector database kya hai? FAISS, Chroma, pgvector mein kab kya?", "a": "Vector DB embeddings store karke nearest neighbours ANN index (jaise HNSW) se tez dhoondhta hai, metadata filter ke saath. FAISS = local library, prototype aur speed. Chroma = simple Python DB, chhote production apps. pgvector = agar Postgres pehle se hai to alag DB nahi chahiye. Bade managed scale ke liye Pinecone/Qdrant."},
    {"q": "RAG pipeline end-to-end samjhao. Chunking aur overlap kyun?", "a": "Indexing: Load (PDF/Excel se text), Split (chunks), Embed, Store (vector DB + metadata). Query: sawal embed karke top-k chunks Retrieve, phir \"sirf is context se jawab do\" prompt ke saath Generate. Chunking se search precise hoti hai aur context window mein fit hota hai; overlap se boundary pe kati baat poori rehti hai. Typical 300-800 tokens, 10-20% overlap."},
    {"q": "RAG system ko evaluate kaise karoge?", "a": "Asli sawal aur expected answers ka fixed test set, out-of-scope sawal bhi. Retrieval alag check (hit rate / recall@k, context precision) aur answer alag (faithfulness, correctness, relevance) — RAGAS ya LLM-as-judge se. Har change ke baad set dobara chalata hoon, aur production mein user feedback aur \"not found\" rate monitor karke fails ko test set mein jodta hoon."},
]

S = {"n": 12, "id": "aiml-12", "title": "LLMs, Prompting, LangChain & RAG",
     "goal": "LLM kaise kaam karta hai samajh ke OpenAI/Claude API se app banaoge, achhe prompts aur JSON output loge, LangChain chains likhoge, aur apne documents pe RAG chatbot (embeddings + vector DB) bana ke evaluate kar paoge.",
     "lessons": [L1, L2, L3, L4, L5, L6], "teach": teach, "practice": practice, "quiz": quiz, "iq": iq}

for p in S["practice"]:
    got = run(p["solution"])
    exp = p["q"].split("Expected:\n", 1)[1]
    if got != exp:
        raise SystemExit(f"PRACTICE MISMATCH\n{got!r}\n{exp!r}")
    p["expect"] = got

out = sys.argv[1] if len(sys.argv) > 1 else "/home/claude/codeguru/content/aiml/hinglish/stage-12.json"
json.dump(S, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("written", out)
