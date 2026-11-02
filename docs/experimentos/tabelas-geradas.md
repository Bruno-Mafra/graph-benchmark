## Tabelas geradas

Gerado por `scripts/experiments/report.ts` em 2026-11-02. "n/e" = não executado (incompatível ou acima do limite).


### G1 — Escalabilidade (geométrico esparso): tempo por execução (mediana)


| n | Dijkstra | Bellman-Ford | Duan et al. (2025) | Dijkstra até o destino | A* | Dijkstra bidirecional | Floyd-Warshall | Johnson |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 500 | 0,021 ms | 0,053 ms | 3,59 ms | 0,013 ms | 0,019 ms | 0,015 ms | 31,25 ms | 12,74 ms |
| 1.000 | 0,024 ms | 0,128 ms | 4,95 ms | 0,024 ms | 0,021 ms | 0,029 ms | n/e | 54,11 ms |
| 2.000 | 0,046 ms | 0,531 ms | 11,24 ms | 0,045 ms | 0,047 ms | 0,047 ms | n/e | 227 ms |
| 5.000 | 0,239 ms | 1,72 ms | 31,05 ms | 0,242 ms | 0,067 ms | 0,167 ms | n/e | n/e |
| 10.000 | 0,574 ms | 6,37 ms | 59,62 ms | 0,579 ms | 0,521 ms | 0,523 ms | n/e | n/e |
| 20.000 | 1,32 ms | 18,89 ms | 146 ms | 1,36 ms | 1,47 ms | 1,3 ms | n/e | n/e |


### G1 — Vértices expandidos


| n | Dijkstra | Bellman-Ford | Duan et al. (2025) | Dijkstra até o destino | A* | Dijkstra bidirecional | Floyd-Warshall | Johnson |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 500 | 500 | 5.623 | 9.636 | 492 | 298 | 346 | 500 | 250.000 |
| 1.000 | 1.000 | 13.356 | 18.316 | 1.000 | 630 | 748 | n/e | 1.000.000 |
| 2.000 | 2.000 | 43.341 | 37.254 | 2.000 | 1.423 | 1.479 | n/e | 4.000.000 |
| 5.000 | 5.000 | 116.213 | 102.055 | 4.998 | 1.814 | 3.358 | n/e | n/e |
| 10.000 | 10.000 | 430.812 | 191.272 | 9.993 | 5.635 | 7.251 | n/e | n/e |
| 20.000 | 20.000 | 1.288.582 | 401.096 | 20.000 | 13.537 | 15.271 | n/e | n/e |


### G1 — Arcos examinados


| n | Dijkstra | Bellman-Ford | Duan et al. (2025) | Dijkstra até o destino | A* | Dijkstra bidirecional | Floyd-Warshall | Johnson |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 500 | 1.790 | 20.140 | 19.376 | 1.760 | 1.071 | 1.250 | 30.527.000 | 896.790 |
| 1.000 | 3.584 | 47.868 | 36.632 | 3.580 | 2.249 | 2.683 | n/e | 3.587.584 |
| 2.000 | 7.100 | 154.054 | 74.508 | 7.097 | 5.054 | 5.267 | n/e | 14.207.100 |
| 5.000 | 17.822 | 414.227 | 205.102 | 17.813 | 6.419 | 11.976 | n/e | n/e |
| 10.000 | 35.500 | 1.530.358 | 382.544 | 35.472 | 20.016 | 25.744 | n/e | n/e |
| 20.000 | 71.046 | 4.577.572 | 802.192 | 71.043 | 48.072 | 54.227 | n/e | n/e |


Consistência G1: 0 divergência(s) em 40 resultados.


### G2 — Densidade (n = 400): tempo por execução


| grau médio | Dijkstra | Bellman-Ford | Duan et al. (2025) | Dijkstra até o destino | A* | Dijkstra bidirecional | Floyd-Warshall | Johnson |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 | 8,86 µs | 0,014 ms | 2,52 ms | 6,38 µs | 4,28 µs | 0,01 ms | 12,05 ms | 6,01 ms |
| 8 | 0,018 ms | 0,038 ms | 10,8 ms | 3,56 µs | 4,68 µs | 5,42 µs | 48,5 ms | 19,18 ms |
| 32 | 0,052 ms | 0,102 ms | 83,94 ms | 0,02 ms | 0,022 ms | 0,011 ms | 59,93 ms | 35,03 ms |
| 128 | 0,167 ms | 0,271 ms | 540 ms | 0,03 ms | 0,032 ms | 9,02 µs | 60,29 ms | 76,28 ms |
| 399 | 0,467 ms | 0,538 ms | 4.367 ms | 0,128 ms | 0,132 ms | 0,011 ms | 58,93 ms | 188 ms |


### G2 — Arcos examinados


