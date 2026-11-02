# Integração ao Graph Benchmark (versão experimental)

Este documento descreve a cópia adaptada de [`algorithm.ts`](./algorithm.ts) usada no
benchmark de grafos, as mudanças feitas nela e por que ela continua bem mais lenta
que o Dijkstra. **Os arquivos desta pasta não foram alterados**; a cópia fica em
[`src/graph/algorithms/duanSssp.ts`](../src/graph/algorithms/duanSssp.ts).

No benchmark ela aparece como **"Duan et al. (2025)"**, no grupo *Origem única*,
marcada como **experimental** e desmarcada por padrão. Requisitos: pesos ≥ 0 e até
20.000 vértices.

---

## 1. Mudanças na cópia

### 1.1 Alargamento do intervalo `K` restrito a vértices que melhoraram (principal)

A decisão #3 do [`IMPLEMENTATION.md`](./IMPLEMENTATION.md) alarga o intervalo de
`K` (Algoritmo 3, linhas 19–20) de `[Bi′, Bi)` para "qualquer valor `< Bi`", para
não descartar vértices que ainda não foram expandidos.

No código original, porém, o alargamento vale para **todo** arco que passa no teste
`≤` (Remark 3.4), inclusive o caso de igualdade — o "mesmo caminho"
(`u == Pred[v]`). Assim, vértices **já completos, cujo caminho não mudou**, são
reinseridos em `K` sempre que o predecessor é reexpandido num nível superior. Eles
são processados de novo, reinserem os próprios filhos, e o efeito se propaga em
cascata.

Medição num grafo geométrico com 1.000 vértices (3.546 vértices no grafo
transformado):

| | Expansões | Chamadas BMSSP | Tempo (sem aquecimento) |
|---|---:|---:|---:|
| Original | 1.661.625 (~470 por vértice) | 270.707 | 512 ms |
| Cópia ajustada | 17.761 (~5 por vértice) | 3.005 | 24 ms |

Na cópia, um valor `< Bi` só vai para `K` se:

- estiver em `[Bi′, Bi)`, exatamente como no artigo; **ou**
- o vértice **acabou de melhorar** neste relaxamento (`relaxIfBetter` agora retorna
  se houve melhora). É o único caso que a justificativa da decisão #3 exige: um
  vértice recém-melhorado ainda não foi expandido e não pode ser descartado.

O ganho foi de **~20–25×** (5.000 vértices: 1.113 → 57 ms).

### 1.2 Estrutura de ordenação parcial (Lemma 3.3)

- **Remoção preguiçosa.** `keyValue` passa a ser a fonte da verdade: um item só é
  válido se `keyValue.get(key) === item.value` (mesmo objeto). Itens obsoletos são
  descartados quando o bloco é visitado. Antes, cada remoção fazia uma busca linear
  por todos os blocos, o que tornava a estrutura quadrática.
- **Insert** localiza o bloco de `D1` por busca binária nos limites superiores (antes
  era `findIndex` linear).
- **Pull** reúne blocos **inteiros** do início de `D0` e `D1` até ter ≥ M itens, como
  no artigo. A versão original parava em exatamente M itens, possivelmente no meio
  de um bloco; como os itens dentro de um bloco não são ordenados, podia deixar de
  fora itens menores.
- **Novo limite do Pull** calculado olhando só o bloco seguinte de cada sequência,
  em vez de varrer a estrutura inteira a cada chamada.

### 1.3 Árvore de predecessores em O(V + E)

O original, para cada vértice, varria todos os arcos do grafo até achar um
predecessor válido: O(V·E). A cópia faz uma BFS a partir da origem só pelos arcos
"justos" (`dist[u] + w = dist[v]`). Todo caminho mínimo usa apenas arcos justos,
então a BFS alcança todos os vértices; por ser BFS, não forma ciclos mesmo com pesos
zero.

### 1.4 Instrumentação e interface

- `DuanStats` conta:
  - `expansions`: portas cujos arcos de saída foram percorridos, em FindPivots,
    BaseCase e BMSSP; uma porta pode ser expandida mais de uma vez;
  - `edgeScans` e `relaxations`;
  - `transformedVertices` e `transformedArcs`;
  - `recursionCalls` e `pulls`.

  Todas as contagens são sobre o grafo **transformado** (grau ≤ 2).
