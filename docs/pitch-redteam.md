# Remate — red-team del pitch de mercado

Informe del agente crítico. El pitch que sobrevive está en `docs/pitch-es.md`.
Este archivo es la lista de lo que **no** se dice, y por qué.

Fuentes: ECB *Macroprudential Bulletin* (Born et al., abr 2026); AFME *DLT-Based Capital Market Report 2025 FY*; McKinsey *From ripples to waves* (jun 2024); BCG/Ripple 2025; Hashgraph/Asseto 3 jun 2026; RWA.xyz; CoinGecko *RWA Report 2026*; threat model del repo (`docs/specs/09-threat-model.md`).

---

## Roast (por qué el pitch anterior no entra a una sala)

El pitch anterior mezclaba stock global de bonos, TVL de RWA, emisión DLT y Treasuries ya líquidos, y después cobraba 10 bps sobre un 10 % inventado. El gancho 183/20 **invierte** el paper del BCE: el 20 no es “solo 20 operaron nunca”; es la muestra de regresión de liquidez de bonos que **sí tenían bid-ask**. “McKinsey $1T en bonos tokenizados a 2030” **no existe** en McKinsey: $1T es el escenario pesimista del **mercado tokenizado total**. “Issuance is solved” es falso: AFME €4,8 bn vs €23 tn tradicionales. Asseto (junio 2026) ya vende libro, RFQ y DvP atómico en Hedera. La fee math (€480k) no paga un *compliance officer*. La subasta sellada de primer precio no es microestructura institucional. El settlement coordinado, dos personas, testnet y CRE en simulador no es “el missing exit piece”: es un demo honesto disfrazado de tesis de trillones.

---

## Claim por claim

| Claim | Problema | Severidad | Qué sí se puede decir |
|---|---|---|---|
| “183 emitidos; solo ~20 con secondary; ~89 % sin exit.” | El 183 es un dataset **armado a mano**, “global relevant to the EU”, sesgo Alemania / trials ECB–SNB. El **20** es la muestra *matched* de liquidez (20 tokenizados + 75 convencionales) de bonos **con bid-ask**. 183−20 ≠ “163 nunca se operaron”. Cero Hedera ATS. | **Fatal** | “BCE abr 2026: 183 bonos tokenizados relevantes para la UE. La regresión de liquidez usa N=20 *con bid-ask*. Mercado naciente; secundario DLT limitado.” |
| “Issuance is solved. Exit is not.” | €4,8 bn DLT FI vs ~€23 tn tradicionales (~0,02 %). El BCE llama al mercado *nascent*. Asseto, Euroclear D-FMI, SDX, ADDX existen. | **Fatal** | “La emisión DLT es real y minúscula. Donde el token no tiene puente a CSD/exchange ni quote, el exit on-chain sigue incompleto.” |
| TAM bonos ~$120–127 T | Stock tradicional. Remate no toca 1 bp. Un juez institucional descuenta al equipo. | **Noisy** | “Ceiling del activo subyacente, no TAM de Remate. No se usa como ancla.” |
| “McKinsey $1 T tokenized bonds 2030” | McKinsey estima ~$2 T base / $1–4 T de **activos tokenizados totales** ex-stables. $1 T es el piso del **total**, no de bonos. | **Fatal** | “McKinsey: ~$2 T base de activos tokenizados ex-stables a 2030. Telón de industria, no TAM.” |
| BCG $88 T a 2035 | Escenario progresivo (“hasta 16 % de invertibles”). Hoy BCG pone Digital RWAs ~$30 bn. | **Fatal** si se ancla | No se usa. |
| AFME €4,8 bn como SAM de Remate | Es **flujo de emisión primaria 2025**, no stock, no turnover. 78 % Asia. Corporates 10,4 %. Hedera ATS no aparece. | **Fatal** como SAM | “AFME 2025: €4,8 bn de emisión primaria DLT FI. Es el *flow* global, no nuestro SAM.” |
| RWA $39 bn + CoinGecko $19,3 bn en el mismo slide | Fechas y canastas distintas. Mayoría Treasuries/commodities, no bonos ATS. | **Noisy** | Separar. Usarlas para *excluir* Treasuries/fondos, no para sumar. |
| Treasuries $9 bn como SAM | BUIDL / USYC ya tienen redención. El exit de un money-market tokenizado no es first-price sealed. | **Fatal** como SAM | “Tienen redención. No es el problema de Remate.” |
| Stables ~$300 bn en SAM | Riel de cash. McKinsey los excluye a propósito. | **Noisy** | “Riel USDC en Arc, no addressable.” |
| Bid-ask −0,05 pp / −27 % | Correcto **solo** en N=20 con quotes. Es evidencia **en contra** del hook de iliquidez masiva. | **Fixable** | “Donde ya hay quotes, el tokenizado cotiza más apretado. Muestra chica, UE.” |
| −14 bps yield at issuance | 0,14 pp de *spread*, N=23, 5 %, no causal, no ATS. | **Fixable** | “Indicativo, N=23, no causal, no ATS.” |
| “ATS no tiene secundario” | Asseto, 3 jun 2026: libro, RFQ, bilateral, DvP atómico, Hedera o HashSphere. Un juez de Hedera lo sabe. | **Fatal** | “ATS emite. Asseto ya es venue. Remate es otra microestructura (hold + reserva sellada).” |
| ON AR $16 bn como SOM | Esas ON ya liquidan en BYMA/MAE. El demo es *estilo* ON, no un título CNV. | **Fatal** como SOM | Color para el ticker. No SOM. |
| First-price sealed > RFQ | Winner’s curse, sin price discovery intra-subasta. Un banco no cambia MarketAxess/Asseto por esto. | **Fatal** si se vende como superior | “Peor *price discovery*. Útil cuando no hay quote.” |
| Fee math 10 % × 1× × 10 bps → €480 k | Tres supuestos inventados. 10 bps es 7–8× el FPM de crédito electrónico (MKTX/TW ~1,3–1,4 bps). | **Fatal** | No hay fee math. No se dice. |
| “5–20 bps typical” | En FI electrónico el rango real es ~0,05–2 bps. Sin fuente. | **Fatal** | No se usa. |
| “Award in TEE” | Repo: `cre workflow simulate`, no enclave hardware. | **Fatal** | “Workflow confidencial **simulado**. No TEE de hardware.” |
| “Missing exit / trillions of fees” | El exit no está empty (Asseto, Euroclear, SDX, ADDX, redenciones). Stock ≠ fee pool. | **Fatal** | “Prototipo de exit auction para un hold ATS sin quote.” |

