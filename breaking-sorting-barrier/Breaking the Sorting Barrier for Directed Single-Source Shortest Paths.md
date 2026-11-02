# Breaking the Sorting Barrier for Directed Single-Source Shortest Paths 

Ran Duan<sup>∗</sup> Jiayi Mao<sup>∗</sup> Xiao Mao<sup>†</sup> Xinkai Shu<sup>‡</sup> Longhui Yin<sup>∗</sup> 

July 31, 2025 

##### **Abstract** 

We give a deterministic _O_ ( _m_ log<sup>2</sup><sup>_/_3</sup> _n_ )-time algorithm for single-source shortest paths (SSSP) on directed graphs with real non-negative edge weights in the comparison-addition model. This is the first result to break the _O_ ( _m_ + _n_ log _n_ ) time bound of Dijkstra’s algorithm on sparse graphs, showing that Dijkstra’s algorithm is not optimal for SSSP. 

## **1 Introduction** 

In an _m_ -edge _n_ -vertex directed graph _G_ = ( _V, E_ ) with a non-negative weight function _w_ : _E →_ R _≥_ 0, single-source shortest path (SSSP) considers the lengths of the shortest paths from a source vertex _s_ to all _v ∈ V_ . Designing faster algorithms for SSSP is one of the most fundamental problems in graph theory, with exciting improvements since the 50s. 

The textbook Dijkstra’s algorithm [Dij59], combined with advanced data structures such as the Fibonacci heap [FT87] or the relaxed heap [DGST88], solves SSSP in _O_ ( _m_ + _n_ log _n_ ) time. It works in the _comparisonaddition_ model, natural for real-number inputs, where only comparison and addition operations on edge weights are allowed, and each operation consumes unit time. For undirected graphs, Pettie and Ramachandran [PR05] proposed a hierarchy-based algorithm which runs in _O_ ( _mα_ ( _m, n_ )+min _{n_ log _n, n_ log log _r}_ ) time in the comparison-addition model, where _α_ is the inverse-Ackermann function and _r_ bounds the ratio between any two edge weights. 

Dijkstra’s algorithm also produces an ordering of vertices by distances from the source as a byproduct. A recent contribution by Haeupler, Hladík, Rozhoň, Tarjan and Tětek [HHR<sup>+</sup> 24] showed that Dijkstra’s algorithm is optimal if we require the algorithm to output the order of vertices by distances. If only the distances and not the ordering are required, a recent result by Duan, Mao, Shu and Yin [DMSY23] provided an _O_ ( _m_<sup>_√_</sup> log _n_ log log _n_ )-time randomized SSSP algorithm for undirected graphs, better than _O_ ( _n_ log _n_ ) in sparse graphs. However it remains to break such a sorting barrier in directed graphs. 

### **1.1 Our results** 

In this paper, we present the first SSSP algorithm for directed real-weighted graphs that breaks the sorting bottleneck on sparse graphs. 

**Theorem 1.1.** _There exists a deterministic algorithm that takes O_ ( _m_ log<sup>2</sup><sup>_/_3</sup> ( _n_ )) _time to solve the singlesource shortest path problem on directed graphs with real non-negative edge weights._ 

> ∗Tsinghua University. Email: duanran@mail.tsinghua.edu.cn, mjy22@mails.tsinghua.edu.cn, ylh21@mails.tsinghua.edu.cn. 

> †Stanford University. Email: matthew99a@gmail.com. 

> ‡Max Planck Institute for Informatics. Email: xshu@mpi-inf.mpg.de. 

1 

Note that the algorithm in [DMSY23] is randomized, thus our result is also the first deterministic algorithm to break such _O_ ( _m_ + _n_ log _n_ ) time bound even in undirected graphs. 

**Technical Overview.** Broadly speaking, there are two traditional algorithms for solving the single-source shortest path problem: 

- Dijkstra’s algorithm [Dij59]: via a priority queue, it each time extracts a vertex _u_ with the minimum distance from the source, and from _u_ relaxes its outgoing edges. It typically sorts vertices by their distances from the source, resulting in a time complexity of at least Θ( _n_ log _n_ ). 

- Bellman-Ford algorithm [Bel58]: based on dynamic programming, it relaxes all edges for several steps. For finding shortest paths with at most _k_ edges, the Bellman-Ford algorithm can achieve this in _O_ ( _mk_ ) time without requiring sorting. 

Our approach merges these two methods through a recursive partitioning technique, similar to those used in bottleneck path algorithms as described in [GT88, CKT<sup>+</sup> 16, DLWX18]. 

At any point during the execution of the Dijkstra’s algorithm, the priority queue (heap) maintains a “frontier” _S_ of vertices such that if a vertex _u_ is “incomplete” — if the current distance estimate _d_<sup>�</sup> [ _u_ ] is still greater than the true distance _d_ ( _u_ ) — the shortest _s_ - _u_ path must visit some complete vertex _v ∈ S_ . In this case, we say _u_ is “dependent” on _v ∈ S_ . (However, vertices in _S_ are not guaranteed to be all complete.) The Dijkstra’s algorithm simply picks the vertex in _S_ closest to source, which must be complete, and then relaxes all edges from that vertex. 

The running time bottleneck comes from the fact that sometimes the frontier may contain Θ( _n_ ) vertices. Since we constantly need to pick the vertex closest to source, we essentially need to maintain a total order between a large number of vertices, and are thus unable to break the Ω( _n_ log _n_ ) sorting barrier. Our most essential idea is a way to reduce the size of the frontier. Suppose we want to compute all distances that are less than some upper bound _B_ . Let _U_<sup>�</sup> be the set of vertices _u_ with _d_ ( _u_ ) _< B_ and the shortest _s_ - _u_ path visits a vertex in _S_ . It is possible to limit the size of our frontier _|S|_ to _|U_<sup>�</sup> _|/_ log<sup>Ω(1)</sup> ( _n_ ), or 1 _/_ log<sup>Ω(1)</sup> ( _n_ ) of the vertices of interest. Given a parameter _k_ = log<sup>Ω(1)</sup> ( _n_ ), there are two possible cases: 

- If _|U_<sup>�</sup> _| > k|S|_ , then our frontier already has size _|U_<sup>�</sup> _|/k_ ; 

- Otherwise, suppose _|U_<sup>�</sup> _| ≤ k|S|_ . By running Bellman-Ford step _k_ times from vertices in _S_ , every vertex _u ∈ U_<sup>�</sup> whose shortest _s_ - _u_ path containing _< k_ vertices in _U_<sup>�</sup> is complete. Otherwise the vertex _v ∈ S_ which _u_ is dependent on must have a shortest path tree rooted at it with _≥ k_ vertices in _U_<sup>�</sup> , so we can shrink the frontier _S_ to the set of “pivots”, each of which has a shortest path tree of size _≥ k_ , and the number of such pivots is bounded by _|U_<sup>�</sup> _|/k_ . 

Our algorithm is based on the idea above, but instead of using a Dijkstra-like method where the frontier is dynamic and thus intractable, we use a divide-and-conquer procedure that consists of log _n/t_ levels, each containing a set of frontier vertices and an upper bound _B_ , such that a naive implementation would still spend Θ( _t_ ) time per frontier vertex and the running time would remain Θ(log _n_ ) per vertex. We can however apply the aforementioned frontier reduction on each level so that the Θ( _t_ ) work only applies to the pivots, about 1 _/_ log<sup>Ω(1)</sup> ( _n_ ) of the frontier vertices. Thus the running time per vertex gets reduced to log _n/_ log<sup>Ω(1)</sup> ( _n_ ), which is a significant speedup. 

### **1.2 Related Works** 

For the SSSP problem, if we allow the algorithm to run in the word RAM model with integer edge weights, a sequence of improvements beyond _O_ ( _n_ log _n_ ) [FW93, FW94, Tho00a, Ram96, Ram97, Tho00b, Hag00] culminated in Thorup’s linear-time algorithm for undirected graphs [Tho99] and _O_ ( _m_ + _n_ log log min _{n, C}_ ) 

2 

time for directed graphs [Tho04], where _C_ is the maximum edge weight. For graphs with negative weights, recent breakthrough results include near-linear time _O_ ( _m_<sup>1+</sup><sup>_o_(1)</sup> log _C_ ) algorithms for SSSP with negative integer weights [CKL<sup>+</sup> 22, BNWN22, BCF23], and strongly subcubic time algorithm for SSSP with negative real weights [Fin24, HJQ24]. 

Based on the lower bound of Ω( _n_ log _n_ ) for comparison-based sorting algorithms, it was generally believed that such _sorting barrier_ exists for SSSP and many similar problems. Researchers have broken such a sorting barrier for many graph problems. For example, Yao [Yao75] gave a minimum spanning tree (MST) algorithm with running time _O_ ( _m_ log log _n_ ), which is further improved to randomized linear time [KKT95]. Gabow and Tarjan [GT88] solves _s_ - _t_ bottleneck path problem in _O_ ( _m_ log<sup>_∗_</sup> _n_ )-time, later improved to randomized _O_ ( _mβ_ ( _m, n_ )) time [CKT<sup>+</sup> 16], where _β_ ( _m, n_ ) = min _{k ≥_ 1 : log<sup>(</sup><sup>_k_)</sup> _n ≤_ _<u>mn</u>_<sup>_}_.</sup> For the single-source all-destination bottleneck path problem, there is a randomized _O_ ( _m_<sup>_√_</sup> log _n_ )-time algorithm by Duan, Lyu, Wu and Xie [DLWX18]. For the single-source nondecreasing path problem, Virginia V.Williams [Wil10] proposed an algorithm with a time bound of _O_ ( _m_ log log _n_ ). 

## **2 Preliminaries** 

We consider a directed graph _G_ = ( _V, E_ ) with a non-negative weight function _w_ : _E →_ R _≥_ 0, also denoted by _wuv_ for each edge ( _u, v_ ) _∈ E_ . Let _n_ = _|V |_ , _m_ = _|E|_ be the number of vertices and edges in the graph. In the single-source shortest path problem, we assume there is a source vertex in the graph denoted by _s_ . The goal of our algorithm is to find the length of shortest path from _s_ to every vertex _v ∈ V_ , denoted by _d_ ( _v_ ). Without loss of generality, we assume that every vertex in _G_ is reachable from _s_ , so _m ≥ n −_ 1. 

