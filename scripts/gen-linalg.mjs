// Generates content/decks/linalg.json and content/lessons/linalg.json (Vector Vale, CUR F2). Every predict answer, shape
// answer, derive answer and lesson output is computed by running numpy natively, never typed by hand.
// `--check` fails if the committed JSON is stale (used by tests/linalg.test.ts).
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const DECK_OUT = new URL("../content/decks/linalg.json", import.meta.url);
const LESSON_OUT = new URL("../content/lessons/linalg.json", import.meta.url);
const py = (src) => execFileSync("python3", ["-I", "-c", src], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 20000 }).trim();
const NP = "import numpy as np";

/** [id, topic, prompt, code lines, three wrong outputs, explanation] */
const PREDICT = [
  ["la-norm", "la-vectors", "What does this print?", ["print(np.linalg.norm(np.array([3.0, 4.0])))"], ["7.0", "25.0", "12.0"], "The Euclidean (L2) norm is the square root of the sum of squares: sqrt(9 + 16) = 5. It is the length of the vector, not the sum of its entries (that would be the L1 norm, 7) and not the squared length (25)."],
  ["la-dot", "la-vectors", "What does this print?", ["print(np.dot([1, 2, 3], [4, -5, 6]))"], ["[  4 -10  18]", "32", "0"], "The dot product multiplies matching entries and **sums** them: 4 - 10 + 18 = 12. The list of products is the element-wise product `*`, which is not the dot product."],
  ["la-cos-orthogonal", "la-vectors", "What does this print?", ["u = np.array([1.0, 2.0])", "v = np.array([-2.0, 1.0])", "print(u @ v / (np.linalg.norm(u) * np.linalg.norm(v)))"], ["1.0", "-1.0", "0.5"], "u · v = -2 + 2 = 0, so the cosine similarity is 0: the vectors are orthogonal. Cosine measures the angle only, so 0 means 'unrelated direction', not 'opposite'."],
  ["la-cos-scale", "la-vectors", "What does this print?", ["u = np.array([1.0, 2.0])", "v = np.array([2.0, 4.0])", "print(round(float(u @ v / (np.linalg.norm(u) * np.linalg.norm(v))), 6))"], ["2.0", "0.5", "0.0"], "v is just 2u, so the directions are identical and the cosine is 1 however long v is. That scale invariance is why cosine similarity compares embeddings by direction, while a raw dot product also rewards length."],
  ["la-noncommute", "la-matmul", "What does this print?", ["A = np.array([[0, 1], [0, 0]])", "B = np.array([[0, 0], [1, 0]])", "print((A @ B).tolist(), (B @ A).tolist())"], ["[[0, 0], [0, 0]] [[0, 0], [0, 0]]", "[[1, 0], [0, 0]] [[1, 0], [0, 0]]", "[[0, 1], [1, 0]] [[0, 1], [1, 0]]"], "Matrix multiplication is **not commutative**: AB and BA differ here. It is associative, so (AB)C = A(BC), which is what lets a network be evaluated layer by layer."],
  ["la-rotate", "la-matmul", "What does this print?", ["R = np.array([[0, -1], [1, 0]])", "print((R @ np.array([1, 0])).tolist())"], ["[0, -1]", "[1, 0]", "[-1, 0]"], "The columns of R are where the basis vectors land: (1, 0) goes to the first column (0, 1). R is a 90 degree anticlockwise rotation, a matrix as a linear map."],
  ["la-transpose-product", "la-matmul", "What does this print?", ["A = np.arange(6).reshape(2, 3)", "B = np.arange(6).reshape(3, 2)", "print(((A @ B).T == B.T @ A.T).all())"], ["False", "ValueError", "[[True, True], [True, True]]"], "(AB)^T = B^T A^T: the transpose reverses the order. `.all()` collapses the 2x2 boolean grid to a single bool."],
  ["la-elementwise-vs-dot", "la-matmul", "What does this print?", ["a = np.array([1, 2])", "b = np.array([3, 4])", "print((a * b).tolist(), a @ b)"], ["11 [3, 8]", "[3, 8] [3, 8]", "11 11"], "`*` is element-wise and keeps the shape: [3, 8]. `@` on two vectors is the dot product: 3 + 8 = 11. Mixing them up is the most common first bug when writing a layer by hand."],
  ["la-det-diag", "la-inverse", "What does this print?", ["print(round(np.linalg.det(np.diag([2.0, 3.0])), 3))"], ["5.0", "1.0", "0.0"], "The determinant of a diagonal matrix is the product of the diagonal, 2 x 3 = 6: the factor by which the map scales area. A determinant of 0 would mean the map squashes space flat and has no inverse."],
  ["la-inv-diag", "la-inverse", "What does this print?", ["print(np.linalg.inv(np.diag([2.0, 4.0])).tolist())"], ["[[2.0, 0.0], [0.0, 4.0]]", "[[-2.0, 0.0], [0.0, -4.0]]", "[[0.5, 0.0], [0.0, 0.5]]"], "Inverting a diagonal matrix inverts each diagonal entry: 1/2 and 1/4. Undo 'stretch x by 2 and y by 4' by stretching by 1/2 and 1/4."],
  ["la-rank-dependent", "la-inverse", "What does this print?", ["print(np.linalg.matrix_rank(np.array([[1, 2], [2, 4]])))"], ["2", "0", "4"], "Row 2 is twice row 1, so the rows span only a line: rank 1. A rank-deficient square matrix is singular (determinant 0) and cannot be inverted."],
  ["la-rank-3x3", "la-inverse", "What does this print?", ["print(np.linalg.matrix_rank(np.arange(1, 10).reshape(3, 3)))"], ["3", "1", "0"], "The rows 1..3, 4..6, 7..9 satisfy row3 = 2 x row2 - row1, so they are dependent and span only a plane: rank 2. A 3x3 grid of 'random-looking' numbers is not automatically rank 3."],
  ["la-rank-outer", "la-inverse", "What does this print?", ["print(np.linalg.matrix_rank(np.outer([1, 2, 3], [4, 5])))"], ["2", "3", "6"], "An outer product u v^T has every row proportional to v, so its rank is 1. Low-rank matrices are sums of a few outer products, which is exactly what the SVD finds."],
  ["la-project", "la-orthogonality", "What does this print?", ["v = np.array([3.0, 4.0])", "u = np.array([2.0, 0.0])", "print(((v @ u) / (u @ u) * u).tolist())"], ["[6.0, 0.0]", "[3.0, 4.0]", "[0.0, 4.0]"], "The projection of v onto the line through u is (v . u / u . u) u = (6/4) u = (3, 0). Only the part of v along u survives; the residual (0, 4) is orthogonal to u."],
  ["la-svd-values", "la-svd", "What does this print?", ["s = np.linalg.svd(np.diag([3.0, -2.0]))[1]", "print(s.tolist())"], ["[3.0, -2.0]", "[2.0, 3.0]", "[1.0, 1.0]"], "Singular values are never negative and come back sorted largest first. The sign of -2 is absorbed into the singular vectors; the stretch factor is 2."],
  ["la-eig-sym", "la-svd", "What does this print?", ["A = np.array([[2.0, 1.0], [1.0, 2.0]])", "print(np.round(np.linalg.eigvalsh(A), 6).tolist())"], ["[2.0, 2.0]", "[3.0, 1.0]", "[0.0, 4.0]"], "For a symmetric matrix, `eigvalsh` returns real eigenvalues in ascending order: 1 (direction (1,-1)) and 3 (direction (1,1)). The trace 4 and the determinant 3 both check out."],
  ["la-trace", "la-svd", "What does this print?", ["print(np.trace(2 * np.eye(3)))"], ["2.0", "8.0", "3.0"], "The trace is the sum of the diagonal: 2 + 2 + 2 = 6. It also equals the sum of the eigenvalues, a useful sanity check on any decomposition."],
];