| grau médio | Dijkstra | Bellman-Ford | Duan et al. (2025) | Dijkstra até o destino | A* | Dijkstra bidirecional | Floyd-Warshall | Johnson |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 | 800 | 4.484 | 12.414 | 294 | 294 | 70 | 12.014.800 | 220.108 |
| 8 | 3.200 | 17.595 | 56.014 | 45 | 45 | 23 | 48.352.400 | 1.283.200 |
| 32 | 12.800 | 50.725 | 486.651 | 4.691 | 4.691 | 251 | 61.062.000 | 5.132.800 |
| 128 | 51.200 | 153.349 | 3.236.387 | 8.024 | 8.024 | 267 | 63.476.400 | 20.531.200 |
| 399 | 159.600 | 319.200 | 32.405.296 | 43.491 | 43.491 | 798 | 64.000.000 | 63.999.600 |


### G3-n200 — Dirigido esparso (E ≈ 2V) com pesos negativos sem ciclo negativo, n = 200 (arcos: 400)


| Algoritmo | Status | Tempo (mediana ± dp) | Expansões | Arcos examinados | Relaxações | Dist. destino | Consistência |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | :--- |
| Dijkstra | não executado: Há pesos negativos (mín. -10); o Dijkstra exige pesos ≥ 0. | — | — | — | — | — | — |
| Bellman-Ford | válido | 6,45 µs ± 2,19 µs | 755 | 1.557 | 271 | 12 | referência |
| BFS | não executado: Pesos diferentes (de -10 a 21); BFS só é correto com pesos iguais. | — | — | — | — | — | — |
| Caminho mínimo em DAG | não executado: O grafo tem ciclo dirigido (18 vértices), então não é um DAG. | — | — | — | — | — | — |
| Duan et al. (2025) | não executado: Há pesos negativos (mín. -10); o algoritmo de Duan et al. exige pesos ≥ 0. | — | — | — | — | — | — |
| Dijkstra até o destino | não executado: Há pesos negativos (mín. -10); o Dijkstra exige pesos ≥ 0. | — | — | — | — | — | — |
| A* | não executado: Há pesos negativos (mín. -10); o A* exige pesos ≥ 0. | — | — | — | — | — | — |
| Dijkstra bidirecional | não executado: Há pesos negativos (mín. -10); o Dijkstra bidirecional exige pesos ≥ 0. | — | — | — | — | — | — |
| Floyd-Warshall | válido | 1,29 ms ± 0,017 ms | 200 | 1.167.000 | 41.407 | 12 | ✓ |
| Johnson | válido | 1,52 ms ± 0,1 ms | 25.006 | 49.845 | 26.804 | 12 | ✓ |


### G3-n1000 — Dirigido esparso (E ≈ 2V) com pesos negativos sem ciclo negativo, n = 1000 (arcos: 2.000)


| Algoritmo | Status | Tempo (mediana ± dp) | Expansões | Arcos examinados | Relaxações | Dist. destino | Consistência |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | :--- |
| Dijkstra | não executado: Há pesos negativos (mín. -11); o Dijkstra exige pesos ≥ 0. | — | — | — | — | — | — |
| Bellman-Ford | válido | 0,041 ms ± 0,38 µs | 6.539 | 13.269 | 1.566 | 25 | referência |
| BFS | não executado: Pesos diferentes (de -11 a 22); BFS só é correto com pesos iguais. | — | — | — | — | — | — |
| Caminho mínimo em DAG | não executado: O grafo tem ciclo dirigido (5 vértices), então não é um DAG. | — | — | — | — | — | — |
| Duan et al. (2025) | não executado: Há pesos negativos (mín. -11); o algoritmo de Duan et al. exige pesos ≥ 0. | — | — | — | — | — | — |
| Dijkstra até o destino | não executado: Há pesos negativos (mín. -11); o Dijkstra exige pesos ≥ 0. | — | — | — | — | — | — |
| A* | não executado: Há pesos negativos (mín. -11); o A* exige pesos ≥ 0. | — | — | — | — | — | — |
| Dijkstra bidirecional | não executado: Há pesos negativos (mín. -11); o Dijkstra bidirecional exige pesos ≥ 0. | — | — | — | — | — | — |
| Floyd-Warshall | não executado: 1000 vértices: O(V³) ≈ 1.0 bilhão de passos; limite de 600 vértices. | — | — | — | — | — | — |
| Johnson | válido | 53,24 ms ± 1,93 ms | 699.497 | 1.406.196 | 755.415 | 25 | ✓ |


### G3-n3000 — Dirigido esparso (E ≈ 2V) com pesos negativos sem ciclo negativo, n = 3000 (arcos: 6.000)


