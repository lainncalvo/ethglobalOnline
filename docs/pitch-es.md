# Remate — pitch institucional (post red-team)

Nombre de trabajo. ETHOnline 2026. Testnet. Dos builders: Laín Calvo · Axel Geslin (Argentina).
Comprador hipotético: un operador ATS / Hashgraph que quiere un protocolo de salida para *holds* sin cotización. No un banco que reemplaza a MarketAxess.

Este documento es el texto para hablar. No es un deck de TAM. No es un forecast.

---

## 1. Cómo leer este pitch

La versión anterior vendía un mercado secundario que faltaba, con un 89 % de iliquidez, “issuance is solved” y una pirámide de TAM. Eso no sobrevive diligencia. Esta versión nombra a Asseto en la primera frase, usa el paper del BCE como evidencia de mercado naciente —no como censo de “bonos que nunca se transaron”— y vende un protocolo más feo que un RFQ: útil cuando no hay quote. Si un número no tiene definición, N y fecha, no se dice.

---

## 2. Hook de 20 segundos (video + jueces)

Asseto —Hashgraph / ioBuilders, 3 de junio de 2026— ya da order book, RFQ, bilateral y DvP atómico en Hedera o HashSphere. Remate no es esa venue. Es una subasta de salida a primer precio, iniciada por el tenedor, sobre un *hold* ATS que no tiene cotización viva ni dealer cubriendo el nombre: reserva sellada, efectivo en USDC sobre Arc, award en un workflow confidencial de Chainlink CRE, *compliance* que impone el token. Peor descubrimiento de precio que un RFQ. Útil cuando no hay quote.

*(Veinte segundos. Corta. No 89 %. No “issuance is solved”. No TEE de hardware.)*

---

## 3. Problema real (sin inflar)

**Una línea AFME, 2025 FY.** La emisión de renta fija en DLT fue €4,8 mil millones (+48 % vs €3,25 mil millones); €4,71 mil millones en bonos; 78 % Asia; Europa €893 millones; corporativos 10,4 %. Contra ~€23 billones de emisión anual tradicional de renta fija. Eso es el tamaño del experimento —no el de Remate.

**El BCE, usado bien.** Born et al., abril 2026: dataset armado a mano de 183 bonos tokenizados *relevantes para la UE*. La regresión de liquidez usa N=20 tokenizados *con bid-ask* y 75 convencionales; donde hay quotes, el bid-ask es −0,05 pp / −27 % vs el control. En emisión, spread de yield −0,14 pp (N=23). No encuentran reducción de costo de underwriting. El mercado sigue naciente; el secundario DLT, limitado.

Lo que eso permite decir: donde ya hay quote, el papel tokenizado no parece peor —y a veces cotiza más apretado. Lo que **no** permite decir: “solo 20 de 183 se transaron” ni “el 89 % no tiene salida usable”. Los 20 son la muestra de la regresión de liquidez *con bid-ask*, no el censo de todo lo que alguna vez negoció.

El hueco que sí existe, y que el paper no contradice: un tenedor de un *hold* ATS sobre un nombre **sin** quote viva y **sin** dealer. Asseto cubre el caso con libro / RFQ / bilateral. Remate cubre el caso en el que no hay contraparte haciendo precio. Peor microstructure. Distinto protocolo.

Tesoros tokenizados (AFME ~USD 9 mil millones en 2025; CoinGecko ~USD 13 mil millones en T1 2026) tienen redención (BUIDL, USYC). No es el problema de Remate. El stock de RWA distribuido ex-stables —RWA.xyz ~USD 39 mil millones, septiembre 2026; CoinGecko USD 19,3 mil millones, T1 2026— sirve para *sacar* Treasuries y fondos de la cuña, no para sumarlos. McKinsey (~USD 2 billones base / USD 1–4 billones de activos tokenizados ex-stables a 2030) es telón de la industria. No es TAM de Remate.

---

## 4. Qué es Remate / qué no es

**Qué es.** Un tenedor de un bono emitido con Hedera Asset Tokenization Studio abre una subasta de salida. Crea un *hold* ATS con `ExitAuction` como escrow: los bonos no salen de su wallet y siguen devengando cupón. Compromete una reserva sellada (`keccak256(reserva, salt)` on-chain; el plaintext no se publica). Inversores KYC’d pujan USDC en `BidEscrow` sobre Circle Arc. Al cierre, un workflow confidencial de Chainlink CRE (`handlerInTee`) lee la reserva, corre un screen de *compliance* y calcula el award a primer precio: gana la puja elegible más alta ≥ reserva; paga su propia puja. El operador ejecuta el *hold* en Hedera; el token corre whitelist + KYC en `executeHoldByPartition`. Recién entonces se libera USDC al vendedor. Los perdedores retiran.