/** [id, topic, setup lines, expression] -> shape answer computed by numpy. */
const SHAPES = [
  ["la-shape-layer", "la-matmul", ["X = np.zeros((100, 5))", "W = np.zeros((5, 3))"], "X @ W"],
  ["la-shape-gram", "la-matmul", ["X = np.zeros((6, 2))"], "X @ X.T"],
  ["la-shape-cov", "la-svd", ["Xc = np.zeros((50, 4))"], "Xc.T @ Xc"],
  ["la-shape-outer", "la-matmul", ["u = np.zeros(3)", "v = np.zeros(5)"], "np.outer(u, v)"],
  ["la-shape-batch", "la-matmul", ["X = np.zeros((8, 10, 4))", "W = np.zeros((4, 6))"], "X @ W"],
  ["la-shape-svd-u", "la-svd", ["A = np.zeros((8, 3))"], "np.linalg.svd(A, full_matrices=False)[0]"],
  ["la-shape-svd-vt", "la-svd", ["A = np.zeros((8, 3))"], "np.linalg.svd(A, full_matrices=False)[2]"],
  ["la-shape-matmul-fail", "la-matmul", ["A = np.zeros((4, 3))", "B = np.zeros((4, 3))"], "A @ B"],
  ["la-shape-matvec-fail", "la-matmul", ["A = np.zeros((3, 4))", "x = np.zeros(3)"], "A @ x"],
];