| Algoritmo | Status | Tempo (mediana ± dp) | Expansões | Arcos examinados | Relaxações | Dist. destino | Consistência |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | :--- |
| Dijkstra | não executado: Há pesos negativos (mín. -11); o Dijkstra exige pesos ≥ 0. | — | — | — | — | — | — |
| Bellman-Ford | válido | 0,114 ms ± 0,011 ms | 17.950 | 36.267 | 4.767 | 25 | referência |
| BFS | não executado: Pesos diferentes (de -11 a 22); BFS só é correto com pesos iguais. | — | — | — | — | — | — |
| Caminho mínimo em DAG | não executado: O grafo tem ciclo dirigido (6 vértices), então não é um DAG. | — | — | — | — | — | — |
| Duan et al. (2025) | não executado: Há pesos negativos (mín. -11); o algoritmo de Duan et al. exige pesos ≥ 0. | — | — | — | — | — | — |
| Dijkstra até o destino | não executado: Há pesos negativos (mín. -11); o Dijkstra exige pesos ≥ 0. | — | — | — | — | — | — |
| A* | não executado: Há pesos negativos (mín. -11); o A* exige pesos ≥ 0. | — | — | — | — | — | — |
| Dijkstra bidirecional | não executado: Há pesos negativos (mín. -11); o Dijkstra bidirecional exige pesos ≥ 0. | — | — | — | — | — | — |
| Floyd-Warshall | não executado: 3000 vértices: O(V³) ≈ 27.0 bilhão de passos; limite de 600 vértices. | — | — | — | — | — | — |
| Johnson | não executado: 3000 vértices: a matriz V×V excede o limite de 2000 vértices. | — | — | — | — | — | — |


### G4-pos-n20000 — DAG (E ≈ 2V) com pesos 1–10, n = 20000 (arcos: 40.000)


| Algoritmo | Status | Tempo (mediana ± dp) | Expansões | Arcos examinados | Relaxações | Dist. destino | Consistência |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | :--- |
| Dijkstra | válido | 1,73 ms ± 8,22 µs | 20.000 | 40.000 | 20.993 | 21 | referência |
| Bellman-Ford | válido | 2,1 ms ± 0,035 ms | 159.412 | 316.773 | 26.296 | 21 | ✓ |
| BFS | não executado: Pesos diferentes (de 1 a 10); BFS só é correto com pesos iguais. | — | — | — | — | — | — |
| Caminho mínimo em DAG | válido | 0,85 ms ± 1,81 µs | 20.000 | 40.000 | 26.454 | 21 | ✓ |
| Duan et al. (2025) | válido | 118 ms ± 4,77 ms | 337.874 | 584.200 | 84.389 | 21 | ✓ |
| Dijkstra até o destino | válido | 0,151 ms ± 5,58 µs | 2.014 | 5.009 | 4.707 | 21 | ✓ |
| A* | válido | 0,152 ms ± 7,29 µs | 2.014 | 5.009 | 4.707 | 21 | ✓ |
| Dijkstra bidirecional | válido | 0,024 ms ± 0,38 µs | 107 | 451 | 450 | 21 | ✓ |
| Floyd-Warshall | não executado: 20000 vértices: O(V³) ≈ 8000.0 bilhão de passos; limite de 600 vértices. | — | — | — | — | — | — |
| Johnson | não executado: 20000 vértices: a matriz V×V excede o limite de 2000 vértices. | — | — | — | — | — | — |


### G4-neg-n20000 — DAG (E ≈ 2V) com ~30% de pesos negativos, n = 20000 (arcos: 40.000)


| Algoritmo | Status | Tempo (mediana ± dp) | Expansões | Arcos examinados | Relaxações | Dist. destino | Consistência |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | :--- |
| Dijkstra | não executado: Há pesos negativos (mín. -5); o Dijkstra exige pesos ≥ 0. | — | — | — | — | — | — |
| Bellman-Ford | válido | 2,41 ms ± 0,101 ms | 172.374 | 339.323 | 30.821 | -1 | referência |
| BFS | não executado: Pesos diferentes (de -5 a 10); BFS só é correto com pesos iguais. | — | — | — | — | — | — |
| Caminho mínimo em DAG | válido | 0,846 ms ± 4,57 µs | 20.000 | 40.000 | 28.122 | -1 | ✓ |
| Duan et al. (2025) | não executado: Há pesos negativos (mín. -5); o algoritmo de Duan et al. exige pesos ≥ 0. | — | — | — | — | — | — |
| Dijkstra até o destino | não executado: Há pesos negativos (mín. -5); o Dijkstra exige pesos ≥ 0. | — | — | — | — | — | — |
| A* | não executado: Há pesos negativos (mín. -5); o A* exige pesos ≥ 0. | — | — | — | — | — | — |
| Dijkstra bidirecional | não executado: Há pesos negativos (mín. -5); o Dijkstra bidirecional exige pesos ≥ 0. | — | — | — | — | — | — |
| Floyd-Warshall | não executado: 20000 vértices: O(V³) ≈ 8000.0 bilhão de passos; limite de 600 vértices. | — | — | — | — | — | — |
| Johnson | não executado: 20000 vértices: a matriz V×V excede o limite de 2000 vértices. | — | — | — | — | — | — |