**Constant-Degree Graph.** In this paper we assume that the algorithm works on a graph with constant indegrees and out-degrees. For any given graph _G_ we may construct _G_<sup>_′_</sup> by a classical transformation (similar to [Fre83]) to accomplish this: 

- Substitute each vertex _v_ with a cycle of vertices strongly connected with zero-weight edges. For every incoming or outgoing neighbor _w_ of _v_ , there is a vertex _xvw_ on this cycle. 

- For every edge ( _u, v_ ) in _G_ , add a directed edge from vertex _xuv_ to _xvu_ with weight _wuv_ . 

It’s clear that the shortest path is preserved by the transformation. Each vertex in _G_<sup>_′_</sup> has in-degree and out-degree at most 2, while _G_<sup>_′_</sup> being a graph with _O_ ( _m_ ) vertices and _O_ ( _m_ ) edges. 

**Comparison-Addition Model.** Our algorithm works under the _comparison-addition_ model, where all edge weights are subject to only comparison and addition operations. In this model, each addition and comparison takes unit time, and no other computations on edge weights are allowed. 

**Labels Used in the Algorithm.** For a vertex _v ∈ V_ , denote _d_ ( _u_ ) as the length of shortest path from _s_ to _u_ in the graph. Similar to the Dijkstra’s algorithm, our algorithm maintains a global variable _d_<sup>�</sup> [ _u_ ] as a sound estimation of _d_ ( _u_ ) (that is, _d_<sup>�</sup> [ _u_ ] _≥ d_ ( _u_ )). Initially _d_<sup>�</sup> [ _s_ ] = 0 and _d_<sup>�</sup> [ _v_ ] = _∞_ for any other _v ∈ V_ . Throughout the algorithm we only update� � � _d_<sup>�</sup> [ _v_ ] in a non-increasing manner by relaxing an edge� ( _u, v_ ) _∈ E_ , that is, assign _d_ [ _v_ ] _← d_ [ _u_ ] + _wuv_ when _d_ [ _u_ ] + _wuv_ is no greater than the old value of _d_ [ _v_ ]. Therefore each possible value of _d_<sup>�</sup> [ _v_ ] corresponds to a path from _s_ to _v_ . If _d_<sup>�</sup> [ _x_ ] = _d_ ( _x_ ), we say _x_ is _complete_ ; otherwise, we say _x_ is _incomplete_ . If all vertices in a set _S_ are complete, we say _S_ is complete. Note that completeness is sensitive to the progress of the algorithm. The algorithm also maintains a shortest path tree according to current _d_<sup>�</sup> [ _·_ ] by recording the predecessor Pred[ _v_ ] of each vertex _v_ . When relaxing an edge ( _u, v_ ), we set Pred[ _v_ ] _← u_ . 

3 

**Total order of Paths.** Like in many papers on shortest path algorithms, we make the following assumption for an easier presentation of our algorithm: 

**Assumption 2.1.** _All paths we obtain in this algorithm have different lengths._ 

This assumption is required for two purposes: 

1. To ensure that Pred[ _v_ ] for all vertices _v ∈ V_ keep a tree structure throughout the algorithm; 

2. To provide a relative order of vertices with the same value of _d_<sup>�</sup> []. 

Next, we show that this assumption does not lose generality since we can provide a total order for all paths we obtain. We treat each path of length _l_ that traverses _α_ vertices _v_ 1 = _s, v_ 2 _, ..., vα_ as a tuple _⟨l, α, vα, vα−_ 1 _, ..., v_ 1 _⟩_ (note that the sequence of vertices is reversed in the tuple). We sort paths in the lexicographical order of the tuple in principle. That is, first compare the length _l_ . When we have a tie, compare _α_ . If there is still a tie, compare the sequence of vertices from _vα_ to _v_ 1. Comparison between the tuples can be done in only _O_ (1) time with extra information of Pred[] and _α_ stored for each _d_<sup>�</sup> [ _v_ ]: 

- **Relaxing an edge** ( _u, v_ ) **:** If _u_ = Pred[ _v_ ], even if there is a tie in _l_ and _α_ , it suffices to compare between _u_ and Pred[ _v_ ], and if _u_ = Pred[ _v_ ], then _d_<sup>�</sup> [ _u_ ] is updated to currently “shortest” and _d_<sup>�</sup> [ _v_ ] needs to get updated; 

- **Comparing two different** _d_<sup>�</sup> [ _u_ ] **and** _d_<sup>�</sup> [ _v_ ] **for** _u_ = _v_ **:** Even if there is a tie in _l_ and _α_ , it suffices to compare the endpoints _u_ and _v_ only. 

Therefore, in the following sections, we may assume that each path started from _s_ has a unique length. 

## **3 The Main Result** 

### **3.1 The Algorithm** 

Recall that we work on SSSP from source _s_ in constant-degree graphs with _m_ = _O_ ( _n_ ). Let _k_ := _⌊_ log<sup>1</sup><sup>_/_3</sup> ( _n_ ) _⌋_ and _t_ := _⌊_ log<sup>2</sup><sup>_/_3</sup> ( _n_ ) _⌋_ be two parameters in our algorithm. Our main idea is based on divide-and-conquer on vertex sets. We hope to partition a vertex set _U_ into 2<sup>_t_</sup> pieces _U_ = _U_ 1 _∪ U_ 2 _· · · ∪ U_ 2 _t_ of similar sizes, where vertices in earlier pieces have smaller distances, and then recursively partition each _Ui_ . In this way, the size of the sub-problem shrinks to a single vertex after roughly (log _n_ ) _/t_ recursion levels. To construct our structure dynamically, each time we would try to compute the distances to a set of closest vertices (without necessarily recovering a complete ordering between their true distances), and report a boundary indicating how much progress we actually make. 

Suppose at some stage of the algorithm, for every _u_ with _d_ ( _u_ ) _< b_ , _u_ is complete and we have relaxed all the edges from _u_ . We want to find the true distances to vertices _v_ with _d_ ( _v_ ) _≥ b_ . To avoid the Θ(log _n_ ) time per vertex in a priority queue, consider the “frontier” _S_ containing all current vertices _v_ with _b ≤ d_<sup>�</sup> [ _v_ ] _< B_ for some bound _B_ (without sorting them). We can see that the shortest path to every incomplete vertex _v_<sup>_′_</sup> with _b ≤ d_ ( _v_<sup>_′_</sup> ) _< B_ must visit some complete vertex in _S_ . Thus to compute the true distance to every _v_<sup>_′_</sup> with _b ≤ d_ ( _v_<sup>_′_</sup> ) _< B_ , it suffices to find the shortest paths from vertices in _S_ and bounded by _B_ . We call this subproblem _bounded multi-source shortest path_ (BMSSP) and design an efficient algorithm to solve it. The following lemma summarizes what our BMSSP algorithm achieves. 

**Lemma 3.1** (Bounded Multi-Source Shortest Path) **.** _We are given an integer level l ∈_ [0 _, ⌈_ log( _n_ ) _/t⌉_ ] _, a set of vertices S of size ≤_ 2<sup>_lt_</sup> _, and an upper bound B >_ max _x∈S d_<sup>�</sup> [ _x_ ] _. Suppose that for every incomplete vertex v with d_ ( _v_ ) _< B, the shortest path to v visits some complete vertex u ∈ S._ 

4 

_Then we have an sub-routine BMSSP_ ( _l, B, S_ ) _(Algorithm 3) in O_ (( _kl_ + _tl/k_ + _t_ ) _|U |_ ) _time that outputs a new boundary B_<sup>_′_</sup> _≤ B and a vertex set U that contains every vertex v with d_ ( _v_ ) _< B_<sup>_′_</sup> _and the shortest path to v visits some vertex of S. At the end of the sub-routine, U is complete. Moreover, one of the following is true:_ 

#### **Successful execution** _B_<sup>_′_</sup> = _B._ 

**Partial execution due to large workload** _B_<sup>_′_</sup> _< B, and |U |_ = Θ � _k_ 2<sup>_lt_�</sup> _._ 

On the top level of divide and conquer, the main algorithm calls BMSSP with parameters _l_ = _⌈_ (log _n_ ) _/t⌉_ , _S_ = _{s}, B_ = _∞_ . Because _|U | ≤|V |_ = _o_ ( _kn_ ), it must be a successful execution, and the shortest paths to all vertices are found. With chosen _k_ and _t_ , the total running time is _O_ ( _m_ log<sup>2</sup><sup>_/_3</sup> _n_ ). 

BMSSP procedure on level _l_ works by recursion, it first tries to “shrink” _S_ to size _|U |/k_ by a simple Bellman-Ford-like method (Lemma 3.2), then it makes several recursive calls on level ( _l −_ 1) until the bound reaches _B_ or the size of _U_ reaches Θ � _k_ 2<sup>_lt_�</sup> . We always make sure that a recursive call solves a problem that is smaller by a factor of roughly 1 _/_ 2<sup>_t_</sup> , so the number of levels of the recursion is bounded by _O_ ((log _n_ ) _/t_ ). The main ideas are: 

- Every time we only select about 2<sup>(</sup><sup>_l−_1)</sup><sup>_t_</sup> vertices for our next recursive call, so we use a partial sorting heap-like data structure as described in Lemma 3.3 to improve the running time. 

- If we used all of _S_ in the recursive calls, then after all remaining levels _S_ could be fully sorted and nothing is improved. Thus FindPivots (Algorithm 1) procedure is crucial here, as it shows that only at most _|U |/k_ vertices of _S_ are useful in the recursive calls. 

- Partial executions may be more complicated to analyze, so we introduce some techniques like BatchPrepend operation in Lemma 3.3. 

**Finding Pivots.** Recall that in the current stage, every _u_ such that _d_ ( _u_ ) _< b_ is complete, and we have relaxed all the edges from such _u_ ’s, and the set _S_ includes every vertex _v_ with current _b ≤ d_<sup>�</sup> [ _v_ ] _< B_ . Thus, the shortest path of every incomplete vertex _v_ such that _d_ ( _v_ ) _< B_ visits some complete vertex in _S_ . (This is because the first vertex _w_ in the shortest path to _v_ with _d_ ( _w_ ) _≥ b_ is complete and included in _S_ .) 