**Qué no es.**

- No es “el mercado secundario que le faltaba a todos los bonos tokenizados”.
- No es order book, ni RFQ, ni matching continuo, ni dual-listing.
- No es DvP atómico. Liquidación coordinada en dos cadenas. El operador puede *grief* (stall / void); no puede robar ni entregar a una wallet no *compliant*.
- No es un TEE de hardware. `handlerInTee` simulado con CRE CLI; Confidential Workflows en beta privada. El simulador no es un enclave de hardware. No se afirma lo contrario.
- No es una ON listada en CNV. El ticker de demo, “ON Serie I 2027”, es un fixture de testnet.
- No es GTM, ni licencia, ni run-rate. Dos builders, hackathon, testnet. Nombre de trabajo.

**Anti-claims (no se dicen, ni en broma):**

- “~89 % de 183 bonos no tienen salida usable.”
- “Issuance is solved.”
- “McKinsey: USD 1 billón en bonos tokenizados a 2030.”
- BCG USD 88 billones como ancla.
- Mezclar USD 120 billones de bonos + USD 39 mil millones de RWA + USD 9 mil millones de Treasuries + USD 300 mil millones de stables como un solo SAM.
- “10 % × 1× × 10 bps → €480k.”
- “5–20 bps, take-rate típico de digital capital markets.”
- “ATS no tiene secundario” sin nombrar Asseto.
- “Award in TEE” como hardware.
- ON argentinas USD 16 mil millones como SOM, o “los tenedores necesitan USDC en Arc.”
- “Quien resuelva el secundario *compliant* captura billones en fees.”
- Stables USD 300 mil millones como mercado addressable.

---

## 5. Wedge vs Asseto / RFQ / dual-listing

Asseto existe. Se nombra primero. El 3 de junio de 2026, Hashgraph e ioBuilders anunciaron order book, RFQ, bilateral y DvP atómico, en Hedera o HashSphere. Eso es venue. Remate no compite por el mismo *fill*.

| Si el nombre… | El protocolo correcto |
|---|---|
| tiene libro o dealer haciendo RFQ | Asseto / RFQ / bilateral. Mejor precio. No usen Remate. |
| está dual-listed en un venue tradicional | el venue tradicional. Remate no es MarketAxess. |
| es Treasury tokenizado con redención | el emisor (BUIDL, USYC). No es nuestro problema. |
| es un *hold* ATS sin quote viva y sin dealer | Remate: subasta de salida a primer precio, reserva sellada, cash en Arc, *compliance* en el token. |

La microestructura es deliberadamente peor. Bids públicos (solo la reserva está sellada). Primer precio, no Vickrey. Sin oráculo de NAV. Sin matching continuo. Un tenedor que *puede* llamar a un dealer no debería usar esto. Un tenedor que *no puede* —nombre chico, lote impar, ventana fuera de *desk*, operador ATS que no quiere sentar libro vacío— tiene un protocolo que no finge ser un mercado.

El comprador no es un banco de deuda. Es el operador ATS / Hashgraph que necesita una salida para *holds* sin cotización, sin pretender que el libro de Asseto está lleno.

---

## 6. Cinco slides listos para pegar

### Slide 1 — Remate, no el secundario

**Título:** Una subasta de salida para un *hold* ATS sin quote.

- Asseto (3 jun 2026) ya es la venue: libro, RFQ, bilateral, DvP atómico. Hedera o HashSphere.
- Remate es otro protocolo: tenedor inicia, primer precio, reserva sellada, USDC en Arc.
- Útil cuando no hay cotización viva ni dealer. Peor *price discovery* que un RFQ. Se dice.
- Dos builders, testnet, ETHOnline 2026. Nombre de trabajo. Sin GTM, sin licencia, sin run-rate.

### Slide 2 — El mercado, sin teatro

**Título:** Emisión DLT pequeña; secundario limitado; 20 ≠ “solo 20 se transaron”.

