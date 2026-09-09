# Standardized Economic Data Dictionary

This document details the metrics, definitions, mathematical formulations, units, geographic scopes, and known data limitations for the Ontario Economic & Business Intelligence Platform.

---

## 1. Demographics & Housing (Source: Statistics Canada Profile 98-401-X2021001)

### `population_2021`
* **Name**: Total Population (2021)
* **Unit**: Persons
* **Formula**: Direct Census count (usual residents)
* **Scope**: CSD, CD, CMA, PROVINCE
* **Limitations**: Subject to random rounding (to 0 or 5) by Statistics Canada to preserve confidentiality.

### `population_growth_pct`
* **Name**: 5-Year Population Growth Rate
* **Unit**: %
* **Formula**: `((population_2021 - population_2016) / population_2016) * 100`
* **Scope**: CSD, CD, CMA, PROVINCE
* **Limitations**: Boundary adjustments between census years can impact exact percentage comparisons.

### `ontario_pop_share_pct`
* **Name**: Share of Ontario Population
* **Unit**: %
* **Formula**: `(CSD_population / Ontario_population) * 100`
* **Scope**: CSD
* **Significance**: Quantifies the municipality's scale relative to the provincial market (e.g. Burlington = 1.314%).

---

## 2. Household Income & Shelter Costs (Source: Statistics Canada Table 98-401-X2021001)

### `income_median_hh`
* **Name**: Median Household Total Income
* **Unit**: CAD ($)
* **Definition**: The dollar amount that divides the household income distribution into two equal halves.
* **Scope**: CSD, CD, CMA, PROVINCE
* **Significance**: The most resilient measure of local purchasing power, unskewed by extreme outliers.

### `income_average_hh`
* **Name**: Average Household Total Income
* **Unit**: CAD ($)
* **Definition**: The arithmetic mean of all household incomes in the municipality.
* **Scope**: CSD, CD, CMA, PROVINCE
* **Significance**: When compared with median income, reveals income skewness and wealth concentration at top brackets.

### `shelter_cost_median_rent`
* **Name**: Median Tenant Monthly Shelter Cost
* **Unit**: CAD / Month ($)
* **Definition**: Total monthly rent paid including electricity, heating, water, and municipal services.
* **Scope**: CSD, CD, CMA, PROVINCE

---

## 3. Canadian Business Counts (Source: Statistics Canada Table 33-10-1097-01)

### `businesses_total_counts`
* **Name**: Total Commercial Establishments (With Employees)
* **Unit**: Count
* **Reference Period**: December 2025 (Released March 4, 2026)
* **Scope**: CSD, CMA, PROVINCE
* **Definition**: All active commercial businesses maintaining a corporate payroll deduction account with the Canada Revenue Agency.

### `businesses_per_1000_pop`
* **Name**: Business Establishment Density
* **Unit**: Businesses / 1,000 Population
* **Formula**: `(businesses_total_counts / population_2021) * 1000`
* **Scope**: CSD
* **Benchmark**: Ontario provincial average is 33.4 businesses per 1,000 residents.

---

## 4. Municipal Financial Profiles (Source: Ontario FIR Schedule 40)

### `municipal_operating_budget`
* **Name**: Annual Municipal Operating Expenditures
* **Unit**: CAD ($)
* **Scope**: CSD
* **Definition**: Total operating expenses incurred by the local municipal corporation for municipal services.

### `municipal_taxation_revenue`
* **Name**: Municipal Property Taxation Revenue
* **Unit**: CAD ($)
* **Scope**: CSD
* **Definition**: Total property tax levy collected by the municipality from residential, commercial, and industrial assessment classes.

---

## 5. Generational Age Cohorts (Source: StatCan Table 98-401-X2021001)

### `age_cohort_0_14` to `age_cohort_85_plus`
* **Name**: Statutory Census Age Cohorts (9 Tiers)
* **Tiers**: 0–14, 15–24, 25–34, 35–44, 45–54, 55–64, 65–74, 75–84, 85+
* **Unit**: Persons & Percentage of Total Population
* **Aggregates**:
  * `youth_aggregate`: Ages 0 to 14 (Indicator of child-care and primary education demand)
  * `working_age_aggregate`: Ages 15 to 64 (Prime labor force & consumer purchasing engine)
  * `senior_aggregate`: Ages 65+ (Healthcare, retirement living, and accessibility services demand)
* **Benchmark**: Evaluated against Ontario provincial distribution (`PR_35`).

---

## 6. Workforce & Occupational Specialization

### `occupational_location_quotient` (LQ)
* **Name**: Occupational Location Quotient
* **Formula**: `(Local_Occupation_Employment / Local_Total_Employment) / (Ontario_Occupation_Employment / Ontario_Total_Employment)`
* **Interpretation**:
  * `LQ > 1.25`: High local talent specialization / commercial cluster advantage.
  * `0.85 <= LQ <= 1.25`: Balanced local representation aligned with provincial norm.
  * `LQ < 0.85`: Talent deficit; may require recruitment from outside the municipality.
* **Scope**: CSD (compared against `PR_35`).

---

## 7. Retail Fuel & Fleet Operating Costs (Source: StatCan Table 18-10-0001-01)

### `retail_gas_price_cents_litre`
* **Name**: Regular Unleaded Fuel Retail Average
* **Unit**: Cents / Litre (¢/L)
* **Scope**: Regional CMA & Regional Markets
* **Significance**: Core operating cost for logistics, last-mile delivery, and mobile trade contractors.

---

## 8. Commercial Opportunity & Feasibility Metrics

### `opportunity_gap_index`
* **Name**: Commercial Opportunity Gap Index
* **Formula**: `Provincial_Benchmark_Establishments_Per_10k / Local_Establishments_Per_10k`
* **Interpretation**:
  * `Gap Index >= 1.5`: High Expansion Opportunity (Severely underserved local market).
  * `1.0 <= Gap Index < 1.5`: Balanced Market (Healthy commercial absorption).
  * `Gap Index < 1.0`: Saturated / Competitive Market.
* **Scope**: CSD by NAICS Business Category.

### `feasibility_composite_score`
* **Name**: 6-Factor Multi-Criteria Opportunity Score (0 to 100)
* **Formula**: Weighted sum of:
  * Demand & Population Scale ($W = 25\%$)
  * Competition Penalty & Gap Index ($W = 25\%$)
  * Household Purchasing Power ($W = 20\%$)
  * 5-Year Population Growth ($W = 10\%$)
  * Commercial Rent Affordability ($W = 10\%$)
  * Workforce & Talent Availability ($W = 10\%$)
* **Scope**: CSD relative to provincial distributions.

---

## 9. Empirical Data Coverage Scoring

### `overall_coverage_pct`
* **Name**: Empirical Attribute Completeness Percentage
* **Formula**: Unweighted proportion of 8 core dimensions with authentic observed records in the relational store.
* **Confidence Rating**:
  * `HIGH`: Coverage $\ge 75\%$
  * `MEDIUM`: $40\% \le \text{Coverage} < 75\%$
  * `LOW`: Coverage $< 40\%$
* **Guardrail**: Modeled, estimated, or unobserved metrics are strictly excluded from the observation count.