The idea of finding pivots is as follows: we perform relaxation for _k_ steps (with a bound _B_ ). After this, if the shortest _s_ - _v_ path with _b ≤ d_ ( _v_ ) _< B_ goes through at most _k_ vertices _w_ with _b ≤ d_ ( _w_ ) _< B_ , then _v_ is already complete. Observe that the number of large shortest path trees from _S_ , consisting of at least _k_ vertices and rooted at vertices in _S_ , is at most _|U_<sup>�</sup> _|/k_ here, where _U_<sup>�</sup> is the set of all vertices _v_ such that _d_ ( _v_ ) _< B_ and the shortest path of _v_ visits some complete vertex in _S_ . So only the roots of such shortest-path trees are needed to be considered in the recursive calls, and they are called “pivots”. 

**Lemma 3.2** (Finding Pivots) **.** _Suppose we are given a bound B and a set of vertices S. Suppose that for every incomplete vertex v such that d_ ( _v_ ) _< B, the shortest path to v visits some complete vertex u ∈ S._ 

_Denote by U_<sup>�</sup> _the set that contains every vertex v such that d_ ( _v_ ) _< B and the shortest path to v passes through some vertex in S. The sub-routine FindPivots_ ( _B, S_ ) _(Algorithm 1) finds a set W ⊆ U_<sup>�</sup> _of size O_ ( _k|S|_ ) _and a set of pivots P ⊆ S of size at most |W |/k such that for every vertex x ∈ U_<sup>�</sup> _, at least one of the following two conditions holds:_ 

- _At the end of the sub-routine, x ∈ W and x is complete;_ 

- _The shortest path to x visits some complete vertex y ∈ P ._ 

_Moreover, the sub-routine runs in time O_ ( _k|W |_ ) = _O_ (min _{k_<sup>2</sup> _|S|, k|U_<sup>�</sup> _|}_ ) _._ 

5 

**Algorithm 1** Finding Pivots 

1: **function** FindPivots( _B, S_ ) 

• **requirement:** for every incomplete vertex _v_ with _d_ ( _v_ ) _< B_ , the shortest path to _v_ visits some complete vertex in _S_ • **returns:** sets _P, W_ satisfying the conditions in Lemma 3.2 2: _W ← S_ 3: _W_ 0 _← S_ 4: **for** _i ←_ 1 to _k_ **do** _▷_ Relax for _k_ steps 5: _Wi ←∅_ 6: **for** all edges ( _u, v_ ) with _u ∈ Wi−_ 1 **do** 7: **if** _d_<sup>�</sup> [� _u_ ] + _wuv_ � _≤ d_<sup>�</sup> [ _v_ ] **then** 8: _d_ [ _v_ ] _← d_ [ _u_ ] + _wuv_ 9: **if** _d_<sup>�</sup> [ _u_ ] + _wuv < B_ **then** 10: _Wi ← Wi ∪{v}_ 11: _W ← W ∪ Wi_ 12: **if** _|W | > k|S|_ **then** 13: _P ← S_ 14: **return** _P, W_ 15: _F ←{_ ( _u, v_ ) _∈ E_ : _u, v ∈ W, d_<sup>�</sup> [ _v_ ] = _d_<sup>�</sup> [ _u_ ] + _wuv} ▷F_ is a directed forest under Assumption 2.1 16: _P ←{u ∈ S_ : _u_ is a root of a tree with _≥ k_ vertices in _F }_ 17: **return** _P, W_ 

_Proof._ Note that all vertices visited by Algorithm 1 are in _U_<sup>�</sup> , and those in _W_ are not guaranteed to be complete after the procedure. Also note that every vertex in _U_<sup>�</sup> must visit some vertex in _S_ which was complete before Algorithm 1, since any incomplete vertex _v_ at that time with _d_ ( _v_ ) _< B_ must visit some complete vertex in _S_ . 

If the algorithm returns due to _|W | > k|S|_ , we still have _|W |_ = _O_ ( _k|S|_ ) since the out-degrees of vertices are constant. For every incomplete vertex _v_ such that _d_ ( _v_ ) _< B_ , we know that the shortest path to _v_ visits some complete vertex _u ∈ S_ . Since _P_ = _S_ , we must also have _u ∈ P_ and conditions in the lemma are thus satisfied. 

If _|W | ≤ k|S|_ , _P_ is derived from _F_ . For any vertex _x ∈ U_<sup>�</sup> , consider the first vertex _y ∈ S_ on the shortest path to _x_ which was complete before Algorithm 1, then _y_ must be a root of a tree in _F_ . If there are no more than _k −_ 1 edges from _y_ to _x_ on the path, _x_ is complete and added to _W_ after _k_ relaxations. Otherwise, the tree rooted at _y_ contains at least _k_ vertices, therefore _y_ is added to _P_ . Additionally, _|P | ≤|W |/k ≤|U_<sup>�</sup> _|/k_ since each vertex in _P_ covers a unique subtree of size at least _k_ in _F_ . 

To evaluate the time complexity, note that the size of _W_ is _O_ (min _{k|S|, |U_<sup>�</sup> _|}_ ), so each iteration takes _O_ (min _{k|S|, |U_<sup>�</sup> _|}_ ) time. Computing _P_ after the for-loop runs in _O_ ( _|W |_ ) time for final _W_ . Therefore, FindPivots finishes in _O_ (min _{k_<sup>2</sup> _|S|, k|U_<sup>�</sup> _|}_ ) time. 

We also use the following data structure to help adaptively partition a problem into sub-problems, specified in Lemma 3.3: 

**Lemma 3.3.** _Given at most N key/value pairs to be inserted, an integer parameter M , and an upper bound B on all the values involved, there exists a data structure that supports the following operations:_ 

**Insert** _Insert a key/value pair in amortized O_ (max _{_ 1 _,_ log( _N/M_ ) _}_ ) _time. If the key already exists, update its value._ 

6 

- **Batch Prepend** _Insert L key/value pairs such that each value in L is smaller than any value currently in the data structure, in amortized O_ ( _L ·_ max _{_ 1 _,_ log( _L/M_ ) _}_ ) _time. If there are multiple pairs with the same key, keep the one with the smallest value._ 

- **Pull** _Return a subset S_<sup>_′_</sup> _of keys where |S_<sup>_′_</sup> _| ≤ M associated with the smallest |S_<sup>_′_</sup> _| values and an upper bound x that separates S_<sup>_′_</sup> _from the remaining values in the data structure, in amortized O_ ( _|S_<sup>_′_</sup> _|_ ) _time. Specifically, if there are no remaining values, x should be B. Otherwise, x should satisfy_ max( _S_<sup>_′_</sup> ) _< x ≤_ min( _D_ ) _where D is the set of elements in the data structure after the pull operation._ 

_Proof._ We introduce a block-based linked list data structure to support the required operations efficiently. 

Specifically, the data is organized into two sequences of blocks, _D_ 0 and _D_ 1. _D_ 0 only maintains elements from batch prepends while _D_ 1 maintains elements from insert operations, so every single inserted element is always inserted to _D_ 1. Each block is a linked list containing at most _M_ key/value pairs. The number of blocks in _D_ 1 is bounded by _O_ (max _{_ 1 _, N/M }_ ), while _D_ 0 does not have such a requirement. Blocks are maintained in the sorted order according to their values, that is, for any two key/value pairs _⟨a_ 1 _, b_ 1 _⟩∈ Bi_ and _⟨a_ 2 _, b_ 2 _⟩∈ Bj_ , where _Bi_ and _Bj_ are the _i_ -th and _j_ -th blocks from a block sequence, respectively, and _i < j_ , we have _b_ 1 _≤ b_ 2. For each block in _D_ 1, we maintain an upper bound for its elements, so that the upper bound for a block is no more than any value in the next block. We adopt a self-balancing binary search tree (e.g. Red-Black Tree [GS78]) to dynamically maintain these upper bounds, with _O_ (max _{_ 1 _,_ log( _N/M_ ) _}_ ) search/update time. 

For cases where multiple pairs with the same key are added, we record the status of each key and the associated value. If the new pair has a smaller value, we first delete the old pair then insert the new one, ensuring that only the most advantageous pair is retained for each key. 

For the operations required in Lemma 3.3: 

- Initialize( _M, B_ ) Initialize _D_ 0 with an empty sequence and _D_ 1 with a single empty block with upper bound _B_ . Set the parameter _M_ . 

- Delete( _a, b_ ) To delete the key/value pair _⟨a, b⟩_ , we remove it directly from the linked list, which can be done in _O_ (1) time. Note that it’s unnecessary to update the upper bounds of blocks after a deletion. However, if a block in _D_ 1 becomes empty after deletion, we need to remove its upper bound in the binary search tree in _O_ (max _{_ 1 _,_ log( _N/M_ ) _}_ ) time. Since Insert takes _O_ (max _{_ 1 _,_ log( _N/M_ ) _}_ ) time for _D_ 1, deletion time will be amortized to insertion time with no extra cost. 

- Insert( _a, b_ ) To insert a key/value pair _⟨a, b⟩_ , we first check the existence of its key _a_ . If _a_ already exists, we delete original pair _⟨a, b_<sup>_′_</sup> _⟩_ and insert new pair _⟨a, b⟩_ only when _b < b_<sup>_′_</sup> . 

   - Then we insert _⟨a, b⟩_ to _D_ 1. We first locate the appropriate block for it, which is the block with the smallest upper bound greater than or equal to _b_ , using binary search (via the binary search tree) on the block sequence. _⟨a, b⟩_ is then added to the corresponding linked list in _O_ (1) time. Given that the number of blocks in _D_ 1 is _O_ (max _{_ 1 _, N/M }_ ), as we will establish later, the total time complexity for a single insertion is _O_ (max _{_ 1 _,_ log( _N/M_ ) _}_ ). 

After an insertion, the size of the block may increase, and if it exceeds the size limit _M_ , a split operation will be triggered. 

- Split When a block in _D_ 1 exceeds _M_ elements, we perform a split. First, we identify the median element within the block in _O_ ( _M_ ) time [BFP<sup>+</sup> 73], partitioning the elements into two new blocks each with at most _⌈M/_ 2 _⌉_ elements — elements smaller than the median are placed in the first block, while the rest are placed in the second. This split ensures that each new block retains about _⌈M/_ 2 _⌉_ elements while preserving inter-block ordering, so the number of blocks in _D_ 1 is bounded by _O_ ( _N/M_ ). (Every block 

7 

in _D_ 1 contains Θ( _M_ ) elements, including the elements already deleted.) After the split, we make the appropriate changes in the binary search tree of upper bounds in _O_ (max _{_ 1 _,_ log( _N/M_ ) _}_ ) time. 