/** [id, topic, prompt, setup lines, field labels, python expressions (list of floats), tol] -> answers computed by numpy. */
const DERIVE = [
  ["la-derive-cos", "la-vectors", "For u = (1, 2, 2) and v = (2, 0, 1), enter the three values (3 decimals is fine).", ["u = np.array([1.0, 2.0, 2.0])", "v = np.array([2.0, 0.0, 1.0])"], ["u · v", "‖u‖", "cos θ"], "[u @ v, np.linalg.norm(u), u @ v / (np.linalg.norm(u) * np.linalg.norm(v))]", 0.01, "u · v = 2 + 0 + 2 = 4, ‖u‖ = sqrt(1 + 4 + 4) = 3, ‖v‖ = sqrt(5), so cos θ = 4 / (3 sqrt 5) is about 0.596. An angle of about 53 degrees: same general direction, far from identical."],
  ["la-derive-proj", "la-orthogonality", "Project v = (3, 4) onto the line through u = (1, 1). Enter the coefficient c in the projection c·u and the length of the leftover residual v − c·u.", ["v = np.array([3.0, 4.0])", "u = np.array([1.0, 1.0])"], ["c", "‖v − c·u‖"], "[(v @ u) / (u @ u), np.linalg.norm(v - (v @ u) / (u @ u) * u)]", 0.01, "c = (v . u) / (u . u) = 7/2. The residual (-0.5, 0.5) is orthogonal to u and has length about 0.707. The projection is the closest point on the line to v, and the residual is the distance."],
  ["la-derive-eig", "la-svd", "Find the eigenvalues of the symmetric matrix [[4, 1], [1, 4]]. Enter the smaller first.", ["A = np.array([[4.0, 1.0], [1.0, 4.0]])"], ["λ small", "λ large"], "list(np.linalg.eigvalsh(A))", 0.01, "Eigenvectors (1, -1) and (1, 1) give 4 - 1 = 3 and 4 + 1 = 5. Check: trace 8 = 3 + 5 and determinant 15 = 3 x 5."],
  ["la-derive-lowrank", "la-svd", "For A = [[3, 0], [0, -4]], enter its two singular values (largest first) and the Frobenius error ‖A − A₁‖ of the best rank-1 approximation A₁.", ["A = np.array([[3.0, 0.0], [0.0, -4.0]])", "s = np.linalg.svd(A)[1]"], ["σ1", "σ2", "‖A − A₁‖"], "[s[0], s[1], np.sqrt(np.sum(s[1:] ** 2))]", 0.01, "The singular values are 4 and 3. By Eckart-Young the best rank-1 approximation keeps σ1, and its Frobenius error is the root-sum-of-squares of the discarded values: here just 3."],
  ["la-derive-pca", "la-svd", "Four centred points (2,1), (-2,-1), (1,2), (-1,-2). Using the sample covariance (divide by n − 1), enter the two covariance eigenvalues (larger first) and the fraction of variance on the first principal component.", ["X = np.array([[2.0, 1.0], [-2.0, -1.0], [1.0, 2.0], [-1.0, -2.0]])", "ev = np.sort(np.linalg.eigvalsh(X.T @ X / 3))[::-1]"], ["λ1", "λ2", "PC1 share"], "[ev[0], ev[1], ev[0] / ev.sum()]", 0.01, "The covariance is [[10/3, 8/3], [8/3, 10/3]] with eigenvalues 6 and 2/3. PC1 captures 6 / (6 + 2/3) = 90.0% of the variance, which is why the points lie close to the line y = x."],
];

