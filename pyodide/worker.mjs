var y=`"""nc_test: the Neural Clash test harness. Runs unchanged in Pyodide and native python3.

Tests are plain functions named \`\`test_*\`\` that raise on failure. Helpers:
\`\`assert_close\`\`, \`\`grad_check\`\` (central finite differences), \`\`python_lines\`\` (counts executed
Python lines, to prove a function is vectorised) and \`\`guard_arrays\`\`
(refuse huge allocations so a typo cannot freeze the tab).
"""
import sys
import traceback

import numpy as np


class GradCheckError(AssertionError):
    pass


def assert_close(actual, expected, rtol=1e-6, atol=1e-8, msg=""):
    a, e = np.asarray(actual, dtype=float), np.asarray(expected, dtype=float)
    if a.shape != e.shape:
        raise AssertionError(f"{msg} shape mismatch: got {a.shape}, expected {e.shape}")
    if not np.allclose(a, e, rtol=rtol, atol=atol, equal_nan=False):
        worst = float(np.max(np.abs(a - e)))
        raise AssertionError(f"{msg} values differ (max abs error {worst:.3g}); got {a.tolist()}, expected {e.tolist()}")


def numeric_grad(f, x, eps=1e-5):
    """Central-difference gradient of the scalar function f at x (x is not modified)."""
    x = np.array(x, dtype=float)
    g = np.zeros_like(x)
    it = np.nditer(x, flags=["multi_index"], op_flags=["readwrite"])
    for _ in it:
        i = it.multi_index
        old = x[i]
        x[i] = old + eps
        hi = f(x)
        x[i] = old - eps
        lo = f(x)
        x[i] = old
        g[i] = (hi - lo) / (2 * eps)
    return g


def grad_check(f, x, analytic, eps=1e-5, tol=1e-6):
    """Compare an analytic gradient with central differences.

    Uses the relative error ||a-n|| / max(||a|| + ||n||, 1e-12), the standard check;
    returns the error and raises GradCheckError when it exceeds \`\`tol\`\`.
    """
    analytic = np.asarray(analytic, dtype=float)
    num = numeric_grad(f, x, eps)
    if analytic.shape != num.shape:
        raise GradCheckError(f"gradient shape {analytic.shape} does not match input shape {num.shape}")
    denom = max(np.linalg.norm(analytic) + np.linalg.norm(num), 1e-12)
    err = float(np.linalg.norm(analytic - num) / denom)
    if not err <= tol:
        raise GradCheckError(f"gradient check failed: relative error {err:.3g} > {tol:g}")
    return err


def python_lines(fn, *args, **kwargs):
    """Run \`\`fn\`\` and count the Python lines executed in the file that defines it.

    A vectorised function runs a handful of lines whatever the input size; an
    element loop runs at least one per element. Returns (result, line_count).
    Works unchanged in Pyodide and native python3 (uses \`\`sys.settrace\`\`).
    """
    filename = fn.__code__.co_filename
    count = [0]

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != filename:
            return None
        if event == "line":
            count[0] += 1
        return tracer

    previous = sys.gettrace()
    sys.settrace(tracer)
    try:
        result = fn(*args, **kwargs)
    finally:
        sys.settrace(previous)
    return result, count[0]


_limit = [5_000_000]


def guard_arrays(max_elements=5_000_000):
    """Wrap the numpy allocators so a request above max_elements raises MemoryError.

    Safe to call repeatedly; later calls only change the limit.
    """
    _limit[0] = max_elements

    def wrap(fn, size_of):
        def guarded(*a, **k):
            n = size_of(*a, **k)
            if n > _limit[0]:
                raise MemoryError(f"array of {n} elements exceeds the {_limit[0]} limit")
            return fn(*a, **k)
        guarded.__wrapped__ = fn
        return guarded

    def shape_size(shape, *_a, **_k):
        return int(np.prod(shape if isinstance(shape, (tuple, list)) else (shape,), dtype=np.int64))

    for name in ("zeros", "ones", "empty", "full"):
        fn = getattr(np, name)
        if not hasattr(fn, "__wrapped__"):
            setattr(np, name, wrap(fn, shape_size))
    if not hasattr(np.arange, "__wrapped__"):
        np.arange = wrap(np.arange, lambda *a, **k: int(abs((a[1] - a[0]) / (a[2] if len(a) > 2 else 1))) if len(a) > 1 else int(a[0]))


def run_tests(namespace):
    """Run every \`\`test_*\`\` callable in \`\`namespace\`\`; returns a list of result dicts."""
    results = []
    for name, fn in list(namespace.items()):
        if not (name.startswith("test_") and callable(fn)):
            continue
        try:
            fn()
            results.append({"name": name, "ok": True, "message": ""})
        except Exception as exc:  # noqa: BLE001 - report every failure kind to the player
            tb = traceback.extract_tb(exc.__traceback__)
            line = tb[-1].lineno if tb else None
            results.append({"name": name, "ok": False, "message": f"{type(exc).__name__}: {exc}", "line": line})
    return results
`;var m="/home/pyodide/pkgs",d="/home/pyodide/site",_=`
import json, sys, traceback, importlib
def __nc_run(payload):
    import nc_test
    req = json.loads(payload)
    for m in [m for m in list(sys.modules) if m.split(".")[0] in __nc_mounted]:
        del sys.modules[m]
    importlib.invalidate_caches()
    if req["max"]:
        nc_test.guard_arrays(req["max"])
    ns = {"__name__": "__main__"}
    out = {"error": None, "errorLine": None, "tests": []}
    def fail(exc):
        out["error"] = f"{type(exc).__name__}: {exc}"
        tb = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename == "<player>"]
        out["errorLine"] = tb[-1].lineno if tb else None
    try:
        exec(compile(req["code"], "<player>", "exec"), ns)
        if req["tests"]:
            tns = dict(ns)
            exec(compile(req["tests"], "<tests>", "exec"), tns)
            out["tests"] = nc_test.run_tests(tns)
    except BaseException as exc:
        fail(exc)
    return json.dumps(out)
__nc_mounted = set()
`,c=class{constructor(e){this.py=e;this.ready=!1;this.mounted=new Set}async init(e=()=>{}){this.ready||(e("numpy"),await this.py.loadPackage("numpy"),e("harness"),this.py.FS.mkdirTree(d),this.py.FS.writeFile(`${d}/nc_test.py`,y),this.py.runPython(`import sys
if "${d}" not in sys.path: sys.path.insert(0, "${d}")
${_}`),this.py.runPython("import numpy, nc_test"),this.ready=!0,e("ready"))}mountPackage(e,n){let r=`${m}/${e}`;this.py.FS.mkdirTree(r);for(let[s,u]of Object.entries(n)){if(s.includes("..")||s.startsWith("/"))throw new Error(`bad path ${s}`);let a=`${r}/${s}`;this.py.FS.mkdirTree(a.slice(0,a.lastIndexOf("/"))),this.py.FS.writeFile(a,u)}this.py.runPython(`import sys
if "${m}" not in sys.path: sys.path.insert(0, "${m}")
__nc_mounted.add(${JSON.stringify(e)})`),this.mounted.add(e)}async run(e){if(!this.ready)throw new Error("PyCore.init() has not completed");let n=[],r=[];this.py.setStdout({batched:o=>n.push(o)}),this.py.setStderr({batched:o=>r.push(o)});let s=Date.now(),u=JSON.stringify({code:e.code,tests:e.tests??"",max:e.maxElements??5e6}),a=this.py.runPython(`__nc_run(${JSON.stringify(u)})`),i=JSON.parse(a);return{ok:i.error===null&&i.tests.every(o=>o.ok),stdout:n.join(`
`),stderr:r.join(`
`),error:i.error??void 0,errorLine:i.errorLine??void 0,tests:i.tests,ms:Date.now()-s}}};var l=t=>self.postMessage(t),p=null,f=Date.now();async function h(t){l({type:"stage",stage:"runtime",ms:Date.now()-f});let n=await(await import(`${t}pyodide.mjs`)).loadPyodide({indexURL:t});p=new c(n),await p.init(r=>l({type:"stage",stage:r,ms:Date.now()-f})),l({type:"ready",ms:Date.now()-f})}self.onmessage=async t=>{let e=t.data;try{e.type==="init"?await h(e.indexURL):e.type==="mount"?p.mountPackage(e.name,e.files):e.type==="run"&&l({type:"done",id:e.id,result:await p.run(e.opts)})}catch(n){l({type:"failed",id:"id"in e?e.id:void 0,message:n instanceof Error?n.message:String(n)})}};