- BatchPrepend( _L_ ) Let _L_ denote the size of _L_ . When _L ≤ M_ , we simply create a new block for _L_ and add it to the beginning of _D_ 0. Otherwise, we create _O_ ( _L/M_ ) new blocks in the beginning of _D_ 0, each containing at most _⌈M/_ 2 _⌉_ elements. We can achieve this by repeatedly taking medians which completes in _O_ ( _L_ log( _L/M_ )) time. 

- Pull() To retrieve the smallest _M_ values from _D_ 0 _∪D_ 1, we collect a sufficient prefix of blocks from _D_ 0 and _D_ 1 separately, denoted as _S_ 0<sup>_′_and</sup><sup>_S_</sup> 1<sup>_′_, respectively.That is, in</sup><sup>_D_0 (</sup><sup>_D_1) we start from the first block</sup> and stop collecting as long as we have collected all the remaining elements or the number of collected elements in _S_ 0<sup>_′_(</sup><sup>_S_</sup> 1<sup>_′_) has reached</sup><sup>_M_.If</sup><sup>_S_</sup> 0<sup>_′∪S_</sup> 1<sup>_′_contains no more than</sup><sup>_M_elements, it must contain all</sup> blocks in _D_ 0 _∪D_ 1, so we return all elements in _S_ 0<sup>_′∪S_</sup> 1<sup>_′_as</sup><sup>_S′_and set</sup><sup>_x_to the upper bound</sup><sup>_B_, and the</sup> time needed is _O_ ( _|S_<sup>_′_</sup> _|_ ). Otherwise, we want to make _|S_<sup>_′_</sup> _|_ = _M_ , and because the block sizes are kept at most _M_ , the collecting process takes _O_ ( _M_ ) time. 

   - Now we know the smallest _M_ elements must be contained in _S_ 0<sup>_′∪S_</sup> 1<sup>_′_and can be identified from</sup><sup>_S_</sup> 0<sup>_′∪S_</sup> 1<sup>_′_</sup> as _S_<sup>_′_</sup> in _O_ ( _M_ ) time. Then we delete elements in _S_<sup>_′_</sup> from _D_ 0 and _D_ 1, whose running time is amortized to insertion time. Also set returned value _x_ to the smallest remaining value in _D_ 0 _∪D_ 1, which can also be found in _O_ ( _M_ ) time. 

We now describe our BMSSP algorithm (Algorithm 3) in detail. Recall that the main algorithm calls BMSSP with parameters _l_ = _⌈_ (log _n_ ) _/t⌉, S_ = _{s}, B_ = _∞_ on the top level. 

In the base case of _l_ = 0, _S_ is a singleton _{x}_ and _x_ is complete. We run a mini Dijkstra’s algorithm (Algorithm 2) starting from _x_ to find the closest vertices _v_ from _x_ such that _d_ ( _v_ ) _< B_ and the shortest path to _v_ visits _x_ , until we find _k_ + 1 such vertices or no more vertices can be found. Let _U_ 0 be the set of them. If we do not find _k_ + 1 vertices, return _B_<sup>_′_</sup> _← B, U ← U_ 0. Otherwise, return _B_<sup>_′_</sup> _←_ max _v∈U_ 0 _d_ ( _v_ ) _, U ←{v ∈ U_ 0 : _d_ ( _v_ ) _< B_<sup>_′_</sup> _}_ . 

If _l >_ 0, first we use FindPivots from Lemma 3.2 to obtain a pivot set _P ⊆ S_ and a set _W_ . We initialize the data structure� _D_ from Lemma 3.3 with _M_ := 2<sup>(</sup><sup>_l−_1)</sup><sup>_t_</sup> and add each _x ∈ P_ as a key associated with value _d_ [ _x_ ] to _D_ . For simplicity, we write _D_ as a set to refer to all the keys (vertices) in it. Set _B_ 0<sup>_′←_min</sup><sup>_x∈Pd_�[</sup><sup>_x_];</sup><sup>_U←∅_.The rest of the algorithm repeats the following iteration of many phases,</sup> during the _i_ -th iteration, we: 

1. Pull from _D_ a subset _Si_ of keys associated with the smallest values and _Bi_ indicating a lower bound of remaining value in _D_ ; 

2. Recursively call BMSSP( _l −_ 1 _, Bi, Si_ ), obtain its return, _Bi_<sup>_′_and</sup><sup>_Ui_, and add vertices in</sup><sup>_Ui_into</sup><sup>_U_;</sup> 

3. Relax every edge ( _u, v_ ) for _u ∈ Ui_ (i.e. _d_<sup>�</sup> [ _v_ ] _←_ min _{d_<sup>�</sup> [ _v_ ] _, d_<sup>�</sup> [ _u_ ] + _wuv}_ ). If the relax update is valid ( _d_<sup>�</sup> [ _u_ ] + _wuv ≤ d_<sup>�</sup> [ _v_ ]), do the following (even when _d_<sup>�</sup> [ _v_ ] already equals _d_<sup>�</sup> [ _u_ ] + _wuv_ ): 

   - (a) if _d_<sup>�</sup> [ _u_ ] + _wuv ∈_ [ _Bi, B_ ), then simply insert _⟨v, d_<sup>�</sup> [ _u_ ] + _wuv⟩_ into _D_ ; (b) if _d_<sup>�</sup> [ _u_ ] + _wuv ∈_ [ _Bi_<sup>_′, Bi_), then record</sup><sup>_⟨v,d_�[</sup><sup>_u_] +</sup><sup>_wuv⟩_in a set</sup><sup>_K_;</sup> 

4. Batch prepend all records in _K_ and _⟨x, d_<sup>�</sup> [ _x_ ] _⟩_ for _x ∈ Si_ with _d_<sup>�</sup> [ _x_ ] _∈_ [ _Bi_<sup>_′, Bi_) into</sup><sup>_D_;</sup> 

5. If _D_ is empty, then it is a successful execution and we return; 

6. If _|U | > k_ 2<sup>_lt_</sup> , set _B_<sup>_′_</sup> _← Bi_<sup>_′_.We expect a large workload and we prematurely end the execution.</sup> 

8 

Finally, before we end the sub-routine, we update _U_ to include every vertex _x_ in the set _W_ returned by FindPivots with _d_<sup>�</sup> [ _x_ ] _< B_<sup>_′_</sup> . 

**Algorithm 2** Base Case of BMSSP 

#### 1: **function** BaseCase( _B, S_ ) 

• **requirement 1:** _S_ = _{x}_ is a singleton, and _x_ is complete 

• **requirement 2:** for every incomplete vertex _v_ with _d_ ( _v_ ) _< B_ , the shortest path to _v_ visits _x_ 

- **returns 1:** a boundary _B_<sup>_′_</sup> _≤ B_ 

• **returns 2:** a set _U_ 2: _U_ 0 _← S_ 3: initialize a binary heap _H_ with a single element _⟨x, d_<sup>�</sup> [ _x_ ] _⟩_ [Wil64] 4: **while** _H_ is non-empty and _|U_ 0 _| < k_ + 1 **do** 5: _⟨u, d_<sup>�</sup> [ _u_ ] _⟩←H._ ExtractMin() 6: _U_ 0 _← U_ 0 _∪{u}_ 7: **for** edge _e_ = ( _u, v_ ) **do** 8: **if** _d_<sup>�</sup> [� _u_ ] + _wuv_ � _≤ d_<sup>�</sup> [ _v_ ] and _d_<sup>�</sup> [ _u_ ] + _wuv < B_ **then** 9: _d_ [ _v_ ] _← d_ [ _u_ ] + _wuv_ 10: **if** _v_ is not in _H_ **then** 11: _H._ Insert( _⟨v, d_<sup>�</sup> [ _v_ ] _⟩_ ) 12: **else** 13: _H._ DecreaseKey( _⟨v, d_<sup>�</sup> [ _v_ ] _⟩_ ) 14: **if** _|U_ 0 _| ≤ k_ **then** 15: **return** _B_<sup>_′_</sup> _← B, U ← U_ 0 16: **else** 17: **return** _B_<sup>_′_</sup> _←_ max _v∈U_ 0 _d_<sup>�</sup> [ _v_ ] _, U ←{v ∈ U_ 0 : _d_<sup>�</sup> [ _v_ ] _< B_<sup>_′_</sup> _}_ 

**Remark 3.4.** Note that on Line 7 of Algorithm 1, Line 8 of Algorithm 2 and Line 15 of Algorithm 3, the conditions are “ _d_<sup>�</sup> [ _u_ ] + _wuv ≤ d_<sup>�</sup> [ _v_ ]”. The equality is required so that an edge relaxed on a lower level can be re-used on upper levels. 

**Remark 3.5.** Using methods in Lemma 3.3 to implement data structure _D_ in Algorithm 3 at level _l_ , where _M_ = 2<sup>(</sup><sup>_l−_1)</sup><sup>_t_</sup> , and _|S| ≤_ 2<sup>_lt_</sup> , the total number of insertions _N_ is _O_ ( _k_ 2<sup>_lt_</sup> ), because of the fact that _|U |_ = _O_ ( _k_ 2<sup>_lt_</sup> ), the constant-degree property, and the disjointness of _Ui_ ’s (as established later in Remark 3.8). Also, size of _K_ each time is bounded by _O_ ( _|Ui|_ ) = _O_ ( _k_ 2<sup>(</sup><sup>_l−_1)</sup><sup>_t_</sup> ). Thus, insertion to _D_ takes _O_ (log _k_ + _t_ ) = _O_ ( _t_ ) time, and Batch Prepend takes _O_ (log _k_ ) = _O_ (log log _n_ ) time per vertex in _K_ . 

### **3.2 Observations and Discussions on the Algorithm** 

We first give some informal explanations on the algorithm, and then in the next subsections, we will formally prove the correctness and running time of the algorithm. 

**What can we get from the recursion?** Let’s look at the recursion tree _T_ of Algorithm 3 where each node _x_ denotes a call of the BMSSP procedure. Let _lx_ , _Bx_ , and _Sx_ denote the parameters _l_ , _B_ , and _S_ at node _x_ , _Bx_<sup>_′_and</sup><sup>_Ux_denote the returned values</sup><sup>_B′_and</sup><sup>_U_at node</sup><sup>_x_,</sup><sup>_Px_and</sup><sup>_Wx_denote</sup><sup>_P_and</sup><sup>_W_(on Line 4) returned</sup> by the FindPivots procedure at node _x_ , respectively, and _Wx_<sup>_′_denote the set of vertices</sup><sup>_v∈Wx_satisfying</sup> _d_ ( _v_ ) _< Bx_<sup>_′_.Then we expect:</sup> 