const CONCEPT = [
  ["la-dot-geometry", "la-vectors", "mcq", "Two non-zero vectors have a dot product of exactly 0. What does that tell you?", ["They are orthogonal: they meet at 90 degrees", "They are identical", "They have the same length", "One is a scaled copy of the other"], "u . v = ‖u‖‖v‖cos θ, so a zero dot product with non-zero vectors forces cos θ = 0, i.e. θ = 90 degrees. Orthogonal does not mean uncorrelated in general, but for centred data it does."],
  ["la-cosine-vs-dot", "la-vectors", "mcq", "You rank documents against a query using embeddings. Why is cosine similarity often preferred over the raw dot product?", ["It ignores vector length, so a long document is not favoured just for having a large norm", "It is always faster to compute", "It works only on integer vectors", "It makes every similarity positive"], "The dot product equals ‖u‖‖v‖cos θ, so a large norm inflates it. Cosine divides the norms out. If the vectors are already normalised to length 1, the two are identical, which is why many vector stores normalise once at insert time."],
  ["la-avoid-inverse", "la-inverse", "mcq", "To solve A x = b for x, why do practitioners prefer `np.linalg.solve(A, b)` to `np.linalg.inv(A) @ b`?", ["Solving directly is faster and more numerically accurate than forming the inverse explicitly", "The inverse does not exist for square matrices", "`solve` returns a matrix and `inv` returns a vector", "`inv` can only handle 2x2 matrices"], "A factorisation (LU) solves the system in about one third the work of forming the inverse, and avoids amplifying rounding error through an explicit inverse. For ill-conditioned A neither is magic: check the condition number."],
  ["la-svd-pca", "la-svd", "mcq", "You run PCA on a data matrix X (rows are samples) through the SVD. What must you do to X first?", ["Subtract each column's mean so the data is centred", "Normalise each row to unit length", "Take the logarithm of every entry", "Sort the rows"], "PCA finds directions of maximum variance about the mean. Without centring, the first singular vector mostly points at the data's mean offset rather than at its spread. Scaling features is a separate choice that depends on their units."],
  ["la-psd", "la-svd", "mcq", "Why is every covariance matrix positive semi-definite?", ["Because v^T C v is the variance of the data projected onto v, and a variance cannot be negative", "Because all its entries are positive", "Because it is always diagonal", "Because it has full rank"], "v^T C v = (1/(n-1)) sum of (x_i . v)^2 for centred data: a sum of squares, so never below 0. Equivalently, all eigenvalues are at least 0. This is the property that makes the quadratic bowl of least squares convex."],
  ["la-jacobian", "la-svd", "mcq", "A layer maps R^4 to R^3 via f(x). What is the shape of its Jacobian, and what does it do?", ["3 x 4; it is the matrix that best linearly approximates how small input changes move the outputs", "4 x 3; it lists the weights", "3 x 3; it contains the output gradients", "4 x 4; it is the Hessian"], "Entry (i, j) is d f_i / d x_j, so there is one row per output and one column per input. Backprop multiplies Jacobians along the chain, usually without ever forming them (vector-Jacobian products)."],
];
const MULTI = [
  ["la-invertible", "la-inverse", "A square matrix A is invertible. Which statements must also be true? Pick all that apply.", ["Its determinant is not 0", "Its columns are linearly independent", "Its rank equals its size", "All its entries are non-zero", "It is symmetric"], [0, 1, 2], "Invertible, full rank, independent columns and non-zero determinant are four views of the same fact. Entries being non-zero or the matrix being symmetric are unrelated: the identity has zeros and an invertible rotation is not symmetric."],
  ["la-svd-facts", "la-svd", "Which statements about the SVD A = U S V^T are correct? Pick all that apply.", ["The singular values are non-negative", "It exists for every real matrix, square or not", "The number of non-zero singular values equals the rank", "It only exists for symmetric matrices", "U and V have orthonormal columns"], [0, 1, 2, 4], "The SVD always exists, with orthonormal U and V and non-negative singular values; the non-zero ones count the rank. Only the eigendecomposition into real eigenvalues needs symmetry."],
];
const BUGS = [
  { id: "la-bug-cosine", topic: "la-vectors", prompt: "`cosine(u, v)` should return 1.0 for any two vectors pointing in the same direction. Which line is wrong?", buggy: ["import numpy as np", "def cosine(u, v):", "    return u @ v / np.linalg.norm(u) * np.linalg.norm(v)"], fixed: ["import numpy as np", "def cosine(u, v):", "    return u @ v / (np.linalg.norm(u) * np.linalg.norm(v))"], probe: ["u = np.array([1.0, 2.0])", "cosine(u, 3 * u)"], explanation: "Operator precedence: `a / b * c` is `(a / b) * c`, so the second norm multiplies instead of dividing. Wrap the whole denominator in parentheses and test with a pair that must give exactly 1." },
  { id: "la-bug-center", topic: "la-svd", prompt: "`top_direction(X)` should return the first principal direction of the rows of X. It returns a poor answer when the data sits far from the origin. Which line is wrong?", buggy: ["import numpy as np", "def top_direction(X):", "    _, _, Vt = np.linalg.svd(X)", "    return Vt[0]"], fixed: ["import numpy as np", "def top_direction(X):", "    _, _, Vt = np.linalg.svd(X - X.mean(axis=0))", "    return Vt[0]"], probe: ["X = 10.0 + np.array([[1.0, 2.0], [-1.0, -2.0], [2.0, 4.0], [-2.0, -4.0]])", "np.round(np.abs(top_direction(X)), 3).tolist()"], explanation: "PCA works on centred data. Without subtracting the column means the SVD's top direction is dominated by the offset of the whole cloud from the origin, here (1, 1), not the line (1, 2) along which the points actually vary." },
];