### G5-30x30 — Grade 30×30 não direcionada, pesos = 1 (arcos: 3.480)


| Algoritmo | Status | Tempo (mediana ± dp) | Expansões | Arcos examinados | Relaxações | Dist. destino | Consistência |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | :--- |
| Dijkstra | válido | 0,021 ms ± 1,21 µs | 900 | 3.480 | 899 | 58 | referência |
| Bellman-Ford | válido | 0,018 ms ± 1,35 µs | 1.800 | 6.960 | 899 | 58 | ✓ |
| BFS | válido | 0,011 ms ± 0,07 µs | 900 | 3.480 | 899 | 58 | ✓ |
| Caminho mínimo em DAG | não executado: Há arestas não direcionadas: cada uma forma um ciclo (u → v → u), então não é um DAG. | — | — | — | — | — | — |
| Duan et al. (2025) | válido | 4,02 ms ± 0,21 ms | 15.319 | 34.844 | 3.479 | 58 | ✓ |
| Dijkstra até o destino | válido | 0,024 ms ± 1,51 µs | 900 | 3.478 | 899 | 58 | ✓ |
| A* | válido | 0,025 ms ± 1,62 µs | 845 | 3.315 | 899 | 58 | ✓ |
| Dijkstra bidirecional | válido | 0,028 ms ± 2,71 µs | 870 | 3.364 | 928 | 58 | ✓ |
| Floyd-Warshall | não executado: 900 vértices: O(V³) ≈ 0.7 bilhão de passos; limite de 600 vértices. | — | — | — | — | — | — |
| Johnson | válido | 28,19 ms ± 0,082 ms | 810.000 | 3.135.480 | 809.100 | 58 | ✓ |


### G5-100x100 — Grade 100×100 não direcionada, pesos = 1 (arcos: 39.600)


| Algoritmo | Status | Tempo (mediana ± dp) | Expansões | Arcos examinados | Relaxações | Dist. destino | Consistência |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | :--- |
| Dijkstra | válido | 0,299 ms ± 0,013 ms | 10.000 | 39.600 | 9.999 | 198 | referência |
| Bellman-Ford | válido | 0,194 ms ± 0,78 µs | 20.000 | 79.200 | 9.999 | 198 | ✓ |
| BFS | válido | 0,095 ms ± 0,02 ms | 10.000 | 39.600 | 9.999 | 198 | ✓ |
| Caminho mínimo em DAG | não executado: Há arestas não direcionadas: cada uma forma um ciclo (u → v → u), então não é um DAG. | — | — | — | — | — | — |
| Duan et al. (2025) | válido | 47,54 ms ± 4,19 ms | 172.785 | 406.148 | 39.599 | 198 | ✓ |
| Dijkstra até o destino | válido | 0,306 ms ± 7,68 µs | 10.000 | 39.598 | 9.999 | 198 | ✓ |
| A* | válido | 0,508 ms ± 4,1 µs | 9.805 | 39.015 | 9.999 | 198 | ✓ |
| Dijkstra bidirecional | válido | 0,428 ms ± 0,011 ms | 9.900 | 39.204 | 10.098 | 198 | ✓ |
| Floyd-Warshall | não executado: 10000 vértices: O(V³) ≈ 1000.0 bilhão de passos; limite de 600 vértices. | — | — | — | — | — | — |
| Johnson | não executado: 10000 vértices: a matriz V×V excede o limite de 2000 vértices. | — | — | — | — | — | — |


### G7-negcycle-n500 — Dirigido esparso com ciclo negativo 0 → 1 → 2 → 0, n = 500 (arcos: 1.003)


| Algoritmo | Status | Tempo (mediana ± dp) | Expansões | Arcos examinados | Relaxações | Dist. destino | Consistência |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | :--- |
| Dijkstra | não executado: Há pesos negativos (mín. -5); o Dijkstra exige pesos ≥ 0. | — | — | — | — | — | — |
| Bellman-Ford | ciclo negativo | 1,62 ms ± 4,24 µs | 248.646 | 499.922 | 257.414 | — | referência |
| BFS | não executado: Pesos diferentes (de -5 a 10); BFS só é correto com pesos iguais. | — | — | — | — | — | — |
| Caminho mínimo em DAG | não executado: O grafo tem ciclo dirigido (3 vértices), então não é um DAG. | — | — | — | — | — | — |
| Duan et al. (2025) | não executado: Há pesos negativos (mín. -5); o algoritmo de Duan et al. exige pesos ≥ 0. | — | — | — | — | — | — |
| Dijkstra até o destino | não executado: Há pesos negativos (mín. -5); o Dijkstra exige pesos ≥ 0. | — | — | — | — | — | — |
| A* | não executado: Há pesos negativos (mín. -5); o A* exige pesos ≥ 0. | — | — | — | — | — | — |
| Dijkstra bidirecional | não executado: Há pesos negativos (mín. -5); o Dijkstra bidirecional exige pesos ≥ 0. | — | — | — | — | — | — |
| Floyd-Warshall | ciclo negativo | 24,72 ms ± 0,288 ms | 500 | 26.193.000 | 520.222 | — | ✓ |
| Johnson | não executado: Johnson exige ausência de ciclo negativo (ciclo negativo detectado: 3 vértices). | — | — | — | — | — | — |