1. Since we assume that all vertices are reachable from _s_ , in the root _r_ of _T_ , we have _Ur_ = _V_ ; 

9 

**Algorithm 3** Bounded Multi-Source Shortest Path 

- 1: **function** BMSSP( _l, B, S_ ) 

   - **requirement 1:** _|S| ≤_ 2<sup>_lt_</sup> 

   - **requirement 2:** for every incomplete vertex _x_ with _d_ ( _x_ ) _< B_ , the shortest path to _x_ visits some 

   - complete vertex _y ∈ S_ 

   - **returns 1:** a boundary _B_<sup>_′_</sup> _≤ B_ 

• **returns 2:** a set _U_ 2: **if** _l_ = 0 **then** 3: **return** _B_<sup>_′_</sup> _, U ←_ BaseCase( _B, S_ ) 4: _P, W ←_ FindPivots( _B, S_ ) 5: _D._ Initialize( _M, B_ ) with _M_ = 2<sup>(</sup><sup>_l−_1)</sup><sup>_t_</sup> _▷_ 6: _D._ Insert( _⟨x, d_<sup>�</sup> [ _x_ ] _⟩_ ) **for** _x ∈ P_ 7: _i ←_ 0; _B_ 0<sup>_′←_min</sup><sup>_x∈Pd_�[</sup><sup>_x_];</sup><sup>_U←∅_</sup> 8: **while** _|U | < k_ 2<sup>_lt_</sup> and _D_ is non-empty **do** 9: _i ← i_ + 1 10: _Bi, Si ←D._ Pull() 11: _Bi_<sup>_′, Ui←_BMSSP(</sup><sup>_l −_1</sup><sup>_, Bi, Si_)</sup> 12: _U ← U ∪ Ui_ 13: _K ←∅_ 14: **for** edge _e_ = ( _u, v_ ) where _u ∈ Ui_ **do** 15: **if** _d_<sup>�</sup> [� _u_ ] + _wuv_ � _≤ d_<sup>�</sup> [ _v_ ] **then** 16: _d_ [ _v_ ] _← d_ [ _u_ ] + _wuv_ 17: **if** _d_<sup>�</sup> [ _u_ ] + _wuv ∈_ [ _Bi, B_ ) **then** 18: _D._ Insert( _⟨v, d_<sup>�</sup> [ _u_ ] + _wuv⟩_ ) 19: **else if** _d_<sup>�</sup> [ _u_ ] + _wuv ∈_ [ _Bi_<sup>_′, Bi_)</sup><sup>**then**</sup> 20: _K ← K ∪{⟨v, d_<sup>�</sup> [ _u_ ] + _wuv⟩}_ 21: _D._ BatchPrepend( _K ∪{⟨x, d_<sup>�</sup> [ _x_ ] _⟩_ : _x ∈ Si_ and _d_<sup>�</sup> [ _x_ ] _∈_ [ _Bi_<sup>_′, Bi_)</sup><sup>_}_)</sup> 22: **return** _B_<sup>_′_</sup> _←_ min _{Bi_<sup>_′, B}_;</sup><sup>_U←U∪{x ∈W_:</sup><sup>_d_�[</sup><sup>_x_]</sup><sup>_< B′}_</sup> 

_▷ D_ is an instance of Lemma 3.3 _▷_ If _P_ = _∅_ set _B_ 0<sup>_′←B_</sup> 

2. _|Sx| ≤_ 2<sup>_lxt_</sup> , so the depth of _T_ is at most (log _n_ ) _/t_ = _O_ (log<sup>1</sup><sup>_/_3</sup> _n_ ); 

3. We break when _|Ux| ≥ k_ 2<sup>_lxt_</sup> _> |Sx|_ . Intuitively, the size of _Ux_ increases slowly enough so we should still have _|Ux|_ = _O_ ( _k_ 2<sup>_lxt_</sup> ) (formally shown in Lemma 3.9); 

4. If node _x_ is a successful execution, in the execution of FindPivots, _U_<sup>�</sup> in Lemma 3.2 is equal to _Ux_ , so _|Px| ≤|Ux|/k_ by Lemma 3.2; 

5. If node _x_ is a partial execution, _|Ux| ≥ k_ 2<sup>_lxt_</sup> _≥ k|Sx|_ , so _|Px| ≤|Sx| ≤|Ux|/k_ ; 

6. For each node _x_ of _T_ and its children _y_ 1 _, · · · , yq_ in the order of the calls, we have: 

   - _Uy_ 1 _, · · · , Uyq_ are disjoint. For _i < j_ , distances to vertices in _Uyi_ are smaller than distances to vertices in _Uyj_ ; 

   - _Ux_ = _Wx_<sup>_′∪Uy_</sup> 1<sup>_∪· · · ∪Uy_</sup> _q_<sup>;</sup> 

   - Consequently, the _Ux_ ’s for all nodes _x_ at the same depth in _T_ are disjoint, and total sum of _|Ux|_ for all nodes _x_ in _T_ is _O_ ( _n_ (log _n_ ) _/t_ ). 

10 

**Correctness.** In a call of BMSSP, let _U_<sup>�</sup> denote the set that contains all vertices _v_ with _d_ ( _v_ ) _< B_ and the shortest path to _v_ visits some vertex in _S_ . Then BMSSP should return _U_ = _U_<sup>�</sup> in a successful execution, or _U_ = _{u ∈ U_<sup>�</sup> : _d_ ( _u_ ) _< B_<sup>_′_</sup> _}_ in a partial execution, with all vertices in _U_ complete. In the base case where _l_ = 0, _S_ contains only one vertex _x_ , a Dijkstra-like algorithm starting from _x_ completes the task. 

Otherwise we first shrink _S_ to a smaller set of pivots _P_ to insert into _D_ , with some vertices complete and added into _W_ . Lemma 3.2 ensures that the shortest path of any remaining incomplete vertex _v_ visits some complete vertex in _D_ . For any bound _Bi ≤ B_ , if _d_ ( _v_ ) _< Bi_ , the shortest path to _v_ must also visit some complete vertex _u ∈D_ with _d_ ( _u_ ) _< Bi_ . Therefore we can call subprocedure BMSSP on _Bi_ and _Si_ . 

By inductive hypothesis, each time a recursive call on Line 11 of Algorithm 3 returns, vertices in _Ui_ are complete.� After the algorithm relaxes edges from _u ∈ Ui_ and inserts all the updated out-neighbors _x_ with _d_ [ _x_ ] _∈_ [ _Bi_<sup>_′, B_) into</sup><sup>_D_, once again any remaining incomplete vertex</sup><sup>_v_now visits some complete vertex in</sup><sup>_D_.</sup> 

Finally, with the complete vertices in _W_ added, _U_ contains all vertices required and all these vertices are complete. 

**Running time.** The running time is dominated by calls of FindPivots and the overheads inside the data structures _D_ . By (4) and (5), the running time of FindPivots procedure at node _x_ is bounded by _O_ ( _|Ux|k_ ), so the total running time over all nodes on one depth of _T_ is _O_ ( _nk_ ). Summing over all depths we get _O_ ( _nk ·_ (log _n_ ) _/t_ ) = _O_ ( _n_ log<sup>2</sup><sup>_/_3</sup> _n_ ). 

For the data structure _D_ in a call of BMSSP, the total running time is dominated by Insert and Batch Prepend operations. We analyze the running time as follows. 

- Vertices in _P_ can be added to _D_ on Line 6. Since _|Px|_ = _O_ ( _|Ux|/k_ ), the total time for nodes of one depth of _T_ is _O_ ( _n/k ·_ ( _t_ + log _k_ )) = _O_ ( _nt/k_ ). Summing over all depths we get _O_ (( _n_ log _n_ ) _/k_ ) = _O_ ( _n_ log<sup>2</sup><sup>_/_3</sup> _n_ ). 

- Some vertices already pulled to _Si_ can be added back to _D_ through BatchPrepend on Line 21. Here we know in every iteration _i_ , _|Si| ≤|Ui|_ , so the total time for adding back is bounded by<sup>�</sup> _x∈T_<sup>_|Ux| ·_</sup> log _k_ = _O_ ( _n_ log _k ·_ (log _n_ ) _/t_ ) = _O_ ( _n ·_ log<sup>1</sup><sup>_/_3</sup> _n ·_ log log _n_ ). 

- A vertex _v_ can be inserted to _D_ through edge ( _u, v_ ) **directly** on Line 18 if _Bi ≤ d_ ( _u_ ) + _wuv < B_ , or **through** _K_ as on Line 20 if _Bi_<sup>_′≤d_(</sup><sup>_u_) +</sup><sup>_wuv<Bi_.(Notethat</sup><sup>_u∈Ui_isalreadycomplete.)</sup> Every edge ( _u, v_ ) can only be relaxed once in each level by (6), but it can be relaxed in multiple levels in an ancestor-descendant path of the recursion tree� � _T_ . (Note that the condition on Line 15 is _d_ [ _u_ ] + _wuv ≤ d_ [ _v_ ].) However, we can show every edge ( _u, v_ ) can only lead _v_ to be directly inserted to _D_ by the Insert operation on one level. 

   - It can be easily seen that if _y_ is a descendant of _x_ in the recursion tree _T_ , _By ≤ Bx_ . 

   - If ( _u, v_ ) leads _v_ to be directly inserted to _D_ on Line 18, then _d_ ( _u_ ) + _wuv ≥ Bi_ . Since _u ∈ Ui_ , for every descendant _y_ of the current call in the recursion tree _T_ satisfying _u ∈ Uy_ , we have _By ≤ Bi ≤ d_ ( _u_ ) + _wuv_ , so _v_ will not be added to _D_ through ( _u, v_ ) in any way in lower levels. 

- Since every edge ( _u, v_ ) can only lead _v_ to be directly inserted to _D_ by the Insert operation once in the algorithm, the total time is _O_ ( _m_ (log _k_ + _t_ )) = _O_ ( _m_ log<sup>2</sup><sup>_/_3</sup> _n_ ). The time for all edges ( _u, v_ ) leading _v_ to be inserted to _D_ through _K_ in one level is _O_ ( _m_ log _k_ ), and in total is _O_ ( _m_ log _k ·_ (log _n_ ) _/t_ ) = _O_ ( _m ·_ log<sup>1</sup><sup>_/_3</sup> _n ·_ log log _n_ ). 