function place(correct, wrong, slot) { const choices = [...wrong]; choices.splice(slot, 0, correct); return { choices, answer: slot }; }

function buildDeck() {
  const cards = [];
  PREDICT.forEach(([id, topic, prompt, code, wrong, explanation], i) => {
    const out = py(`${NP}\n${code.join("\n")}`);
    if (out.includes("\n")) throw new Error(`${id}: output must be one line, got ${JSON.stringify(out)}`);
    if (wrong.includes(out)) throw new Error(`${id}: a distractor equals the real output (${out})`);
    cards.push({ id, kind: "mcq", variant: "predict", topic, prompt, code, ...place(out, wrong, (i * 3 + 1) % 4), explanation });
  });
  SHAPES.forEach(([id, topic, setup, expr]) => {
    const res = py(`${NP}\nimport json\n${setup.join("\n")}\ntry:\n    print(json.dumps(list(eval(${JSON.stringify(expr)}).shape)))\nexcept ValueError:\n    print('null')`);
    const answer = JSON.parse(res);
    const prompt = `With ${setup.map((l) => `\`${l}\``).join(" and ")}, what is the shape of \`${expr}\`? Type "error" if it raises.`;
    const explanation = answer === null
      ? "A matrix product needs the inner sizes to match: (m, k) @ (k, n). Here they differ, so numpy raises. Writing the shapes as (m, k) @ (k, n) -> (m, n) before coding catches this instantly."
      : `Result shape (${answer.join(", ")}${answer.length === 1 ? "," : ""}). Inner sizes cancel, outer sizes remain: (m, k) @ (k, n) -> (m, n); extra leading axes are batch axes; a thin SVD returns U (m, r), S (r,), Vt (r, n) with r = min(m, n).`;
    cards.push({ id, kind: "shape", topic, prompt, answer, explanation });
  });
  for (const [id, topic, prompt, setup, fields, expr, tol, explanation] of DERIVE) {
    const answers = JSON.parse(py(`${NP}\nimport json\n${setup.join("\n")}\nprint(json.dumps([float(x) for x in ${expr}]))`)).map((x) => Math.round(x * 1e6) / 1e6);
    if (answers.length !== fields.length) throw new Error(`${id}: fields/answers mismatch`);
    cards.push({ id, kind: "derive", topic, prompt, fields, answers, tol, explanation });
  }
  CONCEPT.forEach(([id, topic, kind, prompt, choices, explanation], i) => {
    const [right, ...wrong] = choices;
    cards.push({ id, kind, topic, prompt, ...place(right, wrong, (i * 3 + 2) % 4), explanation });
  });
  for (const [id, topic, prompt, choices, answers, explanation] of MULTI) cards.push({ id, kind: "multi", topic, prompt, choices, answers, explanation });
  for (const b of BUGS) {
    const lines = b.buggy.length === b.fixed.length ? b.buggy.map((l, i) => (l === b.fixed[i] ? 0 : i + 1)).filter(Boolean) : [];
    if (lines.length !== 1) throw new Error(`${b.id}: buggy and fixed must differ on exactly one line`);
    const run = (code) => py(`${code.join("\n")}\n${b.probe.slice(0, -1).join("\n")}\nprint(${b.probe.at(-1)})`);
    if (run(b.buggy) === run(b.fixed)) throw new Error(`${b.id}: fix does not change behaviour`);
    cards.push({ id: b.id, kind: "bug", topic: b.topic, prompt: b.prompt, code: b.buggy, line: lines[0], explanation: b.explanation });
  }
  if (cards.length < 30) throw new Error(`expected 30+ cards, got ${cards.length}`);
  return { id: "linalg", title: "Vector Vale: linear algebra", cards };
}

