# Opportunity Scoring & Statistical Methodology

This document provides the mathematical formulations and analytical methods implemented in the **Opportunity Lab** and **Statistical Outliers Engine**.

---

## 1. Opportunity Engine: Workflow A ("I know the business")

Workflow A ranks all Ontario municipalities for a selected business category (e.g. Pizza Store, NAICS 722513).

### Scoring Model
The composite **Opportunity Score** \(S \in [0, 100]\) is calculated as a weighted linear combination of normalized component scores:

\[
S = w_{\text{demand}} \cdot S_{\text{demand}} + w_{\text{comp}} \cdot S_{\text{comp}} + w_{\text{income}} \cdot S_{\text{income}} + w_{\text{growth}} \cdot S_{\text{growth}} + w_{\text{cost}} \cdot S_{\text{cost}} + w_{\text{labor}} \cdot S_{\text{labor}}
\]

Where default weights are:
* \(w_{\text{demand}} = 0.20\) (Log-scaled population size)
* \(w_{\text{comp}} = 0.25\) (Competition undersaturation bonus)
* \(w_{\text{income}} = 0.20\) (Median household income purchasing power)
* \(w_{\text{growth}} = 0.15\) (5-year historical population growth rate)
* \(w_{\text{cost}} = 0.10\) (Commercial rent overhead penalty)
* \(w_{\text{labor}} = 0.10\) (Labor force participation rate)

### Competition Component Formulation
Given the competitor density per 10,000 residents \(D_c = \frac{C}{\text{Pop}} \times 10,000\) and the provincial benchmark density \(D_{\text{bench}} = 3.0\):
\[
R_{\text{comp}} = \frac{D_c}{D_{\text{bench}}}
\]
\[
S_{\text{comp}} = \max\left(10, \min\left(100, \text{round}\left((2 - R_{\text{comp}}) \times 50\right)\right)\right)
\]
* If \(D_c < D_{\text{bench}}\) (underserved market), \(S_{\text{comp}} > 50\).
* If \(D_c > 2 \cdot D_{\text{bench}}\) (oversaturated), \(S_{\text{comp}} \to 10\).

---

## 2. Opportunity Engine: Workflow B ("I know the city")

Workflow B ranks business categories within a chosen municipality (e.g. Burlington) by identifying local supply-demand imbalances.

### Market Gap Index
\[
\text{Gap Index} = \frac{D_{\text{peer}} - D_{\text{local}}}{D_{\text{peer}}} \times 100
\]
* A positive Gap Index indicates that the municipality has fewer establishments per capita than its economic peer group (underserved commercial category).
* A negative Gap Index indicates higher saturation than peers.

---

## 3. Statistical Outlier Detection Methods

The system uses a dual-evaluation approach to flag statistical anomalies:

### Non-Parametric Tukey IQR Fences
1. Calculate the 25th percentile (\(Q_1\)), 75th percentile (\(Q_3\)), and Interquartile Range (\(\text{IQR} = Q_3 - Q_1\)).
2. Lower Boundary: \(\text{Bound}_{\text{lower}} = Q_1 - 1.5 \times \text{IQR}\)
3. Upper Boundary: \(\text{Bound}_{\text{upper}} = Q_3 + 1.5 \times \text{IQR}\)
4. An observation \(x\) is flagged if \(x < \text{Bound}_{\text{lower}}\) or \(x > \text{Bound}_{\text{upper}}\).

### Parametric Gaussian Z-Score
Given sample mean \(\mu\) and sample standard deviation \(\sigma = \sqrt{\frac{1}{n-1}\sum (x_i - \mu)^2}\):
\[
z = \frac{x - \mu}{\sigma}
\]
An observation is flagged if \(|z| \ge 2.0\) (representing the extreme upper or lower 5% tails of a normal distribution).
