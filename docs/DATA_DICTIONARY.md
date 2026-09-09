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