### G8-disconnected-n10000 — Duas componentes dirigidas (5.000 + 5.000), origem na primeira (arcos: 20.000)


| Algoritmo | Status | Tempo (mediana ± dp) | Expansões | Arcos examinados | Relaxações | Dist. destino | Consistência |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | :--- |
| Dijkstra | válido | 0,384 ms ± 3,02 µs | 5.000 | 10.000 | 5.390 | — | referência |
| Bellman-Ford | válido | 0,336 ms ± 2,88 µs | 33.565 | 67.952 | 7.798 | — | ✓ |
| BFS | não executado: Pesos diferentes (de 1 a 10); BFS só é correto com pesos iguais. | — | — | — | — | — | — |
| Caminho mínimo em DAG | não executado: O grafo tem ciclo dirigido (82 vértices), então não é um DAG. | — | — | — | — | — | — |
| Duan et al. (2025) | válido | 38,69 ms ± 0,248 ms | 101.467 | 157.861 | 21.511 | — | ✓ |
| Dijkstra até o destino | válido | 0,388 ms ± 0,023 ms | 5.000 | 10.000 | 5.390 | — | — |
| A* | válido | 0,398 ms ± 0,017 ms | 5.000 | 10.000 | 5.390 | — | — |
| Dijkstra bidirecional | válido | 0,68 ms ± 3,5 µs | 7.838 | 15.647 | 8.657 | — | — |
| Floyd-Warshall | não executado: 10000 vértices: O(V³) ≈ 1000.0 bilhão de passos; limite de 600 vértices. | — | — | — | — | — | — |
| Johnson | não executado: 10000 vértices: a matriz V×V excede o limite de 2000 vértices. | — | — | — | — | — | — |


### G4 — DAG: tempo por execução vs. n


| n (pesos ≥ 1) | Dijkstra | Bellman-Ford | Caminho mínimo em DAG | Duan et al. (2025) | Dijkstra até o destino | A* | Dijkstra bidirecional | Johnson |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1.000 | 0,025 ms | 0,034 ms | 0,031 ms | 6,28 ms | 0,012 ms | 0,014 ms | 0,011 ms | 2,61 ms |
| 5.000 | 0,369 ms | 0,292 ms | 0,095 ms | 27,29 ms | 0,168 ms | 0,169 ms | 0,032 ms | n/e |
| 20.000 | 1,73 ms | 2,1 ms | 0,85 ms | 118 ms | 0,151 ms | 0,152 ms | 0,024 ms | n/e |

| n (com negativos) | Bellman-Ford | Caminho mínimo em DAG | Johnson |
| :--- | ---: | ---: | ---: |
| 1.000 | 0,039 ms | 0,017 ms | 2,58 ms |
| 5.000 | 0,409 ms | 0,093 ms | n/e |
| 20.000 | 2,41 ms | 0,846 ms | n/e |


### G6 — Todos os pares: tempo por execução


| n (esparso) | Dijkstra | Floyd-Warshall | Johnson |
| :--- | ---: | ---: | ---: |
| 100 | 2,89 µs | 0,374 ms | 0,432 ms |
| 200 | 0,015 ms | 2,93 ms | 2 ms |
| 400 | 0,01 ms | 16,23 ms | 8,54 ms |
| 600 | 0,015 ms | 53,08 ms | 19,61 ms |

| n (denso, grau ≈ n/2) | Dijkstra | Floyd-Warshall | Johnson |
| :--- | ---: | ---: | ---: |
| 100 | 0,019 ms | 1,2 ms | 2,45 ms |
| 200 | 0,067 ms | 8,77 ms | 15,55 ms |
| 400 | 0,256 ms | 60,21 ms | 107 ms |
| 600 | 0,569 ms | 206 ms | 346 ms |


(Dijkstra = uma única origem, para referência de escala; não resolve todos os pares.)


### G9 — Efeito da numeração dos vértices