11 

### **3.3 Correctness Analysis** 

To present the correctness more accurately and compactly, we introduce several notations on the “shortest path tree”. Due to the uniqueness of shortest paths, the shortest path tree _T_ rooted at the source _s_ can be constructed unambiguously. Define _T_ ( _u_ ) as the subtree rooted at _u_ according to _d_ ( _·_ ). An immediate observation is that _the shortest path to v passes through u if and only if v is in the subtree rooted at u_ . 

For a vertex set _S_ , define _T_ ( _S_ ) =<sup>�</sup> _v∈S_<sup>_T_(</sup><sup>_v_), namely the union of the subtrees of</sup><sup>_T_(</sup><sup>_s_) rooted at vertices</sup> in _S_ , or equivalently, the set of vertices whose shortest paths pass through some vertex in _S_ . For a set of vertices _S ⊆ V_ , denote _S_<sup>_∗_</sup> = _{v ∈ S_ : _v_ is complete _}_ . Then _T_ ( _S_<sup>_∗_</sup> ) =<sup>�</sup> _v∈S_<sup>_∗T_(</sup><sup>_v_) is the union of subtrees</sup> of _T_ ( _s_ ) rooted at _S_<sup>_∗_</sup> , or the set of vertices whose shortest paths pass through some complete vertex in _S_ . Obviously, _T_ ( _S_<sup>_∗_</sup> ) _⊆ T_ ( _S_ ). Note that _T_ ( _S_<sup>_∗_</sup> ) is sensitive to the progress of the algorithm while _T_ ( _S_ ) is a fixed set. Another observation is that, a complete vertex would remain complete, so _S_<sup>_∗_</sup> and _T_ ( _S_<sup>_∗_</sup> ) never lose a member. 

For a bound _B_ , denote _T<B_ ( _S_ ) = _{v ∈ T_ ( _S_ ) : _d_ ( _v_ ) _< B}_ . Also note that _T<B_ ( _S_ ) coincides with _U_<sup>�</sup> mentioned above. For an interval [ _b, B_ ), denote _T_ [ _b,B_ )( _S_ ) = _{v ∈ T_ ( _S_ ) : _d_ ( _v_ ) _∈_ [ _b, B_ ) _}_ . 

**Lemma 3.6** (Pull Minimum) **.** _Suppose every incomplete vertex v with d_ ( _v_ ) _< B is in T_ ( _S_<sup>_∗_</sup> ) _. Suppose we split S into X_ = _{x ∈ S_ : _d_<sup>�</sup> [ _x_ ] _< B} and Y_ = _{x ∈ S_ : _d_<sup>�</sup> [ _x_ ] _≥B} for some B < B. Then every incomplete vertex v with d_ ( _v_ ) _< B is in T_ ( _X_<sup>_∗_</sup> ) _. Moreover, for any B_<sup>_′_</sup> _< B, T<B′_ ( _S_ ) = _T<B′_ ( _X_ ) _._ 

_Proof._ For any incomplete vertex _v_ with _d_ ( _v_ ) _< B_ , as _B < B_ , by definition, _v ∈ T_ ( _u_ ) for some complete vertex _u ∈ S_ . Therefore _d_<sup>�</sup> [ _u_ ] = _d_ ( _u_ ) _≤ d_ ( _v_ ) _< B_ , so _u ∈ X_ and thus _v ∈ T_ ( _X_<sup>_∗_</sup> ). 

For the second statement, it is clear that _T<B′_ ( _X_ ) _⊆ T<B′_ ( _S_ ). For any _v ∈ T<B′_ ( _S_ ), since _d_ ( _v_ ) _< B_<sup>_′_</sup> _< B < B_ , the shortest path to _v_ passes through some vertex _x ∈ S_<sup>_∗_</sup> . Now that _d_<sup>�</sup> [ _x_ ] = _d_ ( _x_ ) _≤ d_ ( _v_ ) _< B_<sup>_′_</sup> , we have _x ∈ X_ and _v ∈ T<B′_ ( _X_ ). 

Now we are ready to prove the correctness part of Lemma 3.1. 

**Lemma 3.7.** _We prove the correctness of Algorithm 3 by proving the following statement (the size of U is dealt with in Lemma 3.9), restated from Lemma 3.1: Given a level l ∈_ [0 _, ⌈_ (log _n_ ) _/t⌉_ ] _, a bound B and a set of vertices S of size ≤_ 2<sup>_lt_</sup> _, suppose that every incomplete vertex v with d_ ( _v_ ) _< B is in T_ ( _S_<sup>_∗_</sup> ) _. Then, after running Algorithm 3, we have: U_ = _T<B′_ ( _S_ ) _, and U is complete._ 

_Proof._ We prove by induction on _l_ . When _l_ = 0, since _S_ = _{x}_ is a singleton, _x_ must be complete. Then clearly the classical Dijkstra’s algorithm (Algorithm 2) finds the desired _U_ = _T<B′_ ( _S_ ) as required. Suppose correctness holds for _l −_ 1, we prove that it holds for _l_ . Denote _Di_ as the set of vertices (keys) in _D_ just before the _i_ -th iteration (at the end of the ( _i −_ 1)-th iteration), and _Di_<sup>_∗_as the set of complete vertices in</sup><sup>_Di_at that</sup> time. Next, we prove the following two propositions by induction on increasing order of _i_ : 

Immediately before the _i_ -th iteration, 

- (a) Every incomplete vertex _v_ with _d_ ( _v_ ) _< B_ is in _T_ [ _Bi′−_ 1<sup>_,B_)(</sup><sup>_P_).</sup> 



In the base case _i_ = 1, by Lemma 3.2, for every incomplete vertex _v_ with _d_ ( _v_ ) _< B_ (including _v ∈ P_ ), _v ∈ T<B_ ( _P_<sup>_∗_</sup> ). Then _d_ ( _v_ ) _≥_ min _x∈P ∗ d_ ( _x_ ) = min _x∈P ∗ d_<sup>�</sup> [ _x_ ] _≥ B_ 0<sup>_′_.Thuseverysuch</sup><sup>_v_isin</sup><sup>_T_</sup> [ _B_ 0<sup>_′,B_)(</sup><sup>_P_)</sup> (actually _T<B_ 0 _′_<sup>(</sup><sup>_P_) is an empty set) and</sup><sup>_T_[</sup><sup>_B_</sup> 0<sup>_′,B_)(</sup><sup>_P_)=</sup><sup>_T<B_(</sup><sup>_P_)=</sup><sup>_T<B_(</sup><sup>_P ∗_).Because</sup><sup>_D_1=</sup><sup>_P_,the base</sup> case is proved. 

Suppose both propositions hold for _i_ . Then each incomplete vertex _v_ with _d_ ( _v_ ) _< B_ is in _T_ [ _Bi′−_ 1<sup>_,B_)(</sup><sup>_P_)</sup><sup>_⊆_</sup> _T_ ( _Di_<sup>_∗_).By Lemma 3.3, the suppositions of Lemma 3.6 are met for</sup><sup>_X_:=</sup><sup>_Si_,</sup><sup>_Y_:=</sup><sup>_Di\Si_, and</sup><sup>_B_:=</sup><sup>_Bi_, so</sup> every incomplete vertex _v_ with _d_ ( _v_ ) _< Bi_ is in _T_ ( _Si_<sup>_∗_</sup> ); also note _|Si| ≤_ 2<sup>(</sup><sup>_l−_1)</sup><sup>_t_</sup> . By induction hypothesis 

12 

on level _l −_ 1, the _i_ -th recursive call is correct and we have _Ui_ = _T<Bi′_<sup>(</sup><sup>_Si_) and is complete.Note that</sup><sup>_Si_</sup> includes all the vertices _v_ in _Di_ such that _d_<sup>�</sup> [ _v_ ] _< Bi_<sup>_′_and that</sup><sup>_B_</sup> _i_<sup>_′≤B_.Thus by Lemma 3.6 and proposition</sup> (b) on case _i_ , _Ui_ = _T<Bi′_<sup>(</sup><sup>_Si_)=</sup><sup>_T<B_</sup> _i_<sup>_′_(</sup><sup>_Di_)=</sup><sup>_T_[</sup><sup>_B_</sup> _i_<sup>_′_</sup> _−_ 1<sup>_,B_</sup> _i_<sup>_′_)(</sup><sup>_P_)andiscomplete(thusprovingRemark3.8).</sup> Then, every incomplete vertex _v_ with _d_ ( _v_ ) _< B_ is in _T_ [ _Bi′−_ 1<sup>_,B_)(</sup><sup>_P_)</sup><sup>_\ T_[</sup><sup>_B_</sup> _i_<sup>_′_</sup> _−_ 1<sup>_,B_</sup> _i_<sup>_′_)(</sup><sup>_P_) =</sup><sup>_T_[</sup><sup>_B_</sup> _i_<sup>_′,B_)(</sup><sup>_P_).Thus, we</sup> proved proposition (a) for the ( _i_ + 1)-th iteration. 

Now we prove proposition (b) for the ( _i_ + 1)-th iteration. Since _Bi_<sup>_′≥B_</sup> _i_<sup>_′_</sup> _−_ 1<sup>, from proposition (b) of the</sup> _i_ -th iteration, we have _T_ [ _Bi′_<sup>_,B_)(</sup><sup>_P_) =</sup><sup>_T_[</sup><sup>_B_</sup> _i_<sup>_′,B_)(</sup><sup>_Di_) =</sup><sup>_T_[</sup><sup>_B_</sup> _i_<sup>_′,B_)(</sup><sup>_D_</sup> _i_<sup>_∗_).Suppose we can show that</sup><sup>_T_</sup> [ _Bi_<sup>_′,B_)(</sup><sup>_D_</sup> _i_<sup>_∗_)</sup><sup>_⊆_</sup> _T<B_ ( _Di_<sup>_∗_</sup> +1<sup>) and</sup><sup>_T<B_(</sup><sup>_Di_+1)</sup><sup>_⊆T_</sup> [ _Bi_<sup>_′,B_)(</sup><sup>_Di_).By definition</sup><sup>_T<B_(</sup><sup>_D_</sup> _i_<sup>_∗_</sup> +1<sup>)</sup><sup>_⊆T<B_(</sup><sup>_Di_+1), then</sup> 