/** id, title, topics, intro, sections [heading, text, code lines | null], takeaways, trap. Snippets start after `import numpy as np`. */
const LESSONS = [
  ["la-vectors-lesson", "Vectors, norms and cosine", ["la-vectors"],
    "A vector is an ordered list of numbers read as a point or an arrow. Everything in ML, from a feature row to a word embedding, is a vector, and the first question about two of them is how alike they are.",
    [
      ["Length and dot product", "The L2 norm is the arrow's length. The dot product sums products of matching entries, and equals length times length times the cosine of the angle between the arrows.", ["u = np.array([3.0, 4.0])", "v = np.array([4.0, -3.0])", "print(np.linalg.norm(u), u @ v)"]],
      ["Cosine similarity", "Divide the dot product by both lengths to keep the angle only. Doubling a vector changes its dot products but not its cosine, so cosine compares direction, which is usually what an embedding encodes.", ["u = np.array([1.0, 2.0])", "cos = lambda a, b: a @ b / (np.linalg.norm(a) * np.linalg.norm(b))", "print(round(cos(u, 5 * u), 6), round(cos(u, np.array([-2.0, 1.0])), 6))"]],
      ["Norms measure different things", "L1 adds absolute values, L2 is the straight-line length, L-infinity is the largest entry. Regularisers use them because their balls have different shapes: L1 corners favour exact zeros.", ["x = np.array([3.0, -4.0, 0.0])", "print(np.linalg.norm(x, 1), np.linalg.norm(x, 2), np.linalg.norm(x, np.inf))"]],
    ],
    ["The dot product is length x length x cos(angle); zero means orthogonal.", "Cosine removes length; normalise once and a dot product is a cosine.", "L1, L2 and L-infinity measure size differently, and the choice matters for regularisation."],
    "Using raw dot products to rank by similarity when vector norms vary: long vectors win regardless of direction."],
  ["la-matrices-lesson", "Matrices as linear maps, and their shapes", ["la-matmul"],
    "A matrix is a machine that turns vectors into vectors. Its columns say where the basis vectors land, and a matrix product is the machine you get by running one after another.",
    [
      ["Columns are destinations", "Multiplying R by (1, 0) picks out R's first column. So a rotation, a stretch or a shear can be read straight off the matrix.", ["R = np.array([[0, -1], [1, 0]])", "print((R @ np.array([1, 0])).tolist(), (R @ np.array([0, 1])).tolist())"]],
      ["Shapes are the type system", "(m, k) @ (k, n) gives (m, n). Write the shapes before the code. A neural-network layer is X @ W with X (batch, in) and W (in, out).", ["X = np.ones((100, 5))", "W = np.ones((5, 3))", "print((X @ W).shape, (X @ W).sum(axis=1)[:2])"]],
      ["Order matters", "Products are associative but not commutative, and the transpose of a product reverses the order. Backprop leans on exactly this: gradients flow through W^T.", ["A = np.array([[0, 1], [0, 0]])", "B = np.array([[0, 0], [1, 0]])", "print((A @ B).tolist(), (B @ A).tolist())"]],
    ],
    ["Columns of a matrix are the images of the basis vectors.", "Check (m, k) @ (k, n) -> (m, n) before running anything.", "AB is not BA; (AB)^T = B^T A^T."],
    "Swapping the operands of a matmul that happens to be shape-legal both ways: it runs, and gives the wrong thing."],
  ["la-inverse-lesson", "Inverses, rank and solving systems", ["la-inverse"],
    "Solving A x = b asks which input the map A sent to b. Whether there is exactly one answer depends on rank: how many independent directions A keeps.",
    [
      ["Rank counts independent directions", "If a row is a combination of others, the map flattens space and loses information. Rank less than the size means singular: no inverse, and either no solution or infinitely many.", ["A = np.array([[1, 2], [2, 4]])", "B = np.array([[1, 2], [3, 4]])", "print(np.linalg.matrix_rank(A), np.linalg.matrix_rank(B), round(np.linalg.det(B), 3))"]],
      ["Solve, do not invert", "Forming A^-1 and multiplying is slower and less accurate than a factorisation-based solve. You almost never need the inverse itself.", ["A = np.array([[3.0, 1.0], [1.0, 2.0]])", "b = np.array([9.0, 8.0])", "x = np.linalg.solve(A, b)", "print(x, np.allclose(A @ x, b))"]],
      ["Nearly singular is the real danger", "The condition number says how much input error is amplified. A huge value means a tiny wiggle in b swings x wildly, even though the matrix is technically invertible. Ridge regression adds λI to fix exactly this.", ["A = np.array([[1.0, 1.0], [1.0, 1.0000001]])", "print(f'{np.linalg.cond(A):.1e}')"]],
    ],
    ["Rank is the number of independent rows (or columns); full rank means invertible.", "Prefer `solve` to `inv`.", "Check the condition number before trusting a solution; regularise if it is huge."],
    "Calling `inv` on a nearly singular matrix and trusting the output: no error is raised, the numbers are just meaningless."],
  ["la-orthogonality-lesson", "Orthogonality and projections", ["la-orthogonality"],
    "Orthogonal directions do not interfere, which is why they make clean coordinates. Projection asks for the part of a vector that lies along a direction, and it is the geometry behind least squares.",
    [
      ["Projecting onto a line", "The component of v along u is (v . u / u . u) u. What is left over, the residual, is orthogonal to u.", ["v = np.array([3.0, 4.0])", "u = np.array([1.0, 1.0])", "p = (v @ u) / (u @ u) * u", "print(p, v - p, round((v - p) @ u, 12))"]],
      ["Least squares is a projection", "Fitting y with the columns of X finds the point of the column space closest to y. The error is orthogonal to every column, so X^T (y - X w) = 0: those are the normal equations.", ["X = np.array([[1.0, 0.0], [1.0, 1.0], [1.0, 2.0]])", "y = np.array([1.0, 2.0, 2.0])", "w = np.linalg.lstsq(X, y, rcond=None)[0]", "print(np.round(w, 4), np.round(X.T @ (y - X @ w), 10))"]],
      ["Orthonormal bases are free to invert", "If Q has orthonormal columns then Q^T Q = I, so Q^T is the inverse on its span. Rotations are the square case. Work in an orthonormal basis whenever you can.", ["c, s = np.cos(0.5), np.sin(0.5)", "Q = np.array([[c, -s], [s, c]])", "print(np.round(Q.T @ Q, 12).tolist())"]],
    ],
    ["Projection keeps the part along a direction; the residual is orthogonal.", "Least squares leaves a residual orthogonal to every feature column.", "Orthonormal columns: Q^T Q = I, no inverse needed."],
    "Forgetting that the projection formula needs the denominator u . u: it is only the plain dot product when u has length 1."],
  ["la-svd-lesson", "Eigenvectors, SVD and PCA", ["la-svd"],
    "Most matrices rotate and bend space. Eigenvectors are directions a symmetric matrix only stretches, and the SVD is the all-purpose version that works for any matrix. PCA, LSA and low-rank compression are all the SVD in different clothes.",
    [
      ["Eigenvectors and the covariance matrix", "A symmetric matrix has real eigenvalues and orthogonal eigenvectors. For a covariance matrix they are the principal axes and the variance along each. Because v^T C v is a variance, every eigenvalue is at least 0: the matrix is positive semi-definite.", ["C = np.array([[4.0, 1.0], [1.0, 4.0]])", "w, V = np.linalg.eigh(C)", "print(w, np.round(np.abs(V), 4).tolist())"]],
      ["SVD and low-rank approximation", "A = U S V^T with orthonormal U and V and non-negative S. Keeping only the top k singular values gives the best rank-k approximation (Eckart-Young); the error is the discarded values.", ["rng = np.random.default_rng(0)", "A = rng.normal(size=(6, 4))", "U, S, Vt = np.linalg.svd(A, full_matrices=False)", "A1 = S[0] * np.outer(U[:, 0], Vt[0])", "print(np.round(S, 3), round(float(np.linalg.norm(A - A1)), 6) == round(float(np.sqrt(np.sum(S[1:] ** 2))), 6))"]],
      ["PCA is SVD on centred data", "Subtract each column's mean, take the SVD, and the rows of Vt are the principal directions. The share of variance of component i is s_i^2 over the sum of all s^2.", ["X = np.array([[2.0, 1.0], [-2.0, -1.0], [1.0, 2.0], [-1.0, -2.0]])", "S = np.linalg.svd(X - X.mean(axis=0), compute_uv=False)", "print(np.round(S ** 2 / np.sum(S ** 2), 4))"]],
      ["Power iteration finds the top direction", "Multiply a random vector by A^T A over and over, normalising each time: it converges to the top right-singular vector. It needs only matrix-vector products, which is how huge sparse matrices are handled.", ["rng = np.random.default_rng(1)", "A = rng.normal(size=(30, 5)) * np.array([5.0, 2.0, 1.0, 1.0, 0.5])", "v = rng.normal(size=5)", "for _ in range(60):", "    v = A.T @ (A @ v)", "    v /= np.linalg.norm(v)", "top = np.linalg.svd(A)[2][0]", "print(round(abs(float(v @ top)), 6))"]],
    ],
    ["Covariance matrices are symmetric positive semi-definite: real eigenvalues, none negative.", "The top-k SVD is the best rank-k approximation; the error is the dropped singular values.", "PCA = centre, SVD, read variance shares from s^2.", "Power iteration gets the top direction with only matrix-vector products."],
    "Running PCA on uncentred data, or on features with wildly different units, and then reading the components as if they meant something."],
];

function buildLessons() {
  return {
    id: "linalg-lessons",
    title: "Vector Vale lessons",
    lessons: LESSONS.map(([id, title, topics, intro, sections, takeaways, trap]) => ({
      id, title, topics, intro, takeaways, trap,
      sections: sections.map(([heading, text, code]) => {
        const s = { heading, text };
        if (code) { s.code = code; s.output = py(`${NP}\n${code.join("\n")}`); }
        return s;
      }),
    })),
  };
}

const deckJson = JSON.stringify(buildDeck(), null, 2) + "\n";
const lessonJson = JSON.stringify(buildLessons(), null, 2) + "\n";
if (process.argv.includes("--check")) {
  for (const [url, json] of [[DECK_OUT, deckJson], [LESSON_OUT, lessonJson]]) {
    if (readFileSync(url, "utf8") !== json) { console.error(`${url.pathname} is stale: run node scripts/gen-linalg.mjs`); process.exit(1); }
  }
  console.log("linalg deck and lessons up to date (recomputed natively)");
} else {
  writeFileSync(DECK_OUT, deckJson);
  writeFileSync(LESSON_OUT, lessonJson);
  console.log("wrote linalg deck and lessons");
}