| Cenário | Algoritmo | Tempo (mediana) | Rodadas (BF) | Expansões | Arcos examinados |
| :--- | :--- | ---: | ---: | ---: | ---: |
| DAG n = 20.000 (E ≈ 2V), rótulos ordenado | Dijkstra | 1,72 ms | — | 20.000 | 40.000 |
| DAG n = 20.000 (E ≈ 2V), rótulos embaralhado | Dijkstra | 1,72 ms | — | 20.000 | 40.000 |
| Grade 100×100, pesos 1–10, origem no índice 0 | Dijkstra | 0,731 ms | — | 10.000 | 39.600 |
| Grade 100×100, pesos 1–10, origem no último índice | Dijkstra | 0,751 ms | — | 10.000 | 39.600 |
| DAG n = 20.000 (E ≈ 2V), rótulos ordenado | Bellman-Ford | 0,512 ms | 2 | 40.000 | 80.000 |
| DAG n = 20.000 (E ≈ 2V), rótulos embaralhado | Bellman-Ford | 1,94 ms | 11 | 158.436 | 314.013 |
| Grade 100×100, pesos 1–10, origem no índice 0 | Bellman-Ford | 2,32 ms | 20 | 200.000 | 792.000 |
| Grade 100×100, pesos 1–10, origem no último índice | Bellman-Ford | 9,86 ms | 200 | 1.010.000 | 3.999.600 |
| DAG n = 20.000 (E ≈ 2V), rótulos ordenado | Caminho mínimo em DAG | 0,857 ms | — | 20.000 | 40.000 |
| DAG n = 20.000 (E ≈ 2V), rótulos embaralhado | Caminho mínimo em DAG | 0,86 ms | — | 20.000 | 40.000 |


### M1 — Tamanho do labirinto: tempo por execução (ACO/GA: média de 10 execuções)


| N | Dijkstra | BFS | BFS bi | A* | Greedy | ACO | GA |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 21 | 0,011 ms | 5,94 µs | 7,42 µs | 0,015 ms | 0,011 ms | 2,54 ms | 3,35 ms |
| 51 | 0,054 ms | 0,031 ms | 0,057 ms | 0,096 ms | 0,023 ms | 8,57 ms | 11,42 ms |
| 101 | 0,301 ms | 0,208 ms | 0,093 ms | 0,447 ms | 0,057 ms | 22,78 ms | 59,16 ms |
| 201 | 1,42 ms | 0,572 ms | 0,502 ms | 2,41 ms | 0,153 ms | 89,05 ms | 234 ms |
| 401 | 6,24 ms | 2,37 ms | 2,21 ms | 10,27 ms | 0,214 ms | n/e | n/e |
| 801 | 30,34 ms | 10,05 ms | 8,95 ms | 51,98 ms | 0,536 ms | n/e | n/e |


### M1 — Vértices expandidos (ACO/GA: média)


| N | Dijkstra | BFS | BFS bi | A* | Greedy | ACO | GA |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 21 | 259 | 259 | 198 | 186 | 70 | 43.292 | 26.385 |
| 51 | 1.429 | 1.429 | 1.120 | 1.180 | 262 | 140.915 | 103.209 |
| 101 | 5.510 | 5.510 | 4.024 | 4.430 | 653 | 363.503 | 585.359 |
| 201 | 21.694 | 21.693 | 15.801 | 20.778 | 983 | 1.421.919 | 2.542.071 |
| 401 | 85.664 | 85.664 | 65.947 | 78.286 | 1.892 | n/e | n/e |
| 801 | 341.513 | 341.513 | 262.250 | 308.388 | 3.809 | n/e | n/e |


### M1 — Gap do custo em relação ao Dijkstra (ACO/GA: melhor | média)


| N | Dijkstra | BFS | BFS bi | A* | Greedy | ACO | GA |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 21 | 0% | 0% | 0% | 0% | +4,2% | 0% \| +2,1% | 0% \| +3,3% |
| 51 | 0% | 0% | 0% | 0% | +18,7% | 0% \| +0,3% | 0% \| 0% |
| 101 | 0% | 0% | 0% | 0% | +25% | +2,1% \| +5,6% | 0% \| +2,2% |
| 201 | 0% | 0% | 0% | 0% | +27,5% | +26% \| +40,9% | +9,7% \| +17,3% |
| 401 | 0% | 0% | 0% | 0% | +32% | n/e | n/e |
| 801 | 0% | 0% | 0% | 0% | +37% | n/e | n/e |


### M2 — Estrutura dos obstáculos (101×101): custo, gap, expansões e tempo