- AFME 2025 FY: €4,8 mil millones de renta fija DLT (+48 % vs €3,25 mil millones); €4,71 mil millones bonos; 78 % Asia; Europa €893 millones; corporativos 10,4 %; vs ~€23 billones tradicionales.
- BCE Born et al., abr 2026: 183 bonos tokenizados relevantes para la UE. Regresión de liquidez N=20 tokenizados *con bid-ask* + 75 convencionales.
- Donde hay quotes: bid-ask −0,05 pp / −27 %. En emisión: yield −0,14 pp (N=23). Sin baja de underwriting. Mercado naciente; secundario DLT limitado.
- Treasuries tokenizados (AFME ~USD 9 mil millones 2025 / CoinGecko ~USD 13 mil millones T1 2026) tienen redención. Fuera de la cuña.

### Slide 3 — El flujo, feo y concreto

**Título:** *Hold* → pujas USDC → award CRE → *compliance* en el token.

- Vendedor: *hold* ATS + compromiso de reserva. Los bonos no salen; el cupón sigue.
- Compradores: KYC’d, pujan USDC en Arc. Wallet no *compliant*: la UI bloquea; `executeHoldByPartition` revertiría igual.
- Award: workflow confidencial CRE (`handlerInTee` **simulado**, no TEE de hardware). Solo salen ganador y precio.
- Liquidación coordinada en dos cadenas. No DvP atómico. El operador relaya; el token impone.

### Slide 4 — Confianza (qué puede y qué no el operador)

**Título:** Puede *grief*. No puede robar.

- Operador: *mirror*, *close*, *settle*, *void*. Puede stall / anular.
- No puede: mandar USDC a nadie que no sea el vendedor registrado o el postor que depositó; entregar el bono a una wallet fuera de whitelist + KYC.
- `confirmDelivery` paga al vendedor. Los perdedores retiran. ATS revierte un destinatario no *compliant*, quien sea que llame.
- El `hederaTxHash` en Arc es un puntero, no una prueba. Se dice.

### Slide 5 — Qué pedimos que juzguen

**Título:** Un protocolo de salida, no un mercado.

- Jueces / operador ATS: ¿el *hold* queda locked, la reserva sellada, el award confidencial, el token como *compliance*?
- No pidan TAM, take-rate, ni “captura de fees”. No hay forecast.
- Demo: “ON Serie I 2027” — fixture, no un título CNV. Color: PwC, ON argentinas ~USD 16 mil millones *hard-dollar* / 158 deals 2025. No es SOM.
- Hedera (activo + *compliance*) · Arc (cash USDC) · Chainlink CRE (award). Testnet.

---

## 7. Guión de 3:30 alineado al beat sheet

Sustituye el hook viejo del BCE. Los beats de producto se mantienen. Narración lista para grabar.

**0:00–0:20 — Hook**
*Pantalla: title card + arquitectura 3 s.*

“Asseto —Hashgraph e ioBuilders, junio 2026— ya da order book, RFQ y DvP atómico en Hedera. Remate no es esa venue. Es una subasta de salida a primer precio sobre un *hold* ATS sin cotización: reserva sellada, USDC en Arc, award en un workflow confidencial de Chainlink, *compliance* que impone el token. Peor que un RFQ. Útil cuando no hay quote.”

**0:20–0:50 — Emisión + configuración**
*Pantalla: ATS, “ON Serie I 2027”, control list, KYC, cupón 9 %.*

“El emisor creó el bono en el Studio: tasa fija, USD, vencimiento 2027. Tres wallets con whitelist y KYC. Una, Buyer C, no. Hay un cupón configurado. Esto no es nuestro: es el Studio haciendo su trabajo. El ticker parece una ON argentina; es un fixture de testnet, no un título CNV.”

**0:50–1:15 — El vendedor abre la subasta**
*Pantalla: `/sell`, lote 10, hold + createAuction, commitment on-chain.*

“El vendedor lista diez bonos. No salen de su wallet: el *hold* del Studio los lockea con nuestro contrato como escrow y siguen devengando cupón. La reserva está sellada; on-chain solo está el hash. La subasta se espeja en Arc, donde vive el cash.”

**1:15–1:45 — Pujas + wallet bloqueada**
*Pantalla: Buyer A / Buyer B pujan; Buyer C “Not eligible”; settle a C revierte.*

“Dos inversores *whitelisted* pujan USDC en Arc. Buyer C conecta y no puede pujar: la app lee el KYC del token. Si el operador intentara entregar a C de todos modos, el token revierte. El *compliance* lo impone el activo, no nosotros.”

**1:45–2:20 — Award confidencial**
*Pantalla: `cre workflow simulate --broadcast`; banner TEE; `Awarded(source=CRE)`.*

“Al deadline corre un workflow confidencial de Chainlink CRE. Adentro de `handlerInTee` —simulado, no un TEE de hardware— trae la reserva sellada y un screen de *compliance* con keys secretas, verifica el commitment, y calcula el award. Solo salen ganador y precio, como report que el DON escribe en Arc. Sin este workflow, el escrow no adjudica.”