---

## Kill-list (30 segundos)

Si la respuesta es el slide viejo, la conversación termina:

1. El 20 del BCE: ¿los que no tienen mercado o los que **sí** tienen bid-ask?
2. ¿Cuántos bonos ATS Hedera hay outstanding, y cuántos no pueden salir por Asseto?
3. ¿Por qué first-price sealed en vez del RFQ/DvP atómico de Asseto, en el mismo rail?
4. ¿Licencia? ¿MTF / ALyC? ¿CSD? ¿Quién es *settlement agent* si el operador no firma `confirmDelivery`?
5. ¿El award corre en Nitro/TEE o en `cre workflow simulate`?
6. ¿Quién paga el bps, y por qué 10 bps cuando MKTX cobra ~1,4?
7. ¿La ON del demo está en Caja de Valores / CNV o es un token de testnet con nombre argentino?
8. Mainnet: ¿Hedera + Arc + CRE firmado, o se acaba en el deadline?
9. Si el operador griefea, ¿qué ve el compliance del comprador además de un refund?
10. ¿CNV permite que una ON argentina liquide el cash leg en USDC Arc frente a un venue no registrado?

Cualquiera de 2, 3, 4 o 7, mal contestada, cierra.

---

## Qué sobrevive diligence

1. AFME 2025 FY: €4,8 bn DLT FI (+48 %); €4,71 bn bonos; 78 % Asia; Europa €893 mn; corporates 10,4 %; vs ~€23 tn tradicionales.
2. BCE Born et al. abr 2026: dataset 183; liquidez N=20; −0,05 pp / −27 % bid-ask; −0,14 pp yield spread N=23; sin baja de underwriting.
3. Asseto, 3 jun 2026: libro, RFQ, bilateral, DvP atómico, Hedera o HashSphere — como **competidor**, no footnote.
4. RWA.xyz ~$39 bn *distributed* ex-stables (sep 2026) y CoinGecko $19,3 bn (Q1 2026) — separados, para excluir.
5. Treasuries tokenizados: AFME $9,0 bn (2025); CoinGecko ~$13 bn (Q1 2026); BUIDL/USYC con redención.
6. PwC: ON USD ~USD 16 bn / 158 deals 2025 — *color* de demo, no SOM.
7. McKinsey ~$2 T base / $1–4 T total tokenizado ex-stables a 2030 — industria, nunca TAM de Remate.
8. Hecho de producto: settlement coordinado, no atómico; CRE simulado, no TEE hardware.

---

## Qué se corta del demo 3:30

- Todo el stack TAM / SAM / SOM.
- Fee math.
- “89 %”, “issuance is solved”, “McKinsey $1 T bonds”, “$88 T”, stables $300 bn, Treasuries como SAM.
- Historia ON como wedge de captura.
- “Missing exit piece / trillions of fees.”
- “Award in TEE” sin decir *simulated*.

Narración de reemplazo, slides y respuestas de 15 s: `docs/pitch-es.md`.