| Estrutura | Algoritmo | Custo | Gap | Expansões | Tempo |
| :--- | :--- | ---: | ---: | ---: | ---: |
| Grid aberto (sem obstáculos) | Dijkstra | 200 | 0% | 10.201 | 0,552 ms |
| Grid aberto (sem obstáculos) | BFS | 200 | 0% | 10.201 | 0,192 ms |
| Grid aberto (sem obstáculos) | BFS bidirecional | 200 | 0% | 10.100 | 0,216 ms |
| Grid aberto (sem obstáculos) | A* | 200 | 0% | 201 | 0,055 ms |
| Grid aberto (sem obstáculos) | Greedy Best-First | 200 | 0% | 201 | 0,048 ms |
| Grid aberto (sem obstáculos) | Colônia de Formigas (ACO) | 200 | 0% (média +1,2%) | 355.314 | 23,2 ms |
| Grid aberto (sem obstáculos) | Algoritmo Genético (GA) | 200 | 0% (média 0%) | 347.254 | 37,51 ms |
| Obstáculos aleatórios 25% | Dijkstra | 200 | 0% | 7.481 | 0,555 ms |
| Obstáculos aleatórios 25% | BFS | 200 | 0% | 7.481 | 0,167 ms |
| Obstáculos aleatórios 25% | BFS bidirecional | 200 | 0% | 6.336 | 0,156 ms |
| Obstáculos aleatórios 25% | A* | 200 | 0% | 520 | 0,076 ms |
| Obstáculos aleatórios 25% | Greedy Best-First | 228 | +14% | 280 | 0,039 ms |
| Obstáculos aleatórios 25% | Colônia de Formigas (ACO) | 206 | +3% (média +6,1%) | 343.805 | 24,84 ms |
| Obstáculos aleatórios 25% | Algoritmo Genético (GA) | 202 | +1% (média +2,3%) | 529.325 | 61,31 ms |
| Obstáculos aleatórios 40% | Dijkstra | 288 | 0% | 3.729 | 0,201 ms |
| Obstáculos aleatórios 40% | BFS | 288 | 0% | 3.722 | 0,081 ms |
| Obstáculos aleatórios 40% | BFS bidirecional | 288 | 0% | 2.701 | 0,062 ms |
| Obstáculos aleatórios 40% | A* | 288 | 0% | 2.607 | 0,255 ms |
| Obstáculos aleatórios 40% | Greedy Best-First | 328 | +13,9% | 600 | 0,057 ms |
| Obstáculos aleatórios 40% | Colônia de Formigas (ACO) | 296 | +2,8% (média +5,4%) | 281.740 | 20,09 ms |
| Obstáculos aleatórios 40% | Algoritmo Genético (GA) | 288 | 0% (média +0,4%) | 362.627 | 44,99 ms |
| Labirinto perfeito (braid 0) | Dijkstra | 2.628 | 0% | 5.201 | 0,179 ms |
| Labirinto perfeito (braid 0) | BFS | 2.628 | 0% | 5.201 | 0,128 ms |
| Labirinto perfeito (braid 0) | BFS bidirecional | 2.628 | 0% | 4.980 | 0,136 ms |
| Labirinto perfeito (braid 0) | A* | 2.628 | 0% | 5.191 | 0,352 ms |
| Labirinto perfeito (braid 0) | Greedy Best-First | 2.628 | 0% | 4.273 | 0,255 ms |
| Labirinto perfeito (braid 0) | Colônia de Formigas (ACO) | 2.628 | 0% (média 0%) | 1.664.955 | 94,41 ms |
| Labirinto perfeito (braid 0) | Algoritmo Genético (GA) | 2.628 | 0% (média 0%) | 636.556 | 96,74 ms |
| Labirinto braid 0,08 | Dijkstra | 312 | 0% | 5.517 | 0,294 ms |
| Labirinto braid 0,08 | BFS | 312 | 0% | 5.517 | 0,124 ms |
| Labirinto braid 0,08 | BFS bidirecional | 312 | 0% | 3.307 | 0,076 ms |
| Labirinto braid 0,08 | A* | 312 | 0% | 5.150 | 0,56 ms |
| Labirinto braid 0,08 | Greedy Best-First | 432 | +38,5% | 1.678 | 0,12 ms |
| Labirinto braid 0,08 | Colônia de Formigas (ACO) | 328 | +5,1% (média +10,2%) | 442.826 | 27,6 ms |
| Labirinto braid 0,08 | Algoritmo Genético (GA) | 316 | +1,3% (média +9,5%) | 768.697 | 80,52 ms |
| Labirinto braid 0,30 | Dijkstra | 200 | 0% | 6.388 | 0,423 ms |
| Labirinto braid 0,30 | BFS | 200 | 0% | 6.387 | 0,152 ms |
| Labirinto braid 0,30 | BFS bidirecional | 200 | 0% | 5.243 | 0,125 ms |
| Labirinto braid 0,30 | A* | 200 | 0% | 2.032 | 0,249 ms |
| Labirinto braid 0,30 | Greedy Best-First | 218 | +9% | 244 | 0,025 ms |
| Labirinto braid 0,30 | Colônia de Formigas (ACO) | 216 | +8% (média +12,4%) | 341.201 | 23,73 ms |
| Labirinto braid 0,30 | Algoritmo Genético (GA) | 200 | 0% (média +3,1%) | 538.254 | 63,68 ms |
| Armadilha em U (grid aberto) | Dijkstra | 142 | 0% | 9.973 | 0,701 ms |
| Armadilha em U (grid aberto) | BFS | 142 | 0% | 9.960 | 0,19 ms |
| Armadilha em U (grid aberto) | BFS bidirecional | 142 | 0% | 7.670 | 0,169 ms |
| Armadilha em U (grid aberto) | A* | 142 | 0% | 3.583 | 0,408 ms |
| Armadilha em U (grid aberto) | Greedy Best-First | 202 | +42,3% | 2.823 | 0,224 ms |
| Armadilha em U (grid aberto) | Colônia de Formigas (ACO) | 142 | 0% (média +2,5%) | 371.681 | 23,9 ms |
| Armadilha em U (grid aberto) | Algoritmo Genético (GA) | 142 | 0% (média +0,8%) | 501.272 | 50,37 ms |