For any vertex _y ∈Di_<sup>_∗\ D_</sup> _i_<sup>_∗_</sup> +1<sup>,we have</sup><sup>_y∈Si_.Note that vertices</sup><sup>_v_of</sup><sup>_Si_with</sup><sup>_d_�[</sup><sup>_v_]</sup><sup>_≥B_</sup> _i_<sup>_′_are batch-</sup> prepended back to _Di_ +1 on Line 21, so we have _d_<sup>�</sup> [ _y_ ] _< Bi_<sup>_′_.Thus</sup><sup>_y∈Ui_and is complete.For any vertex</sup> _x ∈ T_ [ _Bi′_<sup>_,B_)(</sup><sup>_y_),as</sup><sup>_x∈Ui_,alongtheshortestpathfrom</sup><sup>_y_to</sup><sup>_x_,thereisanedge(</sup><sup>_u, v_)with</sup><sup>_u∈Ui_and</sup> _v ∈ Ui_ . During relaxation, _v_ is then complete and is added to _Di_ +1, so _x ∈ T_ [ _Bi′_<sup>_,B_)(</sup><sup>_v_)</sup><sup>_⊆T<B_(</sup><sup>_D_</sup> _i_<sup>_∗_</sup> +1<sup>).</sup> For any vertex _v ∈Di_ +1 _\ Di_ , since _v_ is added to _Di_ +1, there is an edge ( _u, v_ ) with _u ∈ Ui_ = _T<Bi′_<sup>(</sup><sup>_Di_)</sup> and the relaxation of ( _u, v_ ) is valid ( _d_<sup>�</sup> [ _u_ ] + _wuv ≤ d_<sup>�</sup> [ _v_ ]). Pick the last valid relaxation edge ( _u, v_ ) for _v_ . If _v ∈ T_ ( _u_ ), then _v_ is complete, _d_ ( _v_ ) = _d_<sup>�</sup> [ _v_ ] _≥ Bi_<sup>_′_,and</sup><sup>_v∈T_</sup> [ _Bi_<sup>_′,B_)(</sup><sup>_Di_);if</sup><sup>_v_isincomplete,thenby</sup> proposition (a), _v ∈ T_ [ _Bi′_<sup>_,B_)(</sup><sup>_P_)=</sup><sup>_T_[</sup><sup>_B_</sup> _i_<sup>_′,B_)(</sup><sup>_Di_);or if</sup><sup>_v_is complete but</sup><sup>_v∈/T_(</sup><sup>_u_), we have a contradiction</sup> because it implies that relaxation of ( _u, v_ ) is invalid. 

Now that we have proven the propositions, we proceed to prove that the returned _U_ = _T<B′_ ( _S_ ) and that _U_ is complete. Suppose there are _q_ iterations. We have shown that every _Ui_ = _T_ [ _Bi′−_ 1<sup>_,B_</sup> _i_<sup>_′_)(</sup><sup>_P_)andis</sup> complete, so _Ui_ ’s are also disjoint. By Lemma 3.2, _W_ contains every vertex in _T<B_ ( _S \ P_ ) (as they are not in _T_ ( _P_ )) and they are complete; besides, all vertices _v_ in _W_ but not in _T<B_ ( _S \ P_ ) with _d_ ( _v_ ) _< Bq_<sup>_′_</sup> are complete (because they are in _T<Bq′_ ( _P_ )). Therefore, _{x ∈ W_ : _d_<sup>�</sup> [ _x_ ] _< Bq_<sup>_′}_containseveryvertexin</sup> _T<Bq′_ ( _S \ P_ ) and is complete. Thus finally _U_ := (<sup>�</sup><sup>_q_</sup> _i_ =1<sup>_Ui_)</sup><sup>_∪{x∈W_:</sup><sup>_d_�[</sup><sup>_x_]</sup><sup>_<B_</sup> _q_<sup>_′}_equals</sup><sup>_T<B_</sup> _q_<sup>_′_(</sup><sup>_S_) and</sup> is complete. 

**Remark 3.8.** From the proof of Lemma 3.7, _Ui_ = _T_ [ _Bi′−_ 1<sup>_,B_</sup> _i_<sup>_′_)(</sup><sup>_P_) and they are disjoint and complete.As a</sup> reminder, Lemma 3.6 and proposition (b) of Lemma 3.7 prove this. 

### **3.4 Time Complexity Analysis** 

**Lemma 3.9.** _Under the same conditions as in Lemma 3.7, where every incomplete vertex v with d_ ( _v_ ) _< B is in T<B_ ( _S_<sup>_∗_</sup> ) _. After running Algorithm 3, we have |U | ≤_ 4 _k_ 2<sup>_lt_</sup> _. If B_<sup>_′_</sup> _< B, then |U | ≥ k_ 2<sup>_lt_</sup> _._ 

_Proof._ We can prove this by induction on the number of levels. The base case _l_ = 0 clearly holds. 

Suppose there are _q_ iterations. Before the _q_ -th iteration, _|U | < k_ 2<sup>_lt_</sup> . After the _q_ -th iteration, the number of newly added vertices _|Uq| ≤_ 4 _k_ 2<sup>(</sup><sup>_l−_1)</sup><sup>_t_</sup> (by Lemma 3.7, the assumptions for recursive calls are satisfied), and because _|W | ≤ k|S| ≤ k_ 2<sup>_lt_</sup> , we have _|U | ≤_ 4 _k_ 2<sup>_lt_</sup> . If _D_ is empty, the algorithm succeeds and quits with _B_<sup>_′_</sup> = _B_ . Otherwise, the algorithm ends partially because _|U | ≥ k_ 2<sup>_lt_</sup> . 

**Lemma 3.10.** _Immediately before the i-th iteration of Algorithm 3,_ min _x∈D d_ ( _x_ ) _≥ Bi_<sup>_′_</sup> _−_ 1<sup>_._</sup> 

_Proof._ From the construction of _D_ , immediately before the _i_ -th iteration of Algorithm 3, min _v∈D d_<sup>�</sup> [ _v_ ] _≥ Bi_<sup>_′_</sup> _−_ 1<sup>.For</sup><sup>_v∈D_,if</sup><sup>_v_iscomplete,then</sup><sup>_d_(</sup><sup>_v_)=</sup><sup>_d_�[</sup><sup>_v_]</sup><sup>_≥B_</sup> _i_<sup>_′_</sup> _−_ 1<sup>.If</sup><sup>_v_isincomplete,byproposition(a)of</sup> Lemma 3.7, because _v ∈ T_ [ _Bi′−_ 1<sup>_,B_)(</sup><sup>_P_),</sup><sup>_d_(</sup><sup>_v_)</sup><sup>_≥B_</sup> _i_<sup>_′_</sup> _−_ 1<sup>.</sup> 

13 

**Lemma 3.11.** _Denote by U_<sup>�</sup> := _T<B_ ( _S_ ) _the set that contains every vertex v with d_ ( _v_ ) _< B and the shortest path to v visits some vertex of S. After running Algorithm 3,_ min _{|U_<sup>�</sup> _|, k|S|} ≤|U | and |S| ≤|U |._ 

_Proof._ If it is a successful execution, then _S ⊆ U_<sup>�</sup> = _U_ . If it is partial, then _k|S| ≤ k_ 2<sup>_lt_</sup> _≤|U |_ . 