**2:20–2:50 — Settlement**
*Pantalla: settle → HoldByPartitionExecuted; confirmDelivery; withdraw del perdedor.*

“Entrega: el operador ejecuta el *hold* y el Studio mueve los bonos a Buyer B, con el check de *compliance* en ese instante. Después el escrow paga al vendedor en USDC y el perdedor retira. Dos cadenas, una subasta, cada paso on-chain. Liquidación coordinada, no DvP atómico. El operador puede stall; no puede robar.”

**2:50–3:10 — Lifecycle**
*Pantalla: ATS, Buyer B holder, cupón.*

“De vuelta en el Studio, Buyer B es tenedor y tiene derecho al cupón. El lifecycle del activo sigue intacto.”

**3:10–3:30 — Arquitectura + honestidad**
*Pantalla: PNG; Hedera / Arc / Chainlink; limitación.*

“Hedera tiene el activo y su *compliance*. Arc tiene el cash. Chainlink calcula el award en un handler confidencial simulado. El settlement es coordinado entre las dos cadenas, no atómico, y lo decimos. Esto es un protocolo de salida para un *hold* sin quote —no el mercado secundario de todos los bonos tokenizados.”

---

## 8. Métricas que sí se pueden decir en voz alta

Solo números con definición, N y fecha. Sin forecasts.

| Métrica | Cómo decirla | Nunca decir |
|---|---|---|
| Emisión DLT de renta fija, AFME 2025 FY | “AFME, 2025: €4,8 mil millones de emisión DLT de renta fija, +48 % vs €3,25 mil millones; €4,71 mil millones en bonos.” | “Issuance is solved.” Cualquier run-rate de Remate. |
| Geografía y mix, AFME 2025 FY | “78 % Asia; Europa €893 millones; corporativos 10,4 %.” | Que Europa o el corporativo sean el SAM de Remate. |
| Tradicional vs DLT, AFME | “Contra ~€23 billones de emisión anual tradicional de renta fija: el experimento DLT es chico.” | Que Remate “abra” esos €23 billones. |
| Universo BCE, Born et al. abr 2026 | “Dataset a mano de 183 bonos tokenizados relevantes para la UE. El mercado sigue naciente; el secundario DLT, limitado.” | “183 bonos y solo 20 se transaron.” “89 % sin salida usable.” |
| Muestra de liquidez BCE | “La regresión de liquidez usa N=20 tokenizados *con bid-ask* y 75 convencionales.” | Que 20 sea el censo de todo lo que alguna vez negoció. |
| Bid-ask BCE | “Donde hay quotes: bid-ask −0,05 pp, −27 % vs el control.” | “Los tokenizados no tienen mercado.” |
| Yield en emisión, BCE | “Spread de yield −0,14 pp en emisión, N=23. No encuentran baja de underwriting.” | Que la tokenización ya abarató la emisión. |
| Asseto, 3 jun 2026 | “Asseto: order book, RFQ, bilateral, DvP atómico; Hedera o HashSphere.” | “ATS no tiene secundario.” |
| RWA ex-stables | “RWA.xyz ~USD 39 mil millones distribuidos ex-stables, sep 2026. CoinGecko USD 19,3 mil millones, T1 2026. Cifras distintas; sirven para *sacar* Treasuries y fondos de la cuña.” | Sumarlas al SAM. Mezclarlas con USD 120 billones de bonos o USD 300 mil millones de stables. |
| Treasuries tokenizados | “AFME ~USD 9 mil millones en 2025; CoinGecko ~USD 13 mil millones T1 2026. BUIDL y USYC tienen redención. No es el problema de Remate.” | Que Remate “abra” Treasuries. |
| McKinsey 2030 | “Telón de industria: ~USD 2 billones base / USD 1–4 billones de activos tokenizados ex-stables a 2030.” | TAM de Remate. “USD 1 billón en bonos tokenizados.” |
| PwC Argentina ON 2025 | “Color para el ticker de demo: ~USD 16 mil millones *hard-dollar*, 158 deals; corporativo >USD 20 mil millones. Fixture, no CNV, no SOM.” | SOM. “Los tenedores necesitan USDC en Arc.” |
| Take-rate / fees | No hay cifra. No se dice. | “5–20 bps.” “10 % × 1× × 10 bps → €480k.” “Billones en fees.” |
| Stables | No son addressable market de Remate. | “USD 300 mil millones de stables.” |
| BCG | No se usa. | USD 88 billones como ancla. |