### M3 — Distância início–destino (201×201, 25% obstáculos): vértices expandidos


| distância (passos) | Dijkstra | BFS | BFS bi | A* | Greedy |
| :--- | ---: | ---: | ---: | ---: | ---: |
| 25 | 673 | 620 | 282 | 36 | 28 |
| 50 | 3.028 | 3.038 | 1.355 | 113 | 71 |
| 100 | 13.096 | 12.968 | 5.102 | 460 | 115 |
| 200 | 30.141 | 30.136 | 10.274 | 1.396 | 388 |


### M3 — Tempo por execução


| distância (passos) | Dijkstra | BFS | BFS bi | A* | Greedy |
| :--- | ---: | ---: | ---: | ---: | ---: |
| 25 | 0,052 ms | 0,017 ms | 0,022 ms | 0,021 ms | 8,74 µs |
| 50 | 0,21 ms | 0,062 ms | 0,043 ms | 0,047 ms | 0,013 ms |
| 100 | 1,2 ms | 0,326 ms | 0,128 ms | 0,065 ms | 0,021 ms |
| 200 | 2,69 ms | 0,797 ms | 0,288 ms | 0,244 ms | 0,037 ms |


### M4 — Algoritmos estocásticos: 10 execuções (sementes 1–10)


| Instância | Algoritmo | Variante | Sucesso | Custo ótimo | Melhor custo (gap) | Custo médio ± dp (gap) | Tempo médio ± dp | Expansões (média) |
| :--- | :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| Labirinto 41×41 (braid 0,08) | ACO | padrão | 10/10 | 102 | 102 (0%) | 102 ± 0 (0%) | 6,32 ms ± 0,225 ms | 98.661 |
| Labirinto 101×101 (braid 0,08) | ACO | padrão | 10/10 | 258 | 282 (+9,3%) | 306,8 ± 11,7 (+18,9%) | 25,09 ms ± 0,802 ms | 402.134 |
| Labirinto 101×101 (braid 0,08) | ACO | iterações = 100 | 10/10 | 258 | 274 (+6,2%) | 294 ± 14,7 (+14%) | 61,78 ms ± 2,09 ms | 952.516 |
| Labirinto 101×101 (braid 0,08) | ACO | formigas = 60 | 10/10 | 258 | 284 (+10,1%) | 298,4 ± 9,4 (+15,7%) | 72,6 ms ± 5,12 ms | 1.158.462 |
| Grid 51×51 com 25% de obstáculos | ACO | padrão | 10/10 | 100 | 100 (0%) | 101,8 ± 1,8 (+1,8%) | 7,75 ms ± 0,254 ms | 103.561 |
| Labirinto 41×41 (braid 0,08) | GA | padrão | 10/10 | 102 | 102 (0%) | 102,4 ± 0,8 (+0,4%) | 8,99 ms ± 1,61 ms | 75.526 |
| Labirinto 101×101 (braid 0,08) | GA | padrão | 10/10 | 258 | 258 (0%) | 267,2 ± 4,9 (+3,6%) | 72,27 ms ± 11,94 ms | 730.315 |
| Labirinto 101×101 (braid 0,08) | GA | gerações = 300, sem estagnação | 10/10 | 258 | 258 (0%) | 262,6 ± 2,7 (+1,8%) | 304 ms ± 12,5 ms | 2.966.078 |
| Labirinto 101×101 (braid 0,08) | GA | população = 90 | 10/10 | 258 | 258 (0%) | 264,8 ± 5,8 (+2,6%) | 190 ms ± 35,59 ms | 1.858.291 |
| Grid 51×51 com 25% de obstáculos | GA | padrão | 10/10 | 100 | 100 (0%) | 100,2 ± 0,6 (+0,2%) | 13,01 ms ± 2,4 ms | 101.873 |


### Ambiente

| Item | Valor |
| :--- | :--- |
| date | 2026-11-02T18:30:31.395Z |
| node | v22.13.1 |
| cpu | AMD Ryzen 7 9800X3D 8-Core Processor |
| cores | 16 |
| platform | linux 6.6.87.2-microsoft-standard-WSL2 |
| memoryGB | 15 |