For a vertex set _U_ and two bounds _c < d_ , denote _N_<sup>+</sup> ( _U_ ) = _{_ ( _u, v_ ) : _u ∈ U }_ as the set of outgoing edges from _U_ , and _N_<sup>+and</sup><sup>_d_(</sup><sup>_u_) +</sup><sup>_wuv∈_[</sup><sup>_c, d_)</sup><sup>_}_.</sup> [ _c,d_ )<sup>(</sup><sup>_U_) =</sup><sup>_{_(</sup><sup>_u, v_) :</sup><sup>_u ∈U_</sup> 

**Lemma 3.12** (Time Complexity) **.** _Suppose a large constant C upper-bounds the sum of the constants hidden in the big-O notations in all previously mentioned running times: in find-pivots, in the data structure, in relaxation, and all other operations. Algorithm 3 solves the problem in Lemma 3.1 in time_ 



_With k_ = _⌊_ log<sup>1</sup><sup>_/_3</sup> ( _n_ ) _⌋ and t_ = _⌊_ log<sup>2</sup><sup>_/_3</sup> ( _n_ ) _⌋, calling the algorithm with l_ = _⌈_ (log _n_ ) _/t⌉, S_ = _{s}, B_ = _∞ takes O_ ( _m_ log<sup>2</sup><sup>_/_3</sup> _n_ ) _time._ 

_Proof._ We prove by induction on the level _l_ . When _l_ = 0, the algorithm degenerates to the classical Dijkstra’s algorithm (Algorithm 2) and takes time _C|U |_ log _k_ , so the base case is proved. Suppose the time complexity is correct for level _l −_ 1. Now we analyze the time complexity of level _l_ . 

By Remark 3.5, each insertion takes amortized time _Ct_ (note that log _k < t_ ); each batch prepended element takes amortized time _C_ log _k_ ; each pulled term takes amortized constant time. But we may ignore Pull’s running time because each pulled term must have been inserted/batch prepended, and the constant of Pull can be covered by _C_ in those two operations. 

By Remark 3.8, _Ui_ ’s are disjoint and<sup>�</sup> _i≥_ 1<sup>_|Ui| ≤|U|_.</sup> 

Now we are ready to calculate total running time of Algorithm 3 on level _l_ by listing all the steps. 

By Lemma 3.2, the FindPivots step takes time _C ·_ min _{|U_<sup>�</sup> _|, k|S|}k_ and _|P | ≤_ min _{|U_<sup>�</sup> _|/k, |S|}_ . Inserting _P_ into _D_ takes time _C|P |t_ . And by Lemma 3.11, their time is bounded by _C_ ( _k_ + _t/k_ ) _|U |_ . 

In the _i_ -th iteration, the sub-routine takes _C_ ( _k_ +2 _t/k_ ) _l|Ui|_ + _C_ ( _t_ +( _l −_ 1) log _k_ ) _|N_ [min<sup>+</sup> _x∈Si d_ ( _x_ ) _,Bi_ )<sup>(</sup><sup>_Ui_)</sup><sup>_|_</sup> time by the induction hypothesis. Taking the sum, by Lemma 3.10, _N_ [min<sup>+</sup> _x∈Si d_ ( _x_ ) _,Bi_ )<sup>(</sup><sup>_Ui_)</sup><sup>_⊆N_</sup> [<sup>+</sup> _Bi_<sup>_′_</sup> _−_ 1<sup>_,Bi_)(</sup><sup>_Ui_).</sup> Then the sum of time spent by all the sub-routines is bounded by 



In the following relaxation step, for each edge ( _u, v_ ) originated from _Ui_ , if _d_<sup>�</sup> [ _u_ ] + _wuv ∈_ [ _Bi, B_ ), they are directly inserted; if _d_<sup>�</sup> [ _u_ ] + _wuv ∈_ [ _Bi_<sup>_′, Bi_), they are batch prepended.Again by Remark 3.8, all</sup><sup>_Ui_’s are</sup> complete, so for the previous statements we can replace _d_<sup>�</sup> [ _·_ ] with _d_ ( _·_ ). Thus in total, it takes time 



Vertices in _Si_ were also batch prepended, and this step takes time _O_ ( _|{x ∈ Si_ : _d_<sup>�</sup> [ _x_ ] _∈_ [ _Bi_<sup>_′, Bi_)</sup><sup>_}|_log</sup><sup>_k_).</sup> This operation takes non-zero time only if _Bi_<sup>_′<Bi_, i.e., the</sup><sup>_i_-th sub-routine is a partial execution.Thus in</sup> total this step takes time _C_<sup>�</sup> partial _i_<sup>_|Si|_log</sup><sup>_k≤_(</sup><sup>_C|U|_log</sup><sup>_k_)</sup><sup>_/k≤C|U|t/k_.</sup> Therefore, the total running time on the level _l_ is 



14 

where _N_ is the sum 



and _B_ 0<sup>_′≥_min</sup><sup>_x∈S d_(</sup><sup>_x_),itisboundedby</sup><sup>_C_(</sup><sup>_t_+(</sup><sup>_l−_1) log</sup><sup>_k_)</sup><sup>_|N_</sup> [min<sup>+</sup> _x∈S d_ ( _x_ ) _,B_ )<sup>(</sup><sup>_U_)</sup><sup>_|_.</sup><sup>_N_3isboundedby</sup> _C_ (log _k_ ) _|N_ [<sup>+</sup> _B_ 0<sup>_′,B_)(</sup><sup>_U_)</sup><sup>_| ≤C_(log</sup><sup>_k_)</sup><sup>_|N_</sup> [min<sup>+</sup> _x∈S d_ ( _x_ ) _,B_ )<sup>(</sup><sup>_U_)</sup><sup>_|_.</sup> Therefore _N ≤ C_ ( _t_ + _l_ log _k_ ) _|N_ [min<sup>+</sup> _x∈S d_ ( _x_ ) _,B_ )<sup>(</sup><sup>_U_)</sup><sup>_|_.</sup> 

## **References** 

- [BCF23] Karl Bringmann, Alejandro Cassis, and Nick Fischer. Negative-Weight Single-Source Shortest Paths in Near-Linear Time: Now Faster! . In _2023 IEEE 64th Annual Symposium on Foundations of Computer Science (FOCS)_ , pages 515–538, Los Alamitos, CA, USA, November 2023. IEEE Computer Society. 

- [Bel58] Richard Bellman. On a routing problem. _Quarterly of Applied Mathematics_ , 16:87–90, 1958. 

- [BFP<sup>+</sup> 73] Manuel Blum, Robert W. Floyd, Vaughan Pratt, Ronald L. Rivest, and Robert E. Tarjan. Time bounds for selection. _Journal of Computer and System Sciences_ , 7(4):448–461, 1973. 

- [BNWN22] Aaron Bernstein, Danupon Nanongkai, and Christian Wulff-Nilsen. Negative-weight singlesource shortest paths in near-linear time. In _2022 IEEE 63rd Annual Symposium on Foundations of Computer Science (FOCS)_ , pages 600–611, 2022. 

- [CKL<sup>+</sup> 22] Li Chen, Rasmus Kyng, Yang P. Liu, Richard Peng, Maximilian Probst Gutenberg, and Sushant Sachdeva. Maximum flow and minimum-cost flow in almost-linear time. In _2022 IEEE 63rd Annual Symposium on Foundations of Computer Science (FOCS)_ , pages 612–623, 2022. 

- [CKT<sup>+</sup> 16] Shiri Chechik, Haim Kaplan, Mikkel Thorup, Or Zamir, and Uri Zwick. Bottleneck paths and trees and deterministic graphical games. In Nicolas Ollinger and Heribert Vollmer, editors, _STACS_ , volume 47 of _LIPIcs_ , pages 27:1–27:13. Schloss Dagstuhl - Leibniz-Zentrum für Informatik, 2016. 

- [DGST88] James R. Driscoll, Harold N. Gabow, Ruth Shrairman, and Robert E. Tarjan. Relaxed heaps: An alternative to Fibonacci heaps with applications to parallel computation. _Commun. ACM_ , 31(11):1343–1354, November 1988. 

- [Dij59] E. W. Dijkstra. A note on two problems in connexion with graphs. _Numerische Mathematik_ , 1:269–271, 1959. 

- [DLWX18] Ran Duan, Kaifeng Lyu, Hongxun Wu, and Yuanhang Xie. Single-source bottleneck path algorithm faster than sorting for sparse graphs. _CoRR_ , abs/1808.10658, 2018. 

15 

- [DMSY23] R. Duan, J. Mao, X. Shu, and L. Yin. A randomized algorithm for single-source shortest path on undirected real-weighted graphs. In _2023 IEEE 64th Annual Symposium on Foundations of Computer Science (FOCS)_ , pages 484–492, Los Alamitos, CA, USA, November 2023. IEEE Computer Society. 

- [Fin24] Jeremy T. Fineman. Single-source shortest paths with negative real weights in _O_<sup>�</sup> ( _mn_<sup>8</sup><sup>_/_9</sup> ) time. In _Proceedings of the 56th Annual ACM Symposium on Theory of Computing_ , STOC 2024, page 3–14, New York, NY, USA, 2024. Association for Computing Machinery. 

- [Fre83] Greg N. Frederickson. Data structures for on-line updating of minimum spanning trees. In _Proceedings of the Fifteenth Annual ACM Symposium on Theory of Computing_ , STOC ’83, page 252–257, New York, NY, USA, 1983. Association for Computing Machinery. 

- [FT87] M. L. Fredman and R. E. Tarjan. Fibonacci heaps and their uses in improved network optimization algorithms. _JACM_ , 34(3):596–615, 1987. 

- [FW93] Michael L. Fredman and Dan E. Willard. Surpassing the information theoretic bound with fusion trees. _Journal of Computer and System Sciences_ , 47(3):424–436, 1993. 

- [FW94] Michael L. Fredman and Dan E. Willard. Trans-dichotomous algorithms for minimum spanning trees and shortest paths. _Journal of Computer and System Sciences_ , 48(3):533–551, 1994. 

- [GS78] Leo J. Guibas and Robert Sedgewick. A dichromatic framework for balanced trees. In _19th Annual Symposium on Foundations of Computer Science (sfcs 1978)_ , pages 8–21, 1978. 

- [GT88] Harold N Gabow and Robert E Tarjan. Algorithms for two bottleneck optimization problems. _Journal of Algorithms_ , 9(3):411–417, 1988. 

- [Hag00] Torben Hagerup. Improved shortest paths on the word RAM. In Ugo Montanari, José D. P. Rolim, and Emo Welzl, editors, _Automata, Languages and Programming_ , pages 61–72, Berlin, Heidelberg, 2000. Springer Berlin Heidelberg. 

- [HHR<sup>+</sup> 24] Bernhard Haeupler, Richard Hladík, Václav Rozhoň, Robert E. Tarjan, and Jakub Tětek. Universal optimality of dijkstra via beyond-worst-case heaps. In _2024 IEEE 65th Annual Symposium on Foundations of Computer Science (FOCS)_ , 2024. 

- [HJQ24] Yufan Huang, Peter Jin, and Kent Quanrud. Faster single-source shortest paths with negative real weights via proper hop distance, 2024. 

- [KKT95] David R. Karger, Philip N. Klein, and Robert E. Tarjan. A randomized linear-time algorithm to find minimum spanning trees. _J. ACM_ , 42(2):321–328, March 1995. 

- [PR05] Seth Pettie and Vijaya Ramachandran. A shortest path algorithm for real-weighted undirected graphs. _SIAM Journal on Computing_ , 34(6):1398–1431, 2005. 

- [Ram96] Rajeev Raman. Priority queues: Small, monotone and trans-dichotomous. In _Proceedings of the Fourth Annual European Symposium on Algorithms_ , ESA ’96, page 121–137, Berlin, Heidelberg, 1996. Springer-Verlag. 

- [Ram97] Rajeev Raman. Recent results on the single-source shortest paths problem. _SIGACT News_ , 28(2):81–87, June 1997. 

- [Tho99] Mikkel Thorup. Undirected single-source shortest paths with positive integer weights in linear time. _J. ACM_ , 46(3):362–394, May 1999. 

16 

- [Tho00a] Mikkel Thorup. Floats, integers, and single source shortest paths. _J. Algorithms_ , 35(2):189–201, May 2000. 

- [Tho00b] Mikkel Thorup. On RAM priority queues. _SIAM Journal on Computing_ , 30(1):86–109, 2000. 

- [Tho04] Mikkel Thorup. Integer priority queues with decrease key in constant time and the single source shortest paths problem. _Journal of Computer and System Sciences_ , 69(3):330–353, 2004. Special Issue on STOC 2003. 

- [Wil64] J. W. J. Williams. Algorithm 232: Heapsort. _Communications of the ACM_ , 7(6):347–348, 1964. 

- [Wil10] Virginia Vassilevska Williams. Nondecreasing paths in a weighted graph or: How to optimally read a train schedule. _ACM Trans. Algorithms_ , 6(4), September 2010. 

- [Yao75] Andrew Chi-Chih Yao. An _O_ ( _|E|_ log log _|V |_ ) algorithm for finding minimum spanning trees. _Information Processing Letters_ , 4(1):21–23, 1975. 

17 