---

## 9. Respuestas de 15 segundos a la kill-list de diligence

**1. “¿El 89 % de 183 bonos no tiene salida? ¿Solo 20 se transaron?”**
No. Born et al. (abr 2026) armaron 183 bonos tokenizados relevantes para la UE. Los 20 son la muestra de la *regresión de liquidez con bid-ask* (más 75 convencionales), no el censo de “los que alguna vez se transaron”. Donde hay quotes, el bid-ask es −0,05 pp. El paper dice mercado naciente y secundario DLT limitado. No dice 89 % ilíquido.

**2. “¿La emisión ya está resuelta?”**
No. AFME 2025: €4,8 mil millones de renta fija DLT vs ~€23 billones tradicionales. El BCE no encuentra baja de underwriting. ATS emite y corre lifecycle. Eso no es “issuance solved”. Es que el Studio ya existe y nosotros no lo reescribimos.

**3. “¿McKinsey USD 1 billón en bonos tokenizados a 2030? ¿BCG USD 88 billones?”**
McKinsey es ~USD 2 billones base / USD 1–4 billones de *activos tokenizados ex-stables* a 2030. No es bonos. No es TAM de Remate. Es telón. BCG USD 88 billones no se usa.

**4. “¿El SAM es USD 120T de bonos + 39bn RWA + 9bn Treasuries + 300bn stables?”**
No. Eso es mezclar universos. RWA.xyz ~USD 39 mil millones (sep 2026) y CoinGecko USD 19,3 mil millones (T1 2026) se usan para *excluir* Treasuries y fondos. Treasuries tienen redención. Stables no son el mercado. Remate no tiene SAM publicado.

**5. “¿10 % × 1× × 10 bps = €480k? ¿5–20 bps de take-rate?”**
No hay fee math. No hay take-rate. No hay run-rate. Dos builders, testnet, hackathon. Si alguien pide el P&L, la respuesta es: no existe.

**6. “¿ATS no tiene secundario?”**
Sí tiene, o al menos una venue: Asseto, 3 de junio de 2026 — libro, RFQ, bilateral, DvP atómico, Hedera o HashSphere. Remate no reemplaza eso. Es un protocolo distinto para un *hold* sin quote.

**7. “¿El award corre en un TEE de hardware?”**
No. `handlerInTee` en un workflow CRE simulado con el CLI. Confidential Workflows están en beta privada. El simulador no es un enclave de hardware. En producción el path documentado es Nitro + attestación del DON. Hoy: simulación, y se dice en el video.

**8. “¿El SOM son las ON argentinas de USD 16 mil millones? ¿Los tenedores necesitan USDC en Arc?”**
No. PwC 2025 (~USD 16 mil millones *hard-dollar*, 158 deals; corporativo >USD 20 mil millones) es color para por qué el fixture se llama “ON Serie I 2027”. No es un título CNV. No es SOM. Nadie “necesita” Arc; Arc es donde pusimos el cash leg porque CRE escribe ahí y no hay interop Circle–Hedera.

**9. “¿Quien resuelva el secundario *compliant* captura billones en fees? ¿Los stables son el mercado?”**
No. Esa frase es teatro. Remate no captura el secundario. No hay billones en fees. USD 300 mil millones de stables no son addressable. El comprador es un operador ATS que quiere una salida para *holds* sin cotización.

**10. “¿Es DvP atómico? ¿El operador puede llevarse la plata?”**
Liquidación coordinada, no atómica. El operador puede stall o void. No puede: pagar a alguien que no sea el vendedor; devolver a alguien que no depositó; entregar el bono a una wallet no *compliant* — `executeHoldByPartition` revierte. El `hederaTxHash` en Arc es puntero, no prueba.

---

## 10. Cierre

Remate es chico a propósito. No pedimos que crean en un mercado de billones. Pedimos que miren un protocolo: un *hold* ATS sin quote, una reserva que no se filtra a los postores, un award que no lo decide el operador, un token que se niega a entregar a quien no debe, y un cash leg en USDC que no se mueve hasta que el bono cambió de dueño.

Asseto es la venue. Remate es la salida cuando la venue no tiene precio. Peor microstructure. Mejor honestidad. Testnet. Dos personas. Si un operador ATS quiere ese riel —no un libro vacío—, esto es el prototipo.

---

*No GTM. No licencias. No run-rate. No forecasts. Si un juez pide un número que no está en la §8, la respuesta es “no lo tenemos”.*