- `ssspOnGraph(graph, source)` aceita a lista de adjacência e devolve as distâncias,
  os predecessores e as estatísticas. `sssp()` e `distances()` mantêm a assinatura
  original.

---

## 2. Validação

- **Contra a versão original desta pasta:** 4.000 grafos aleatórios (2–91 vértices,
  até 30–60% de pesos zero, pesos inteiros e reais), nenhuma divergência de
  distância. A versão original, por sua vez, é validada contra Dijkstra por
  [`validate.ts`](./validate.ts) e [`stress.ts`](./stress.ts).
- **No projeto** ([`src/graph/graph.test.ts`](../src/graph/graph.test.ts)):
  - comparação com um Bellman-Ford ingênuo e independente em todos os tipos de grafo
    usados nos testes, incluindo a reconstrução do caminho de cada vértice;
  - um teste específico com ciclos de peso 0;
  - um teste que falha se as expansões por vértice voltarem a crescer.
- **No próprio benchmark:** a verificação de consistência compara as distâncias com
  as do Dijkstra a cada execução.

A corretude continua sendo **empírica** (teste diferencial), não provada. O
alargamento restrito de `K` ainda é uma divergência do pseudocódigo do artigo.

---

## 3. Por que continua lento (e o que faltaria)

Mesmo após os ajustes, ele leva ~57 ms em 5.000 vértices, contra ~1,3 ms do Dijkstra
do benchmark (medição sem aquecimento). Motivos, do mais ao menos relevante:

1. **Alocação e estruturas genéricas.** Cada valor ⟨distância, saltos, vértice⟩ é um
   objeto criado a cada comparação (`valOf`, `candidateVal`), e o estado usa
   `Map`/`Set`/arrays de objetos. O Dijkstra do benchmark usa apenas arrays tipados e
   uma heap binária sem alocação.
   → *Faltaria:* representar distâncias, saltos e predecessores em `Float64Array` e
   `Int32Array`, comparar valores sem criar objetos e trocar `Map`/`Set` por arrays
   indexados com marcação por época.

2. **Ordenação no lugar de seleção linear.** A divisão de blocos, o BatchPrepend e o
   Pull ordenam por comparação (O(M log M)), em vez da seleção de mediana em tempo
   linear de [BFP+73]. Isso reintroduz um fator log que o artigo elimina.
   → *Faltaria:* seleção em tempo linear (mediana das medianas ou introselect).

3. **Lemma 3.3 sem as garantias amortizadas.** `D1` é um array em que blocos são
   inseridos e removidos com `splice` (O(nº de blocos)), e `D0` cresce com `unshift`.
   → *Faltaria:* blocos encadeados e uma árvore de busca balanceada sobre os limites
   superiores de `D1`, como descrito no artigo.

4. **Transformação explícita para grau constante.** Cria uma "porta" por vizinho
   (o grafo transformado tem tantos vértices quanto arcos) e ciclos de peso 0 que
   obrigam a comparar pela ordem total de 3 campos. Em grafos esparsos de grau
   baixo, isso só adiciona trabalho.
   → *Faltaria:* fazer a transformação de forma implícita (sem materializar o novo
   grafo) ou aplicá-la só a vértices de grau alto.

5. **Recursão e FindPivots.** Cada nível faz `k` rodadas de relaxamento estilo
   Bellman-Ford e cria `Set`s temporários. As constantes por vértice são muito
   maiores que as de um push/pop na heap.
   → *Faltaria:* buffers pré-alocados reutilizados entre chamadas e recursão
   convertida em iteração com pilha explícita.

6. **A vantagem é só assintótica.** O artigo troca o fator `log n` do Dijkstra por
   `log^{2/3} n`: em base 2, ≈ 13,3 vs. 5,6 em n = 10⁴ (≈ 2,4×) e ≈ 19,9 vs. 7,3 em
   n = 10⁶ (≈ 2,7×). Isso vale **antes** das constantes. Num navegador, com grafos de
   até dezenas de milhares de vértices, o fator ganho é pequeno demais para compensar
   os custos acima.
   → **Mesmo com os itens 1–5 resolvidos, não há expectativa de vencer o Dijkstra
   nesses tamanhos.** O interesse no benchmark é comparar teoria e prática:
   contagens de trabalho, crescimento na curva log-log e o custo real das
   constantes.
